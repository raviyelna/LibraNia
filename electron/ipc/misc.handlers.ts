import { ipcMain, shell, app } from 'electron';
import { logger } from '../logger';
import path from 'path';

export function registerMiscHandlers() {
  // Logs
  ipcMain.handle('log:error', async (event, data) => {
    logger.error('Renderer error:', data);
    return { success: true };
  });

  ipcMain.handle('logs:open', async () => {
    try {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      await shell.openPath(logsDir);
      return { success: true };
    } catch (error) {
      logger.error('logs:open failed', error as Error);
      throw error;
    }
  });

  // Mode switching
  ipcMain.handle('mode:switch', async (event, data) => {
    logger.info('IPC: mode:switch', { mode: data.mode });
    // Mode switching requires app restart - handled by main.ts
    return { success: true, requiresRestart: true };
  });

  // Provider config
  ipcMain.handle('provider:getConfig', async (event, data) => {
    logger.info('IPC: provider:getConfig (stubbed)');
    return null;
  });

  ipcMain.handle('provider:getAllConfigs', async () => {
    logger.info('IPC: provider:getAllConfigs (stubbed)');
    return [];
  });

  ipcMain.handle('provider:setConfig', async (event, data) => {
    logger.info('IPC: provider:setConfig (stubbed)');
    return { success: true };
  });

  ipcMain.handle('provider:deleteConfig', async (event, data) => {
    logger.info('IPC: provider:deleteConfig (stubbed)');
    return { success: true };
  });

  ipcMain.handle('provider:validate', async (event, data) => {
    logger.info('IPC: provider:validate (stubbed)');
    return { valid: true };
  });

  // Chat
  ipcMain.handle('chat:send', async (event, data) => {
    logger.info('IPC: chat:send (stubbed)');
    return { success: false };
  });

  ipcMain.handle('chat:summarizeNote', async (event, data) => {
    logger.info('IPC: chat:summarizeNote (stubbed)');
    return { success: false };
  });

  // Conversations
  ipcMain.handle('conversation:create', async (event, data) => {
    logger.info('IPC: conversation:create (stubbed)');
    return null;
  });

  ipcMain.handle('conversation:get', async (event, data) => {
    logger.info('IPC: conversation:get (stubbed)');
    return null;
  });

  ipcMain.handle('conversation:getAll', async () => {
    logger.info('IPC: conversation:getAll (stubbed)');
    return [];
  });

  ipcMain.handle('conversation:delete', async (event, data) => {
    logger.info('IPC: conversation:delete (stubbed)');
    return { success: true };
  });

  logger.info('Misc IPC handlers registered');
}
