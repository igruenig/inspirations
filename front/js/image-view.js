function load(path) {
  const img = document.querySelector('img');
  img.src = path;
}

function addCloseEventListener(imageId) {
  const closeButton = document.querySelector('.close-button');
  closeButton.addEventListener('click', () => {
    window.closeImage(imageId);
  })
}