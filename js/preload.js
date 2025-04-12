const {
	contextBridge,
	ipcRenderer,
	webUtils
} = require('electron');

const path_basename = (p) => p.substring(p.lastIndexOf(path.sep) + 1);

// Set up APIs for sandboxed environment
contextBridge.exposeInMainWorld('ipc_bridge', {
  path_for_file: (file) => webUtils.getPathForFile(file),
	load_file: (file_path, callback) => {
		ipcRenderer.invoke('load_file', file_path).then((result) => {
			callback(path_basename(file_path), result);
		});
	},
	open_file: (callback) => {
		ipcRenderer.invoke('open_file').then((result) => {
			callback(path_basename(result.savefile), result);
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
