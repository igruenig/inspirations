const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs');
const path = require('path');

const basePath = app.getPath('userData');
const dbPath = path.join(basePath, 'meta.db');
const db = require('./db')(dbPath);

const imageController = require('./imageController')(db);

var mainWindow;
var imageWindows = [];

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
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



ipcMain.on('base-path', (event, arg) => {
  event.returnValue = basePath;
});

ipcMain.handle('create-image', async (event, filePath) => {
  return await imageController.create(basePath, filePath)
})

ipcMain.handle('all-images', (event, options) => {
  return imageController.all(options);
})

ipcMain.handle('get-image', async (event, id) => {
  return await imageController.get(id);
})

ipcMain.handle('update-image', async (event, image) => {
  return await updateImage(image);
})


function updateImage(image) {
  return new Promise((resolve, reject) => {
    const stream = db.createReadStream()
    stream.on('data', (data) => {
      const meta = JSON.parse(data.value);
      if (meta.id == image.id) {
        stream.destroy();

        meta.tags = image.tags;
        meta.url = image.url;
        db.put(data.key, JSON.stringify(meta));
        resolve();
      }
    });
    stream.on('end', () => {
      reject("not found");
    })
  })
}

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

  const imageWindow = new BrowserWindow({
    x: mainBounds.x + 100,
    y: mainBounds.y + 50,
    width: 1200,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  })
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