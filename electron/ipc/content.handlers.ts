import { ipcMain, dialog } from 'electron';
import { logger } from '../logger';
import { getORM } from '../database/connection';
import {
  createContent,
  getContentById,
  updateContent,
  deleteContent,
  getAllContent,
} from '../services/content.service';

/**
 * Register IPC handlers for content operations
 * Called from main.ts after database initialization
 */
export function registerContentHandlers() {
  const orm = getORM();

  // File upload dialog
  ipcMain.handle('content:upload', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
        ],
      });

      logger.info('IPC: content:upload', { canceled: result.canceled });

      return {
        canceled: result.canceled,
        filePath: result.canceled ? null : result.filePaths[0],
      };
    } catch (error) {
      logger.error('content:upload failed', error as Error);
      throw error;
    }
  });

  // Create content
  ipcMain.handle('content:create', async (event, data) => {
    try {
      logger.info('IPC: content:create', { filePath: data.filePath, source: data.source });
      const content = await createContent(data, orm);
      return content;
    } catch (error) {
      logger.error('content:create failed', error as Error);
      throw error;
    }
  });

  // Get content by ID
  ipcMain.handle('content:getById', async (event, data) => {
    try {
      logger.info('IPC: content:getById', { id: data.id });
      const content = await getContentById(data.id, orm);
      return content;
    } catch (error) {
      logger.error('content:getById failed', error as Error);
      throw error;
    }
  });

  // Get all content
  ipcMain.handle('content:getAll', async () => {
    try {
      logger.info('IPC: content:getAll');
      const contents = await getAllContent(orm);
      return contents;
    } catch (error) {
      logger.error('content:getAll failed', error as Error);
      throw error;
    }
  });

  // Update content
  ipcMain.handle('content:update', async (event, data) => {
    try {
      logger.info('IPC: content:update', { id: data.id });
      const { id, ...updates } = data;
      const content = await updateContent(id, updates, orm);
      return content;
    } catch (error) {
      logger.error('content:update failed', error as Error);
      throw error;
    }
  });

  // Delete content
  ipcMain.handle('content:delete', async (event, data) => {
    try {
      logger.info('IPC: content:delete', { id: data.id });
      const success = await deleteContent(data.id, orm);
      return { success };
    } catch (error) {
      logger.error('content:delete failed', error as Error);
      throw error;
    }
  });

  logger.info('Content IPC handlers registered');
}
