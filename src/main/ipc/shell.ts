import { app } from 'electron';
import { exec } from 'child_process';
import path from 'path';

const APP_NAME = 'Webtoon Media Browser';
const APP_ID = 'WebtoonMediaBrowser';

export function registerShellIntegration(): void {
  const appPath = app.getPath('exe');
  const escapedPath = appPath.replace(/\\/g, '\\\\');

  // Register folder context menu
  const folderCommand = `"${escapedPath}" "%V"`;
  const folderRegKey = `HKCU\\Software\\Classes\\Directory\\shell\\${APP_ID}`;

  const commands = [
    `reg add "${folderRegKey}" /ve /d "用 ${APP_NAME} 打开" /f`,
    `reg add "${folderRegKey}\\command" /ve /d "${folderCommand}" /f`,
    `reg add "${folderRegKey}" /v "Icon" /d "${escapedPath}" /f`,
  ];

  // Register media file context menu
  const fileExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mkv', '.mov', '.wmv'];

  fileExtensions.forEach((ext) => {
    const fileCommand = `"${escapedPath}" "%V"`;
    const fileRegKey = `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${APP_ID}`;
    commands.push(
      `reg add "${fileRegKey}" /ve /d "用 ${APP_NAME} 打开" /f`,
      `reg add "${fileRegKey}\\command" /ve /d "${fileCommand}" /f`
    );
  });

  executeCommands(commands);
}

export function unregisterShellIntegration(): void {
  const folderRegKey = `HKCU\\Software\\Classes\\Directory\\shell\\${APP_ID}`;

  const commands = [
    `reg delete "${folderRegKey}" /f`,
  ];

  const fileExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mkv', '.mov', '.wmv'];

  fileExtensions.forEach((ext) => {
    const fileRegKey = `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${APP_ID}`;
    commands.push(`reg delete "${fileRegKey}" /f`);
  });

  executeCommands(commands);
}

function executeCommands(commands: string[]): void {
  commands.forEach((cmd) => {
    exec(cmd, (error) => {
      if (error) {
        console.error(`Failed to execute: ${cmd}`, error);
      }
    });
  });
}
