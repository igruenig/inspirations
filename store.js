const db = require('./db');
const models = require('./models');

class Store {

  constructor(location) {
    const dbPath = require('path').join(location, 'meta.db');
    const db = require('./db')(dbPath);

    this.selectImagesStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags 
      FROM images i 
      LEFT JOIN taggings it ON i.id = it.imageId 
      LEFT JOIN tags t ON it.tagId = t.id 
      GROUP BY i.id 
      ORDER BY i.createdAt DESC, t.name
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
      SET url = :url, comment = :comment 
      WHERE id = :id 
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
    return this.selectImagesStatement.all();
  }

  createImage(image) {
    this.insertImageStatement.run(image);
  }

  getImage(id) {
    return this.selectImageStatement.get(id);
  }

  updateImage(image) {
    var newTagIds = [];
    const newTagNames = image.tags.split(',');
    
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
    return image;
  }

}

module.exports = (location) => {
  return new Store(location);
}