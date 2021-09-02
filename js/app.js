const columns = []
const columnHeights = [];

for (let column = 0; column < 10; column++) {
  columns.push($('#column-'+(column+1)))
  columnHeights.push(0)
}

const topMargin = 4;
var editingImage = {};

// TODO: implement infinite scrolling
window.loadImages({limit: 1000}, (images) => {
  //const sorted = images.sort((a, b) => b.height/b.width - a.height/a.width)
  images.forEach(image => {
    prependImage(image);
  });
});

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
  <div class="grid-item">
    <a href="#"><img id="${image.id}" width="${image.width}" height="${image.height}" src="${window.basePath + "/" + image.thumbnailPath + "/" + image.fileName}"></a>
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

window.dropHandler = function dropHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        //console.log('... file[' + i + '].path = ' + file.path);
        window.saveFile(file.path, prependImage);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      //console.log('... file[' + i + '].path = ' + ev.dataTransfer.files[i].path);
      window.saveFile(ev.dataTransfer.files[i].path, prependImage);
    }
  }
}

const overlay = document.querySelector('.overlay');
const tags = document.getElementsByName('tags')[0];
const url = document.getElementsByName('url')[0];

document.addEventListener('click', (event) => {
  event.preventDefault();
  
  if (event.target.tagName == 'IMG') {
    window.loadImage(event.target.id, (image) => {
      editingImage = image;
      tags.value = image.tags || '';
      url.value = image.url || '';
      window.openImage(image);
      //overlay.classList.toggle('overlay--show');
    })

  } else if (event.target.classList.contains("overlay")) {
    editingImage.tags = tags.value;
    editingImage.url = url.value;
    window.updateImage(editingImage);
    overlay.classList.toggle('overlay--show');
  }
});