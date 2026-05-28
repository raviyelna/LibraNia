import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../logger';

export function registerWindowHandlers() {
  ipcMain.handle('window:minimize', async (event) => {
    try {
      logger.info('IPC: window:minimize');
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.minimize();
      return { success: true };
    } catch (error) {
      logger.error('window:minimize failed', error as Error);
      throw error;
    }
  });

  ipcMain.handle('window:maximize', async (event) => {
    try {
      logger.info('IPC: window:maximize');
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win?.isMaximized()) {
        win.unmaximize();
      } else {
        win?.maximize();
      }
      return { success: true };
    } catch (error) {
      logger.error('window:maximize failed', error as Error);
      throw error;
    }
  });

  ipcMain.handle('window:close', async (event) => {
    try {
      logger.info('IPC: window:close');
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.close();
      return { success: true };
    } catch (error) {
      logger.error('window:close failed', error as Error);
      throw error;
    }
  });

  logger.info('Window IPC handlers registered');
}
