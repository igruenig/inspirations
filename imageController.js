const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const models = require('./models');

class ImageController {

  constructor(options) {
    this.options = options;
    this.store = require('./store')(options.basePath);
  }

  fetchImages(options) {    
    return this.store.fetchImages(options);
  }

  async create(filePath) {
    const image = models.newImage(filePath);
    const basePath = this.options.basePath;

    // create the directory to store the original image
    const originalImageDirectory = path.join(basePath, image.originalPath);
    fs.mkdirSync(originalImageDirectory, { recursive: true });
    fs.copyFileSync(filePath, path.join(basePath, image.originalPath, image.fileName));

    // prepare the directory for the thumbnail
    const thumbnailDirectory = path.join(basePath, image.thumbnailPath);
    fs.mkdirSync(thumbnailDirectory, { recursive: true });

    // create thumbnail
    const imageData = sharp(filePath)
    const metadata = await imageData.metadata()
    image.width = metadata.width;
    image.height = metadata.height;

    const thumbnailPath = path.join(basePath, image.thumbnailPath, image.fileName);
    if (metadata.width > 500) {
      fs.writeFileSync(thumbnailPath, await imageData.resize(500).toBuffer());
    } else {
      fs.writeFileSync(thumbnailPath, await imageData.toBuffer());
    }

    this.store.createImage(image);
    return image;
  }

  get(id) {
    return this.store.getImage(id);
  }

  update(image) {
    return this.store.updateImage(image);
  }

}

module.exports = (db, options) => { 
  return new ImageController(db, options); 
};