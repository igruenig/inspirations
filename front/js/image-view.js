var imageId = null;

function load(id, path) {
  imageId = id;
  const img = document.createElement("img");
  img.src = path;
  document.body.appendChild(img);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.closeImage(imageId);
  }
})