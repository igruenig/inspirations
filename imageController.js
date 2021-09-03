class ImageController {

  constructor(db) {
    this.db = db;
  }

  all(options) {
    const allImagesStatement = this.db.prepare(`
      SELECT i.*, group_concat(t.name) tags
      FROM image i
      LEFT JOIN imageTag it ON i.id = it.imageId
      LEFT JOIN tag t ON it.tagId = t.id
      GROUP BY i.id
    `)
    
    const images = allImagesStatement.all();

    // store tags in array
    images.forEach(image => {
      if (!image.tags) {
        return
      }
      image.tags = image.tags.split(',')
    })

    return images;
  }

  create(image) {
    const insertStatement = this.db.prepare(`
      INSERT INTO image 
      VALUES (:id, :fileName, :width, :height, :originalPath, :thumbnailPath, :url, :comment)
    `);
    insertStatement.run(image);
  }

}

module.exports = (db) => { return new ImageController(db); };