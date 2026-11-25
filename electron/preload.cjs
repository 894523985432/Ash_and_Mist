// Міст між грою і Windows: гра бачить window.desktop лише в ПК-версії.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  fullscreen: on => ipcRenderer.invoke('fullscreen', on),
  saveFile: (name, text) => ipcRenderer.invoke('save-file', name, text),
  openFile: () => ipcRenderer.invoke('open-file'),
  quit: () => ipcRenderer.invoke('quit'),
  update: {
    canAuto: () => ipcRenderer.invoke('update-can'),
    download: () => ipcRenderer.invoke('update-download'),
    install: () => ipcRenderer.invoke('update-install'),
    onEvent: cb => ipcRenderer.on('update', (e, ev) => cb(ev)),
  },
});
