const container = document.querySelector('.container');

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
  limit: 30
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

var lastClick = null;
document.addEventListener('click', (event) => {
  event.preventDefault();

  if (event.target.tagName == 'IMG') {
    if (new Date() - lastClick < 300) {
      const image = window.getImage(event.target.parentNode.parentNode.id);
      window.openImage(image);
      event.target.parentNode.parentNode.classList.add('selected');
    } else {
      if (!event.metaKey) {
        cancelSelection();
      }
      event.target.parentNode.parentNode.classList.toggle('selected');
    }
    lastClick = new Date();

  } else {
    cancelSelection();
  }
  
  /*
  else if (event.targzet.classList.contains('edit-image-button')) {
    

  } else if (event.target.classList.contains("overlay")) {
    editingImage.tags = tags.value;
    editingImage.url = url.value;
    window.updateImage(editingImage);
    overlay.classList.toggle('overlay--show');
  }
  */
});

function cancelSelection() {
  document.querySelectorAll('.selected').forEach(element => {
    element.classList.remove('selected');
  })
}

document.addEventListener("keydown", (event) => {

  if (event.code == "Space" && event.target == document.body) {
    event.preventDefault();
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    deleteSelected();
    resetLayout();

  } else if (event.key === "Enter" || event.key === " ") {
    const selected = document.querySelectorAll(".selected");
    if (selected.length == 1) {
      const image = window.getImage(selected[0].id);
      window.openImage(image);
    }
    
  } else if (event.code === "KeyI") {
    const selected = document.querySelectorAll(".selected");
    if (selected.length == 1) {
      const image = window.getImage(selected[0].id);
      editingImage = image;
      tags.value = image.tags || '';
      url.value = image.url || '';
      overlay.classList.toggle('overlay--show');
    }
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    
    const allSelected = document.querySelectorAll(".selected")
    if (allSelected.length > 0) {
      const lastSelected = allSelected[allSelected.length-1];
      const column = parseInt(lastSelected.parentNode.id.split("-")[1]);
      const nextColumn = column + 1;

      const selectedRect = lastSelected.getBoundingClientRect()
      const nextItemCandidates = document.querySelectorAll("#column-"+nextColumn+" .grid-item");
      
      for (let index = 0; index < nextItemCandidates.length; index++) {
        const item = nextItemCandidates[index];
        const rect = item.getBoundingClientRect();
        if (selectedRect.top >= rect.top && selectedRect.top < rect.bottom) {
          cancelSelection();
          item.classList.toggle('selected');
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }

  } else if (event.key === "ArrowLeft") {
    event.preventDefault();

    const allSelected = document.querySelectorAll(".selected")
    if (allSelected.length > 0) {
      const lastSelected = allSelected[allSelected.length-1];
      const column = parseInt(lastSelected.parentNode.id.split("-")[1]);
      const nextColumn = column - 1;

      const selectedRect = lastSelected.getBoundingClientRect()
      const nextItemCandidates = document.querySelectorAll("#column-"+nextColumn+" .grid-item");
      
      for (let index = 0; index < nextItemCandidates.length; index++) {
        const item = nextItemCandidates[index];
        const rect = item.getBoundingClientRect();
        if (selectedRect.top >= rect.top && selectedRect.top < rect.bottom) {
          cancelSelection();
          item.classList.toggle('selected');
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }

  } else if (event.key === "ArrowUp") {
    event.preventDefault();

    const allSelected = document.querySelectorAll(".selected")
    if (allSelected.length > 0) {
      const lastSelected = allSelected[allSelected.length-1];
      const column = parseInt(lastSelected.parentNode.id.split("-")[1]);

      const nextItemCandidates = document.querySelectorAll("#column-"+column+" .grid-item");
      
      for (let index = 0; index < nextItemCandidates.length; index++) {
        const item = nextItemCandidates[index];
        if (item == lastSelected && index > 0) {
          cancelSelection();
          nextItemCandidates[index - 1].classList.toggle('selected');
          nextItemCandidates[index - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }

  } else if (event.key === "ArrowDown") {
    event.preventDefault();

    const allSelected = document.querySelectorAll(".selected")
    if (allSelected.length > 0) {
      const lastSelected = allSelected[allSelected.length-1];
      const column = parseInt(lastSelected.parentNode.id.split("-")[1]);

      const nextItemCandidates = document.querySelectorAll("#column-"+column+" .grid-item");
      
      for (let index = 0; index < nextItemCandidates.length; index++) {
        const item = nextItemCandidates[index];
        if (item == lastSelected && index + 1 < nextItemCandidates.length) {
          cancelSelection();
          nextItemCandidates[index + 1].classList.toggle('selected');
          nextItemCandidates[index + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }

  }
})

function deleteSelected() {
  const selected = document.querySelectorAll(".selected");
  selected.forEach(item => {
    const image = window.getImage(item.id);
    image.deleted = 1;
    window.updateImage(image);
    item.remove();
  })
}

container.addEventListener('scroll', () => {
  if (isFetching) return;
  const {scrollHeight, scrollTop, clientHeight} = container;

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