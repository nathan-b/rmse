const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fsprom = require('fs').promises;
const rm_loader = require('./rm_load.js');

// Create the UI
function createWindow() {
	const mainwin = new BrowserWindow({
		width: 1000,
		height: 1200,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	});

	mainwin.loadFile('index.html');

	// Only open dev tools in development
	if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
		mainwin.webContents.openDevTools({ mode: 'detach' });
	}

	try {
		mainwin.webContents.debugger.removeAllListeners('Autofill.enable');
	} catch (error) {
		console.warn('Disable Autofill.enable command failed:', error);
	}

	try {
		mainwin.webContents.debugger.removeAllListeners('Autofill.setAddresses');
	} catch (error) {
		console.warn('Disable Autofill.setAddresses command failed:', error);
	}
}

function getWindow() {
	if (BrowserWindow.getAllWindows().length === 0) {
		return null;
	}
	return BrowserWindow.getAllWindows()[0];
}

// Message handlers
ipcMain.handle('load_file', async (event, file_path) => {
	try {
		return rm_loader.load(file_path);
	} catch (err) {
		console.error('Error loading file:', err);
		return { error: err.message };
	}
});

ipcMain.on('get_version', (event) => {
	event.returnValue = app.getVersion();
});

ipcMain.handle('save_file', async (event, file_path, json_str, rm_root) => {
	if (file_path.length === 0) {
		// Empty string => Open Save As dialog
		file_path = dialog.showSaveDialogSync({
			title: 'Select a location to save the file',
			defaultPath: rm_root
		});
	}
	if (!file_path) {
		return '';
	}
	return await rm_loader.save(file_path, json_str, rm_root);
});

ipcMain.handle('open_file', async (event) => {
	const result = dialog.showOpenDialogSync(getWindow(), {
		title: 'Select a file to open',
		properties: ['openFile']
	});
	if (result && result.length > 0) {
		try {
			return rm_loader.load(result[0]);
		} catch (err) {
			console.error('Error loading file:', err);
			return { error: err.message };
		}
	}
	return null;
});

ipcMain.handle('dump_json', async (event, json_str, rm_root) => {
	const file_path = dialog.showSaveDialogSync(getWindow(), {
		title: 'Select a location to save the raw JSON',
		defaultPath: rm_root
	});
	if (!file_path) {
		return '';
	}

	try {
		await fsprom.writeFile(file_path, json_str);
	} catch (err) {
		console.error('Failed to write JSON file: ' + err);
		return '';
	}
	return file_path;
});

ipcMain.handle('get_backup_info', async (event, file_path) => {
	try {
		return await rm_loader.backup.backup_info(file_path);
	} catch (err) {
		console.error('Error getting backup info:', err);
		return [];
	}
});

ipcMain.handle('restore_backup', async (event, backup_path, save_path) => {
	try {
		await rm_loader.backup.restore_backup(backup_path, save_path);
		return { success: true };
	} catch (err) {
		console.error('Error restoring backup:', err);
		return { success: false, error: err.message };
	}
});

ipcMain.handle('clear_backups', async (event, file_path) => {
	try {
		const backups = await rm_loader.backup.get_backups(file_path);
		for (const backup_path of backups) {
			await fsprom.unlink(backup_path);
		}
		return { success: true, count: backups.length };
	} catch (err) {
		console.error('Error clearing backups:', err);
		return { success: false, error: err.message };
	}
});

ipcMain.handle('basename', async (event, file_path) => {
	return path.basename(file_path);
});

// Entrypoint
app.whenReady().then(() => {
	createWindow();

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Exit handler
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
});
