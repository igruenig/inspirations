const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuid } = require('uuid');

class ImageController {

  constructor(db) {
    this.db = db;

    this.allStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags
      FROM image i
      LEFT JOIN imageTag it ON i.id = it.imageId
      LEFT JOIN tag t ON it.tagId = t.id
      GROUP BY i.id
    `);

    this.createStatement = db.prepare(`
      INSERT INTO image 
      VALUES (:id, :fileName, :width, :height, :originalPath, :thumbnailPath, :url, :comment)
    `);

    this.getStatement = db.prepare(`
      SELECT i.*, group_concat(t.name) tags
      FROM image i
      LEFT JOIN imageTag it ON i.id = it.imageId
      LEFT JOIN tag t ON it.tagId = t.id
      WHERE i.id = ?
      GROUP BY i.id
    `);
  }

  all(options) {    
    const images = this.allStatement.all();

    // store tags in array
    images.forEach(image => {
      if (!image.tags) {
        return
      }
      image.tags = image.tags.split(',')
    })

    return images;
  }

  async create(basePath, filePath) {
    const extension = path.extname(filePath);
    const date = new Date();
    const imageID = uuid();

    const imagesPath = 'images';
    const fileName = imageID + extension;
    const folderName = date.getFullYear() + '-' + date.getMonth();
    const originalPath = path.join(imagesPath, folderName, 'originals');
    const thumbnailPath = path.join(imagesPath, folderName, 'thumbnails');

    const image = { 
      id: imageID,
      fileName,
      width: null,
      height: null,
      originalPath,
      thumbnailPath,
      url: '',
      comment: ''
    };

    const data = fs.readFileSync(filePath);
    fs.mkdirSync(path.join(basePath, originalPath), { recursive: true });
    fs.mkdirSync(path.join(basePath, thumbnailPath), { recursive: true });
    fs.writeFileSync(path.join(basePath, originalPath, fileName), data);

    const imageData = sharp(data)
    const metadata = await imageData.metadata()
    image.width = metadata.width;
    image.height = metadata.height;

    if (metadata.width > 500) {
      fs.writeFileSync(path.join(basePath, thumbnailPath, fileName), await imageData.resize(500).toBuffer());
    } else {
      fs.writeFileSync(path.join(basePath, thumbnailPath, fileName), await imageData.toBuffer());
    }

    this.createStatement.run(image);
    return image;
  }

  get(id) {
    return this.getStatement.get(id)
  }

}

module.exports = (db) => { return new ImageController(db); };