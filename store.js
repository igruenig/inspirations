const path = require('path')
const sqlite = require('better-sqlite3');
const fileStore = require('./fileStore');

class Store {

  constructor(location) {
    this.location = location;
    const db = sqlite(path.join(location, 'meta.db'));

    db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY,
        fileName TEXT,
        width INTEGER,
        height INTEGER,
        originalPath TEXT,
        thumbnailPath TEXT,
        url TEXT,
        comment TEXT,
        deleted INTEGER default 0,
        createdAt DATETIME DEFAULT current_timestamp
      );
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS taggings (
        imageId INTEGER,
        tagId INTEGER,
        FOREIGN KEY(imageId) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name ON tags (name);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_taggings ON taggings (imageId, tagId);
    `);

    this.selectImagesStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags 
      FROM images i 
      LEFT JOIN taggings it ON i.id = it.imageId 
      LEFT JOIN tags t ON it.tagId = t.id 
      WHERE i.deleted = :deleted
      GROUP BY i.id 
      ORDER BY i.id DESC, t.name ASC
      LIMIT :limit
    `);

    this.selectImagesBeforeStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags 
      FROM images i 
      LEFT JOIN taggings it ON i.id = it.imageId 
      LEFT JOIN tags t ON it.tagId = t.id 
      WHERE i.deleted = :deleted AND i.id < :before
      GROUP BY i.id 
      ORDER BY i.id DESC, t.name ASC
      LIMIT :limit
    `);

    this.selectImageStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags 
      FROM images i 
      LEFT JOIN taggings it ON i.id = it.imageId 
      LEFT JOIN tags t ON it.tagId = t.id 
      WHERE i.id = ? 
      GROUP BY i.id 
    `);

    this.insertImageStatement = db.prepare(`
      INSERT INTO images(fileName, width, height, originalPath, thumbnailPath, url, comment)
      VALUES (:fileName, :width, :height, :originalPath, :thumbnailPath, :url, :comment)
    `);

    this.updateImageStatement = db.prepare(`
      UPDATE images 
      SET url = :url, comment = :comment, deleted = :deleted
      WHERE id = :id 
    `)

    this.deleteImageStatement = db.prepare(`
        DELETE FROM images
        WHERE id = ?
    `)

    this.insertTagStatement = db.prepare(`
      INSERT INTO tags(name)
      VALUES (:name)
    `)

    this.selectTagStatement = db.prepare(`
      SELECT * FROM tags 
      WHERE name = ?
    `);

    this.updateTagStatement = db.prepare(`
      UPDATE tags 
      SET name = :name 
      WHERE id = :id
    `)

    this.selectImageTagsStatement = db.prepare(`
      SELECT * FROM taggings
      WHERE imageID = ?
    `)

    this.insertImageTagStatement = db.prepare(`
      INSERT INTO taggings 
      VALUES (:imageId, :tagId)
    `)

    this.deleteImageTagStatement = db.prepare(`
      DELETE FROM taggings 
      WHERE imageId = :imageId AND tagId = :tagId
    `)

    this.setTags = db.transaction((imageId, newTagIds) => {
      const existingTagIds = this.selectImageTagsStatement.all(imageId).map(imageTag => imageTag.tagId)
      const toDelete = existingTagIds.filter(tagId => !newTagIds.includes(tagId))
      const toInsert = newTagIds.filter(tagId => !existingTagIds.includes(tagId))
      
      toDelete.forEach(tagId => {
        this.deleteImageTagStatement.run({ imageId: imageId, tagId })
      })

      toInsert.forEach(tagId => {
        this.insertImageTagStatement.run({ imageId: imageId, tagId })
      })
    })
  }

  fetchImages(options) {
    if (options.before) {
      return this.selectImagesBeforeStatement.all(options)
    }
    return this.selectImagesStatement.all(options);
  }

  async createImage(filePath) {
    const image = await fileStore.addImage(filePath, this.location);
    const info = this.insertImageStatement.run(image);
    image.id = info.lastInsertRowid;
    return image;
  }

  getImage(id) {
    return this.selectImageStatement.get(id);
  }

  updateImage(image) {
    // update url, comment and deleted
    if (!image.deleted) {
      image.deleted = 0;
    }
    this.updateImageStatement.run(image);

    var newTagIds = [];
    var newTagNames = [];

    if (image.tags) {
      newTagNames = image.tags.split(',');
    }
    
    newTagNames.forEach(tagName => {
      const tag = this.selectTagStatement.get(tagName.trim());
      if (tag) {
        newTagIds.push(tag.id)
      } else {
        const newTag = { name: tagName.trim() };
        const info = this.insertTagStatement.run(newTag);
        newTagIds.push(info.lastInsertRowid);
      }
    })

    this.setTags(image.id, newTagIds);
  }

  deleteImage(id) {
    this.deleteImageStatement.run(id);
  }

}

module.exports = Store;