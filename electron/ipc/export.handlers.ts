import { ipcMain } from 'electron';
import { logger } from '../logger.js';

export function registerExportHandlers() {
  ipcMain.handle('export:notes', async () => {
    logger.info('IPC: export:notes (stubbed)');
    return { success: false };
  });

  logger.info('Export IPC handlers registered (stubbed)');
}
