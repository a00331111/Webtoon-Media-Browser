import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Dialog
  openFolder: () => Promise<string | null>;

  // File system
  readDir: (dirPath: string) => Promise<FileEntry[]>;
  getFileInfo: (filePath: string) => Promise<FileInfo | null>;

  // Video
  openPlayer: (videoPath: string) => Promise<void>;
  extractThumbnail: (videoPath: string) => Promise<string | null>;

  // Shell
  integrateShell: (enable: boolean) => Promise<boolean>;

  // Event listeners
  onFolderSelected: (callback: (path: string) => void) => () => void;
  onVideoLoad: (callback: (path: string) => void) => () => void;
  onViewCommand: (callback: (command: string) => void) => () => void;
  onSettingsChanged: (callback: (setting: string, value: boolean) => void) => () => void;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface FileInfo {
  size: number;
  created: string;
  modified: string;
}

const electronAPI: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  getFileInfo: (filePath) => ipcRenderer.invoke('fs:getFileInfo', filePath),
  openPlayer: (videoPath) => ipcRenderer.invoke('video:openPlayer', videoPath),
  extractThumbnail: (videoPath) => ipcRenderer.invoke('video:extractThumbnail', videoPath),
  integrateShell: (enable) => ipcRenderer.invoke('shell:integrate', enable),

  onFolderSelected: (callback) => {
    const handler = (_event: any, path: string) => callback(path);
    ipcRenderer.on('folder:selected', handler);
    return () => ipcRenderer.removeListener('folder:selected', handler);
  },

  onVideoLoad: (callback) => {
    const handler = (_event: any, path: string) => callback(path);
    ipcRenderer.on('video:load', handler);
    return () => ipcRenderer.removeListener('video:load', handler);
  },

  onViewCommand: (callback) => {
    const handler = (_event: any, command: string) => callback(command);
    ipcRenderer.on('view:fitWidth', () => handler(null, 'fitWidth'));
    ipcRenderer.on('view:fitWindow', () => handler(null, 'fitWindow'));
    ipcRenderer.on('view:actualSize', () => handler(null, 'actualSize'));
    ipcRenderer.on('view:zoomIn', () => handler(null, 'zoomIn'));
    ipcRenderer.on('view:zoomOut', () => handler(null, 'zoomOut'));
    return () => {
      ipcRenderer.removeAllListeners('view:fitWidth');
      ipcRenderer.removeAllListeners('view:fitWindow');
      ipcRenderer.removeAllListeners('view:actualSize');
      ipcRenderer.removeAllListeners('view:zoomIn');
      ipcRenderer.removeAllListeners('view:zoomOut');
    };
  },

  onSettingsChanged: (callback) => {
    const handler = (_event: any, value: boolean) => callback('shellIntegration', value);
    ipcRenderer.on('settings:shellIntegration', handler);
    return () => ipcRenderer.removeListener('settings:shellIntegration', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
