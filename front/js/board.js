const columns = [];
const columnHeights = [];
var columnsCount = calculateColumns();
var isFetching = false;

for (let column = 0; column < 10; column++) {
  columns.push($('#column-'+(column+1)))
  columnHeights.push(0)
}

var editingImage = {};

// initial render
const images = window.fetchImages({
  deleted: 0,
  limit: 20
});
images.forEach(image => addImage(image));


window.onresize = () => {
  resetLayout();
}

function calculateColumns() {
  return Math.floor(window.innerWidth / 300) + 1;
}

function getNextColumn() {
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

function resetLayout() {
  const newColumnsCount = calculateColumns();
  if (columnsCount != newColumnsCount) {
    columnsCount = newColumnsCount;
    for (let column = 0; column < 10; column++) {
      columnHeights[column] = 0;
    }
    $('.grid-item').remove();
    images.forEach(image => addImage(image));
  }
}

function updateColumn(index, image) {
  const relativeHeight = image.height / image.width;
  columnHeights[index] += relativeHeight;
}

function addImage(image, prepend) {
  const imageElement = $(`
  <div id="${image.id}" class="grid-item">
    <div class="image-border">
      <img width="${image.width}" height="${image.height}" src="file://${window.basePath + "/" + image.thumbnailPath + "/" + image.fileName}">
      <div class="image-overlay">
        <button class="edit-image-button">Edit</button>
        <button class="delete-image-button">Delete</button>
      </div>
    </div>
  </div>
  `);
  if (prepend) {
    columns[0].prepend(imageElement);
    updateColumn(0, image);
  } else {
    const columnIndex = getNextColumn();
    columns[columnIndex].append(imageElement);
    updateColumn(columnIndex, image);
  }
}

function dragOverHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

async function dropHandler(ev) {
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
    addImage(image, true);
    resetLayout();
  }
}

const overlay = document.querySelector('.overlay');
const tags = document.getElementsByName('tags')[0];
const url = document.getElementsByName('url')[0];

document.addEventListener('dblclick', (event) => {
  if (event.target.tagName == 'IMG') {
    const image = window.getImage(event.target.parentNode.id)
    window.openImage(image);
  }
})

document.addEventListener('click', (event) => {
  event.preventDefault();

  if (event.target.tagName == 'IMG') {
    document.querySelectorAll('.selected').forEach(element => {
      element.classList.remove('selected');
    })
    event.target.parentNode.parentNode.classList.toggle('selected');

  } else if (event.target.classList.contains('edit-image-button')) {
    const image = window.getImage(event.target.parentNode.parentNode.id);
    editingImage = image;
    tags.value = image.tags || '';
    url.value = image.url || '';
    overlay.classList.toggle('overlay--show');

  } else if (event.target.classList.contains('delete-image-button')) {
    const image = window.getImage(event.target.parentNode.parentNode.id);
    image.deleted = 1;
    window.updateImage(image);
    $('#'+image.id).remove();

  } else if (event.target.classList.contains("overlay")) {
    editingImage.tags = tags.value;
    editingImage.url = url.value;
    window.updateImage(editingImage);
    overlay.classList.toggle('overlay--show');
  }
  
});

window.addEventListener('scroll', () => {
  if (isFetching) return;
  const {scrollHeight, scrollTop, clientHeight} = document.documentElement;

  if (scrollTop + clientHeight > scrollHeight - 300) {
    isFetching = true;
    const newImages = window.fetchImages({
      deleted: 0,
      before: images[images.length-1].id,
      limit: 15
    });
    newImages.forEach(image => {
      images.push(image);
      addImage(image);
    });
    console.log('fetched more ' + newImages.length + " images")
    isFetching = false;
  }
})