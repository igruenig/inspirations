const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuid } = require('uuid');

async function addImage(source, destination) {
  const imageID = uuid();
  const extension = path.extname(source);
  const fileName = imageID + extension;

  const date = new Date();
  const folderName = date.getFullYear() + '-' + date.getMonth();

  const imagesPath = 'images';
  
  const thumbnailPath = path.join(imagesPath, folderName, 'thumbnails');

  // create the directory to store the original image
  const originalPath = path.join(imagesPath, folderName, 'originals');
  fs.mkdirSync(path.join(destination, originalPath), { recursive: true });
  fs.copyFileSync(source, path.join(destination, originalPath, fileName));

  // prepare the directory for the thumbnail
  fs.mkdirSync(path.join(destination, thumbnailPath), { recursive: true });

  // create thumbnail
  const imageData = sharp(source)
  const imageFileMetadata = await imageData.metadata()

  const thumbnailDestination = path.join(destination, thumbnailPath, fileName);
  if (imageFileMetadata.width > 500) {
    fs.writeFileSync(thumbnailDestination, await imageData.resize(500).toBuffer());
  } else {
    fs.writeFileSync(thumbnailDestination, await imageData.toBuffer());
  }

  return {
    fileName,
    width: imageFileMetadata.width,
    height: imageFileMetadata.height,
    originalPath,
    thumbnailPath,
    url: '',
    comment: ''
  }
}

module.exports = {
  addImage
}