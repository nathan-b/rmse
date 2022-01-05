const {
	contextBridge,
	ipcRenderer
} = require('electron');
const path = require('path');

// Set up APIs for sandboxed environment
contextBridge.exposeInMainWorld('ipc_bridge', {
	load_file: (file_path, callback) => {
		ipcRenderer.invoke('load_file', file_path).then((result) => {
			callback(path.basename(file_path), result);
		});
	},
	open_file: (callback) => {
		ipcRenderer.invoke('open_file').then((result) => {
			callback(path.basename(result.savefile), result);
		});
	},
	save_file: (file_path, json_str, rm_root, callback) => {
		ipcRenderer.invoke('save_file', file_path, json_str, rm_root).then((result) => {
			callback(result);
		});
	},
	dump_json: (json_str, rm_root, callback) => {
		ipcRenderer.invoke('dump_json', json_str, rm_root).then((result) => {
			callback(result);
		});
	},
	version: () => {
		return ipcRenderer.sendSync('get_version');
	}
});

window.addEventListener('DOMContentLoaded', () => {

});
