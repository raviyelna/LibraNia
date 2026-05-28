import { ipcMain } from 'electron';
import { logger } from '../logger';

export function registerSearchHandlers() {
  ipcMain.handle('search:notes', async () => {
    logger.info('IPC: search:notes (stubbed)');
    return [];
  });

  ipcMain.handle('search:content', async () => {
    logger.info('IPC: search:content (stubbed)');
    return [];
  });

  ipcMain.handle('search:semantic', async () => {
    logger.info('IPC: search:semantic (stubbed)');
    return [];
  });

  logger.info('Search IPC handlers registered (stubbed)');
}
