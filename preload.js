const { contextBridge, ipcRenderer } = require('electron');

const basePath = ipcRenderer.sendSync('get-user-data-path');
contextBridge.exposeInMainWorld('basePath', basePath);

contextBridge.exposeInMainWorld('saveFile', async (filePath, callback) => {
  const meta = await ipcRenderer.invoke('save-image', filePath);
  callback(meta);
});

contextBridge.exposeInMainWorld('loadImages', async (options, callback) => {
  const images = await ipcRenderer.invoke('load-images', options);
  callback(images);
});

contextBridge.exposeInMainWorld('loadImage', async (id, callback) => {
  const meta = await ipcRenderer.invoke('load-image', id);
  callback(meta);
});

contextBridge.exposeInMainWorld('updateImage', async (image) => {
  await ipcRenderer.invoke('update-image', image);
});

contextBridge.exposeInMainWorld('openImage', (image) => {
  ipcRenderer.sendSync('open-image', image);
})