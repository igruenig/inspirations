const columns = []
const columnHeights = [];

for (let column = 0; column < 10; column++) {
  columns.push($('#column-'+(column+1)))
  columnHeights.push(0)
}

const topMargin = 4;
var editingImage = {};

// TODO: implement infinite scrolling

// initial render
const images = window.fetchImages();
images.forEach(image => prependImage(image));


window.onresize = () => {
  // TODO: rearrange images
}

function getNextColumn() {
  const columnsCount = Math.floor(window.innerWidth / 300) + 1
  var currentMin = columnHeights[0];
  var shortestColumn = 0;

  for (let index = 1; index < columnsCount; index++) {
    if (currentMin > columnHeights[index]) {
      currentMin = columnHeights[index]
      shortestColumn = index;
    }
  }

  return shortestColumn;
}

function updateColumn(index, image) {
  const relativeHeight = image.height / image.width;
  columnHeights[index] += relativeHeight;
}

function prependImage(image) {
  const imageElement = $(`
  <div id="${image.id}" class="grid-item">
    <img width="${image.width}" height="${image.height}" src="${window.basePath + "/" + image.thumbnailPath + "/" + image.fileName}">
    <div class="image-overlay">
      <button class="edit-image-button">Edit</button>
      <button class="delete-image-button">Delete</button>
    </div>
  </div>
  `);
  const columnIndex = getNextColumn();
  columns[columnIndex].prepend(imageElement);
  updateColumn(columnIndex, image);
}

window.dragOverHandler = function dragOverHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

window.dropHandler = async function dropHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  const items = ev.dataTransfer.items;
  if (!items) { 
    return; 
  }

  // read out the files first, otherwise they are gone after calling await
  var files = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      files.push(items[i].getAsFile())
    }
  }

  for (var i = 0; i < files.length; i++) {
    const image = await window.createImage(files[i].path);
    prependImage(image);
  }
}

const overlay = document.querySelector('.overlay');
const tags = document.getElementsByName('tags')[0];
const url = document.getElementsByName('url')[0];

document.addEventListener('click', (event) => {
  event.preventDefault();

  if (event.target.classList.contains('edit-image-button')) {
    const image = window.getImage(event.target.parentNode.parentNode.id)
    editingImage = image;
    tags.value = image.tags || '';
    url.value = image.url || '';
    overlay.classList.toggle('overlay--show');
  } else if (event.target.classList.contains('delete-image-button')) {

  } else if (event.target.tagName == 'IMG') {
    const image = window.getImage(event.target.parentNode.id)
    window.openImage(image);
  } else if (event.target.classList.contains("overlay")) {
    editingImage.tags = tags.value;
    editingImage.url = url.value;
    window.updateImage(editingImage);
    overlay.classList.toggle('overlay--show');
  }

});