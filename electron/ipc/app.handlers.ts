import { ipcMain, app } from 'electron';
import { logger } from '../logger';

export function registerAppHandlers() {
  ipcMain.handle('app:restart', async () => {
    try {
      logger.info('IPC: app:restart');
      app.relaunch();
      app.exit(0);
    } catch (error) {
      logger.error('app:restart failed', error as Error);
      throw error;
    }
  });

  logger.info('App IPC handlers registered');
}
