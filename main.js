// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs');
const path = require('path')
const level = require('level');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');

const basePath = app.getPath('userData');
const dbPath = path.join(basePath, 'meta');
const db = level(dbPath);

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
  mainWindow.loadFile(path.join(__dirname, "index.html"))

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

ipcMain.on('get-user-data-path', (event, arg) => {
  event.returnValue = basePath;
});

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
  imageWindow.loadFile(path.join(__dirname, "imageView.html"))
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

ipcMain.handle('save-image', async (event, filePath) => {
  const result = await saveImage(filePath);
  return result;
})

ipcMain.handle('load-images', async (event, options) => {
  const result = await loadImages(options);
  return result;
})

ipcMain.handle('load-image', async (event, id) => {
  const result = await loadImage(id);
  return result;
})

ipcMain.handle('update-image', async (event, image) => {
  const result = await updateImage(image);
  return result;
})

function saveImage(filePath) {
  const data = fs.readFileSync(filePath);

  const extension = path.extname(filePath);
  const date = new Date();
  const timestamp = Date.now();
  const imageID = uuid();
  const imageKey = timestamp + '-' + imageID;

  const imagesPath = 'images';
  const fileName = imageID + extension;
  const folderName = date.getFullYear() + '-' + date.getMonth();
  const originalPath = path.join(imagesPath, folderName, 'originals');
  const thumbnailPath = path.join(imagesPath, folderName, 'thumbnails');
  
  const meta = { 
    id: imageID,
    fileName: fileName,
    originalPath,
    thumbnailPath
  };

  fs.mkdirSync(path.join(basePath, originalPath), { recursive: true });
  fs.mkdirSync(path.join(basePath, thumbnailPath), { recursive: true });
  fs.writeFileSync(path.join(basePath, originalPath, fileName), data);

  const thumbnail = sharp(data)

  return new Promise((resolve, reject) => {
    thumbnail
    .metadata()
    .then((metadata) => {
      meta.width = metadata.width;
      meta.height = metadata.height;

      if (metadata.width > 500) {
        return thumbnail
          .resize(500)
          .toBuffer()
      }
      return thumbnail
        .toBuffer()
    })
    .then((data) => {
      fs.writeFileSync(path.join(basePath, thumbnailPath, fileName), data);
      db.put(imageKey, JSON.stringify(meta));
      resolve(meta);
    })
  });
}

function loadImage(id) {
  return new Promise((resolve, reject) => {
    const stream = db.createReadStream()
    stream.on('data', (data) => {
      const meta = JSON.parse(data.value);
      if (meta.id == id) {
        stream.destroy();
        resolve(meta);
      }
    });
  })
}

function loadImages(options) {
  return new Promise((resolve, reject) => {
    const images = [];
    const stream = db.createReadStream(options)
    stream.on('data', (data) => {
      const meta = JSON.parse(data.value);
      images.push(meta);
    });
    stream.on('end', () => {
      resolve(images);
    })
  })
}

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