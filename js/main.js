const {app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const rm_loader = require('./rm_load.js');

// Create the UI
function createWindow () {
  const mainwin = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainwin.loadFile('index.html');
  mainwin.webContents.openDevTools();
}

// Message handlers
ipcMain.handle('load_rm_file', async (event, file_path) => {
  return rm_loader.load(file_path);
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
