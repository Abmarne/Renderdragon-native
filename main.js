const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let mainWindow = null;
let isVisible = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Hide when loses focus
    mainWindow.on('blur', () => {
        hideWindow();
    });

    // Center window on screen
    mainWindow.center();
}

function showWindow() {
    if (mainWindow) {
        mainWindow.center();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('window-shown');
        isVisible = true;
    }
}

function hideWindow() {
    if (mainWindow) {
        mainWindow.hide();
        mainWindow.webContents.send('window-hidden');
        isVisible = false;
    }
}

function toggleWindow() {
    if (isVisible) {
        hideWindow();
    } else {
        showWindow();
    }
}

app.whenReady().then(() => {
    createWindow();

    // Register global shortcut (Ctrl+Space)
    const registered = globalShortcut.register('CommandOrControl+Space', () => {
        toggleWindow();
    });

    if (!registered) {
        console.error('Failed to register global shortcut');
    }

    // IPC handlers
    ipcMain.handle('hide-window', () => {
        hideWindow();
    });

    ipcMain.handle('download-asset', async (event, url, filename) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                defaultPath: filename,
                filters: [{ name: 'All Files', extensions: ['*'] }]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, message: 'Download canceled' };
            }

            return new Promise((resolve) => {
                const protocol = url.startsWith('https') ? https : http;
                const file = fs.createWriteStream(result.filePath);

                protocol.get(url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve({ success: true, path: result.filePath });
                    });
                }).on('error', (err) => {
                    fs.unlink(result.filePath, () => { });
                    resolve({ success: false, message: err.message });
                });
            });
        } catch (error) {
            return { success: false, message: error.message };
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
