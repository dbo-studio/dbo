import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import serve from 'electron-serve';
import windowStateKeeper from 'electron-window-state';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'path';
import portfinder from 'portfinder';
import { CHANNEL_NAME, MessageType } from './constants';

app.on('ready', () => {
  createWindow();
});

const createWindow = async () => {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1230
  });

  let win: BrowserWindow | null = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindowState.manage(win);

  const port = await findServerPort();
  const backendProcess = serveBackend(port);
  await serveFront(win);

  win.on('closed', () => {
    backendProcess.kill();
    win = null;
  });
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on(CHANNEL_NAME, (event: IpcMainEvent, message: any) => {
  message = JSON.parse(message);
  console.log('🚀 ~ ipcMain.on ~ message:', message);

  switch (message.name) {
    case MessageType.GET_PORT:
      event.sender.send(CHANNEL_NAME, {
        name: MessageType.GET_PORT,
        data: 'http://localhost:' + process.env.APP_PORT + '/api'
      });
      break;

    default:
      break;
  }
});

const findServerPort = async () => {
  const port = await portfinder.getPortPromise({
    port: 5000
  });

  return port;
};

const serveBackend = (port: number): ChildProcessWithoutNullStreams => {
  process.env.APP_PORT = port.toString();
  process.env.APP_ENV = 'production';

  const binaryPath = path.join(__dirname, '../', `dbo`);
  const backendProcess = spawn(`${binaryPath}`, {
    env: process.env
  });

  if (!app.isPackaged) {
    // Log stdout
    backendProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    // Log stderr
    backendProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  }

  return backendProcess;
};

const serveFront = async (win: BrowserWindow) => {
  const appServe = app.isPackaged
    ? serve({
        directory: path.join(__dirname, '../out')
      })
    : null;

  if (appServe) {
    await appServe(win);
    win?.loadURL('app://-');
  } else {
    win.loadURL(`http://localhost:3000`);
    win.webContents.openDevTools();
    win.webContents.on('did-fail-load', () => {
      win?.webContents.reloadIgnoringCache();
    });
  }
};
