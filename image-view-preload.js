const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('closeImage', (imageId) => {
  ipcRenderer.sendSync('close-image', imageId);
})