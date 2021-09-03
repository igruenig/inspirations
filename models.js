const path = require('path');
const { v4: uuid } = require('uuid');

exports.newTag = (name) => {
  return {
    id: uuid(),
    name: name
  }
}

exports.newImage = (filePath) => {
  const extension = path.extname(filePath);
  const date = new Date();
  const imageID = uuid();

  const imagesPath = 'images';
  const fileName = imageID + extension;
  const folderName = date.getFullYear() + '-' + date.getMonth();
  const originalPath = path.join(imagesPath, folderName, 'originals');
  const thumbnailPath = path.join(imagesPath, folderName, 'thumbnails');

  return {
    id: imageID,
    fileName,
    width: null,
    height: null,
    originalPath,
    thumbnailPath,
    url: '',
    comment: ''
  }
}