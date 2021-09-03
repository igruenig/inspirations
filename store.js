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
      ORDER BY i.createdAt DESC
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

    this.selectTagsStatement = db.prepare(`
      SELECT * FROM tags 
      WHERE name IN (?)
    `);

    this.selectTagStatement = db.prepare(`
      SELECT * FROM tags 
      WHERE name = ?
    `);

    this.updateTagStatement = db.prepare(`
      UPDATE tags 
      SET name = :name 
      WHERE id = :id
    `)

    this.insertTaggingStatement = db.prepare(`
      INSERT INTO taggings 
      VALUES (:imageId, :tagId)
    `)

    this.deleteTaggingStatement = db.prepare(`
      DELETE FROM taggings 
      WHERE imageId = :imageId AND tagId = :tagId
    `)
  }

  fetchImages(options) {
    const images = this.selectImagesStatement.all();

    // store tags in array
    images.forEach(image => {
      if (!image.tags) {
        image.tags = [];
        return
      }
      image.tags = image.tags.split(',')
    })

    return images;
  }

  createImage(image) {
    this.insertImageStatement.run(image);
  }

  getImage(id) {
    return this.selectImageStatement.get(id);
  }

  updateImage(image) {
    const tags = this.selectTagsStatement.all(image.tags);

    image.tags.forEach(tagName => {
      if (!tags.find(tag => tag.name == tagName)) {
        this.insertTagStatement.run()
      }
    })
    

    // insert all tags that do not exist yet
    // start transaction
    // delete all tags not in updated image
    // add all missing tags
  }

}

module.exports = (location) => {
  return new Store(location);
}