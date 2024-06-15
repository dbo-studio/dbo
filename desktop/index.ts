import { app, BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import serve from "electron-serve";
import path from "path";
import portfinder from "portfinder";
import { spawn } from "node:child_process";
import { CHANNEL_NAME, MessageType } from "./constants";

const appServe = app.isPackaged
  ? serve({
      directory: path.join(__dirname, "../out"),
    })
  : null;

app.on("ready", () => {
  portfinder
    .getPortPromise({
      port: 5000,
    })
    .then((port) => {
      // process.env.APP_PORT = String(port);
      console.log(port);
      process.env.APP_PORT = "8080";
      process.env.APP_ENV = "production";
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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const binaryPath = path.join(__dirname, "../", `dbo`);
  const backendProcess = spawn(`${binaryPath}`, {
    env: process.env,
  });

  if (app.isPackaged && appServe) {
    appServe(win).then(() => {
      win?.loadURL("app://-");
    });
  } else {
    win.loadURL(`http://localhost:3000`);
    win.webContents.openDevTools();
    win.webContents.on("did-fail-load", () => {
      win?.webContents.reloadIgnoringCache();
    });
  }

  win.on("closed", () => {
    backendProcess.kill();
    win = null;
  });
};

app.on("window-all-closed", () => {
  // if (process.platform !== "darwin") {
  app.quit();
  // }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on(CHANNEL_NAME, (event: IpcMainEvent, message: any) => {
  message = JSON.parse(message);
  console.log("🚀 ~ ipcMain.on ~ message:", message);

  switch (message.name) {
    case MessageType.GET_PORT:
      event.sender.send(
        CHANNEL_NAME,
        JSON.stringify({
          name: MessageType.GET_PORT,
          data: "http://localhost:" + process.env.APP_PORT,
        })
      );
      break;

    default:
      break;
  }
});
