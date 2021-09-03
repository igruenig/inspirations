const { contextBridge, ipcRenderer } = require('electron');

const basePath = ipcRenderer.sendSync('base-path');
contextBridge.exposeInMainWorld('basePath', basePath);

contextBridge.exposeInMainWorld('fetchImages', (options) => {
  return ipcRenderer.sendSync('fetch-images', options);
});

contextBridge.exposeInMainWorld('getImage', (id) => {
  return ipcRenderer.sendSync('get-image', id);
});

contextBridge.exposeInMainWorld('createImage', async (filePath) => {
  return await ipcRenderer.invoke('create-image', filePath);
});

contextBridge.exposeInMainWorld('updateImage', (image) => {
  return ipcRenderer.sendSync('update-image', image);
});

contextBridge.exposeInMainWorld('openImage', (image) => {
  ipcRenderer.sendSync('open-image', image);
})