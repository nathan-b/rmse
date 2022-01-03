const {contextBridge, ipcRenderer} = require('electron');
const path = require('path');

// Set up APIs for sandboxed environment
contextBridge.exposeInMainWorld('ipc_bridge', {
  load_json: (file_path, callback) => {
    ipcRenderer.invoke('load_rm_file', file_path).then((result) => {
      callback(path.basename(file_path), result);
    });
  },
  save_file: (file_path, json_str, rm_root, callback) => {
    ipcRenderer.invoke('save_file', file_path, json_str, rm_root).then((result) => {
      callback(result);
    });
  },
  version: () => {
    return ipcRenderer.sendSync('get_version');
  }
});

window.addEventListener('DOMContentLoaded', () => {

});
