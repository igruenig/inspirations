const sqlite = require('better-sqlite3');
const models = require('./models');

class Store {

  constructor(location) {
    const dbPath = require('path').join(location, 'meta.db');
    const db = sqlite(dbPath);

    db.exec(`
      create table if not exists images (
        id text primary key not null,
        fileName text,
        width integer,
        height integer,
        originalPath text,
        thumbnailPath text,
        url text,
        comment text,
        deleted integer default 0,
        createdAt datetime default current_timestamp
      );
      create table if not exists tags (
        id text primary key not null,
        name text
      );
      create table if not exists taggings (
        imageId text,
        tagId text,
        FOREIGN KEY(imageId) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE
      );
      create unique index if not exists idx_tags_name on tags (name);
      create unique index if not exists idx_taggings on taggings (imageId, tagId);
    `);

    this.selectImagesStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags 
      FROM images i 
      LEFT JOIN taggings it ON i.id = it.imageId 
      LEFT JOIN tags t ON it.tagId = t.id 
      WHERE i.deleted = :deleted
      GROUP BY i.id 
      ORDER BY i.createdAt DESC, t.name
      LIMIT :limit OFFSET :offset
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
      INSERT INTO images(id, fileName, width, height, originalPath, thumbnailPath, url, comment)
      VALUES (:id, :fileName, :width, :height, :originalPath, :thumbnailPath, :url, :comment)
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
      INSERT INTO tags 
      VALUES (:id, :name)
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
    return this.selectImagesStatement.all(options);
  }

  createImage(image) {
    this.insertImageStatement.run(image);
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
        const newTag = models.newTag(tagName.trim());
        this.insertTagStatement.run(newTag);
        newTagIds.push(newTag.id);
      }
    })

    this.setTags(image.id, newTagIds);
  }

  deleteImage(id) {
    this.deleteImageStatement.run(id);
  }

}

module.exports = (location) => {
  return new Store(location);
}