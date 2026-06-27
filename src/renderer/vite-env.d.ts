/// <reference types="vite/client" />

interface ElectronAPI {
  openFolder: () => Promise<string | null>;
  readDir: (dirPath: string) => Promise<FileEntry[]>;
  getFileInfo: (filePath: string) => Promise<FileInfo | null>;
  openPlayer: (videoPath: string) => Promise<void>;
  extractThumbnail: (videoPath: string) => Promise<string | null>;
  integrateShell: (enable: boolean) => Promise<boolean>;
  onFolderSelected: (callback: (path: string) => void) => () => void;
  onVideoLoad: (callback: (path: string) => void) => () => void;
  onViewCommand: (callback: (command: string) => void) => () => void;
  onSettingsChanged: (callback: (setting: string, value: boolean) => void) => () => void;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface FileInfo {
  size: number;
  created: string;
  modified: string;
}

interface Window {
  electronAPI: ElectronAPI;
}
