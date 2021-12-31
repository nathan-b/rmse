const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Set up APIs for sandboxed environment
contextBridge.exposeInMainWorld('rm_loader', {
  load_json: (file_path, callback) => {
    ipcRenderer.invoke('load_rm_file', file_path).then((result) => {
      callback(path.basename(file_path), result);
    });
  }
});

window.addEventListener('DOMContentLoaded', () => {

});
