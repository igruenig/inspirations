const closeButton = document.querySelector('.close-button');
var imageId = null;

function load(id, path) {
  imageId = id;
  const img = document.querySelector('img');
  img.src = path;
}

closeButton.addEventListener('click', () => {
  window.closeImage(imageId);
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.closeImage(imageId);
  }
})