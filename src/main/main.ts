import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev } from './utils/env';
import { registerShellIntegration, unregisterShellIntegration } from './ipc/shell';
import { extractThumbnail } from './ipc/ffmpeg';

let mainWindow: BrowserWindow | null = null;
let playerWindow: BrowserWindow | null = null;

const PRELOAD_PATH = path.join(__dirname, '../preload/preload.js');
const RENDERER_URL = isDev()
  ? 'http://localhost:5173'
  : `file:///${path.join(__dirname, '../renderer/index.html').replace(/\\/g, '/')}`;
const RENDERER_FILE = path.join(__dirname, '../renderer/index.html');

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.loadURL(RENDERER_URL);

  // Only open DevTools when running in development mode (not packaged)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createPlayerWindow(videoPath: string): void {
  if (playerWindow) {
    playerWindow.focus();
    return;
  }

  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    title: 'Video Player',
    show: false,
  });

  if (isDev()) {
    playerWindow.loadURL(`${RENDERER_URL}#/player`);
  } else {
    playerWindow.loadURL(`${RENDERER_URL}#/player`);
  }

  playerWindow.once('ready-to-show', () => {
    playerWindow?.show();
    playerWindow?.webContents.send('video:load', videoPath);
  });

  playerWindow.on('closed', () => {
    playerWindow = null;
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send('folder:selected', result.filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '适应宽度', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('view:fitWidth') },
        { label: '适应窗口', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('view:fitWindow') },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.send('view:actualSize') },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+=', click: () => mainWindow?.webContents.send('view:zoomIn') },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => mainWindow?.webContents.send('view:zoomOut') },
      ],
    },
    {
      label: '设置',
      submenu: [
        {
          label: '集成到右键菜单',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            if (menuItem.checked) {
              registerShellIntegration();
            } else {
              unregisterShellIntegration();
            }
            mainWindow?.webContents.send('settings:shellIntegration', menuItem.checked);
          },
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 Webtoon Media Browser',
              message: 'Webtoon Media Browser v1.0.0',
              detail: '一个支持平行眼 3D 模式的本地图片视频浏览器',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() || entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
    return files;
  } catch (error) {
    return [];
  }
});

ipcMain.handle('fs:getFileInfo', async (_event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    return null;
  }
});

ipcMain.handle('video:openPlayer', async (_event, videoPath: string) => {
  createPlayerWindow(videoPath);
});

ipcMain.handle('video:extractThumbnail', async (_event, videoPath: string) => {
  return extractThumbnail(videoPath);
});

ipcMain.handle('shell:integrate', async (_event, enable: boolean) => {
  if (enable) {
    registerShellIntegration();
  } else {
    unregisterShellIntegration();
  }
  return true;
});

// App lifecycle - Handle command line arguments for shell integration
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Find folder path in command line arguments
      const args = commandLine.slice(1);
      for (const arg of args) {
        if (arg && !arg.startsWith('-') && fs.existsSync(arg)) {
          mainWindow.webContents.send('folder:selected', arg);
          break;
        }
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Handle first instance with folder argument
  app.whenReady().then(() => {
    createMainWindow();

    // Check for folder argument on startup
    const args = process.argv.slice(1);
    for (const arg of args) {
      if (arg && !arg.startsWith('-') && fs.existsSync(arg)) {
        // Send folder path after window is ready
        mainWindow?.webContents.on('did-finish-load', () => {
          mainWindow?.webContents.send('folder:selected', arg);
        });
        break;
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}
