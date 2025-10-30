const { contextBridge, ipcRenderer, webUtils } = require('electron');

const path_basename = (p) => {
	// Extract just the filename from a path
	// Works for both Unix and Windows paths
	const normalized = p.replace(/\\/g, '/');
	const parts = normalized.split('/');
	return parts[parts.length - 1];
};

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
	get_backup_info: async (file_path) => {
		return await ipcRenderer.invoke('get_backup_info', file_path);
	},
	restore_backup: async (backup_path, save_path) => {
		return await ipcRenderer.invoke('restore_backup', backup_path, save_path);
	},
	clear_backups: async (file_path) => {
		return await ipcRenderer.invoke('clear_backups', file_path);
	},
	basename: async (file_path) => {
		return await ipcRenderer.invoke('basename', file_path);
	},
	version: () => {
		return ipcRenderer.sendSync('get_version');
	}
});

window.addEventListener('DOMContentLoaded', () => {});
