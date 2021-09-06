const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const Store = require('./store');
const basePath = app.getPath('userData');
const store = new Store(basePath)

var mainWindow;
var imageWindows = [];

function createWindow () {
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    trafficLightPosition: {x: 20, y: 20},
    width: 1200,
    height: 1000,
    webPreferences: {
      sandbox: true,
      scrollBounce: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'board-preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, "front/index.html"))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Board

ipcMain.on('base-path', (event, arg) => {
  event.returnValue = basePath;
});

ipcMain.on('fetch-images', (event, options) => {
  event.returnValue = store.fetchImages(options);
})

ipcMain.handle('create-image', async (event, filePath) => {
  return await store.createImage(filePath);
})

ipcMain.on('get-image', (event, id) => {
  event.returnValue = store.getImage(id);
})

ipcMain.on('update-image', (event, image) => {
  store.updateImage(image);
  event.returnValue = true;
})

// ImageView

ipcMain.on('open-image', (event, image) => {
  if (imageWindows[image.id]) {
    imageWindows[image.id].focus()
    event.returnValue = true
    return;
  }

  const mainBounds = mainWindow.getNormalBounds();
  const imageWidth = Math.min(image.width, 1600);
  const imageHeight = image.height * (image.width / image.width);
  const windowHeight = Math.min(imageHeight, 1200);

  const imageWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    x: mainBounds.x + 100,
    y: mainBounds.y + 50,
    useContentSize: true, // actual content size without window frame
    fullscreenable: false,
    width: imageWidth,
    height: windowHeight,
    webPreferences: {
      sandbox: true,
      scrollBounce: false,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'image-view-preload.js')
    }
  })
  
  if (imageHeight < 1600) {
    imageWindow.setAspectRatio(image.width/image.height);
  }

  imageWindow.loadFile(path.join(__dirname, "front/image-view.html"))
  imageWindow.once('ready-to-show', () => {
    imageWindow.webContents.executeJavaScript(`load(${image.id},'${basePath + "/" + image.originalPath + "/" + image.fileName}')`)
    imageWindow.show();
    imageWindow.focus();
  })
  imageWindow.on('close', (event) => {
    imageWindows[image.id] = null;
    event.returnValue = false;
  })
  
  imageWindows[image.id] = imageWindow;
  event.returnValue = true;
})

ipcMain.on('close-image', (event, imageId) => {
  if (imageWindows[imageId]) {
    imageWindows[imageId].close();
  }
  event.returnValue = true;
});