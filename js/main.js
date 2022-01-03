const {app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const rm_loader = require('./rm_load.js');

// Create the UI
function createWindow () {
  const mainwin = new BrowserWindow({
    width: 1000,
    height: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainwin.loadFile('index.html');
  mainwin.webContents.openDevTools();
}

// Message handlers
ipcMain.handle('load_file', async (event, file_path) => {
  return rm_loader.load(file_path);
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
    return false;
  }
  return await rm_loader.save(file_path, json_str, rm_root);
});

ipcMain.handle('open_file', async (event) => {
  [file_path] = dialog.showOpenDialogSync({
    title: 'Select a file to open',
    properties: ['openFile']
  });
  if (file_path) {
    return rm_loader.load(file_path);
  }
});


// Entrypoint
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Exit handler
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit()
})
