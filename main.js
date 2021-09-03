const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs');
const path = require('path');

const basePath = app.getPath('userData');
const imageController = require('./imageController')({ basePath });

var mainWindow;
var imageWindows = [];

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      scrollBounce: true,
      nativeWindowOpen: true, // to enable window.open in renderer
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "front/index.html"))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Main API

ipcMain.on('base-path', (event, arg) => {
  event.returnValue = basePath;
});

ipcMain.on('fetch-images', (event, options) => {
  event.returnValue = imageController.fetchImages(options);
})

ipcMain.on('get-image', (event, id) => {
  event.returnValue = imageController.get(id);
})

ipcMain.handle('create-image', async (event, filePath) => {
  return await imageController.create(filePath)
})

ipcMain.on('update-image', (event, image) => {
  event.returnValue = imageController.update(image);
})

// ImageView

ipcMain.on('open-image', (event, image) => {
  const existing = imageWindows.find((window) => {
    return window.id == image.id
  })
  if (existing) {
    existing.window.focus()
    event.returnValue = true
    return;
  }

  const mainBounds = mainWindow.getNormalBounds();
  const imageWidth = Math.min(image.width, 1600);
  const imageHeight = image.height * (image.width / image.width);
  const windowHeight = Math.min(imageHeight, 1200);

  const imageWindow = new BrowserWindow({
    x: mainBounds.x + 100,
    y: mainBounds.y + 50,
    useContentSize: true, // width and height measure the actual content
    width: imageWidth,
    height: windowHeight,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  })
  
  if (imageHeight < 1600) {
    imageWindow.setAspectRatio(image.width/image.height);
  }

  imageWindow.loadFile(path.join(__dirname, "front/imageView.html"))
  imageWindow.once('ready-to-show', () => {
    imageWindow.webContents.executeJavaScript(`
      document.body.innerHTML += "<img src='${basePath + "/" + image.originalPath + "/" + image.fileName}'>"
    `)
    imageWindow.show();
    imageWindow.focus();
  })
  imageWindow.on('close', (event) => {
    imageWindows = imageWindows.filter((window) => { return window.id != image.id })
    event.returnValue = false
  })
  
  imageWindows.push({id: image.id, window: imageWindow })
  event.returnValue = true
})