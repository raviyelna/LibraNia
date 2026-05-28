import { ipcMain } from 'electron';
import { logger } from '../logger';
import { loadConfig, saveConfig, updateConfig } from '../../src/config/appConfig';

export function registerConfigHandlers() {
  ipcMain.handle('config:get', async () => {
    try {
      logger.info('IPC: config:get');
      const config = await loadConfig();
      return config;
    } catch (error) {
      logger.error('config:get failed', error as Error);
      throw error;
    }
  });

  ipcMain.handle('config:set', async (event, data) => {
    try {
      logger.info('IPC: config:set');
      await saveConfig(data);
      return { success: true };
    } catch (error) {
      logger.error('config:set failed', error as Error);
      throw error;
    }
  });

  ipcMain.handle('config:update', async (event, data) => {
    try {
      logger.info('IPC: config:update');
      await updateConfig(data);
      return { success: true };
    } catch (error) {
      logger.error('config:update failed', error as Error);
      throw error;
    }
  });

  logger.info('Config IPC handlers registered');
}
