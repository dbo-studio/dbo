import { spawn } from 'child_process';
import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import serve from 'electron-serve';
import path from 'path';
import portfinder from 'portfinder';

const appServe = app.isPackaged
  ? serve({
      directory: path.join(__dirname, '../out')
    })
  : null;

app.on('ready', () => {
  portfinder
    .getPortPromise({
      port: 5000
    })
    .then((port) => {
      process.env.APP_PORT = String(port);
      process.env.APP_ENV = 'production';
      createWindow();
    })
    .catch((err) => {
      console.log(err);
    });
});

const createWindow = () => {
  let win: BrowserWindow | null = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const binaryPath = path.join(__dirname, '../', `back`);
  const backendProcess = spawn(`${binaryPath}`, {
    env: process.env
  });

  if (app.isPackaged && appServe) {
    appServe(win).then(() => {
      win?.loadURL('app://-');
    });
  } else {
    win.loadURL(`http://localhost:3000`);
    win.webContents.openDevTools();
    win.webContents.on('did-fail-load', () => {
      win?.webContents.reloadIgnoringCache();
    });
  }

  win.on('closed', () => {
    backendProcess.kill();
    win = null;
  });
};

app.on('window-all-closed', () => {
  // if (process.platform !== "darwin") {
  app.quit();
  // }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('message', (event: IpcMainEvent, message: any) => {
  console.log(message);
  setTimeout(() => event.sender.send('message', 'hi from electron'), 500);
});
