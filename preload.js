const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    hideWindow: () => ipcRenderer.invoke('hide-window'),
    downloadAsset: (url, filename) => ipcRenderer.invoke('download-asset', url, filename),
    onWindowShown: (callback) => ipcRenderer.on('window-shown', callback),
    onWindowHidden: (callback) => ipcRenderer.on('window-hidden', callback)
});
