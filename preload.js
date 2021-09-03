const { contextBridge, ipcRenderer } = require('electron');

const basePath = ipcRenderer.sendSync('base-path');
contextBridge.exposeInMainWorld('basePath', basePath);

contextBridge.exposeInMainWorld('createImage', async (filePath) => {
  return await ipcRenderer.invoke('create-image', filePath);
});

contextBridge.exposeInMainWorld('allImages', async (options, callback) => {
  const images = await ipcRenderer.invoke('all-images', options);
  callback(images);
});

contextBridge.exposeInMainWorld('getImage', async (id, callback) => {
  const meta = await ipcRenderer.invoke('get-image', id);
  callback(meta);
});

contextBridge.exposeInMainWorld('updateImage', async (image) => {
  await ipcRenderer.invoke('update-image', image);
});

contextBridge.exposeInMainWorld('openImage', (image) => {
  ipcRenderer.sendSync('open-image', image);
})