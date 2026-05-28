import { ipcMain, dialog, app } from 'electron';
import { logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Register IPC handlers for content operations
 * DISABLED: File storage doesn't support content table yet
 */
export function registerContentHandlers() {
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

  // Save pasted image
  ipcMain.handle('content:saveImage', async (event, data: { buffer: ArrayBuffer; filename: string; noteId: string }) => {
    try {
      logger.info('IPC: content:saveImage', { filename: data.filename, noteId: data.noteId });

      // Create attachments directory
      const attachmentsDir = path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'attachments', data.noteId);
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(data.filename) || '.png';
      const basename = path.basename(data.filename, ext);
      const filename = `${basename}-${timestamp}${ext}`;
      const filePath = path.join(attachmentsDir, filename);

      // Write file
      const buffer = Buffer.from(data.buffer);
      fs.writeFileSync(filePath, buffer);

      logger.info('Image saved', { filePath });

      return { filePath };
    } catch (error) {
      logger.error('content:saveImage failed', error as Error);
      throw error;
    }
  });

  // Stub remaining handlers
  ipcMain.handle('content:create', async () => {
    logger.info('IPC: content:create (stubbed)');
    return null;
  });

  ipcMain.handle('content:getById', async () => {
    logger.info('IPC: content:getById (stubbed)');
    return null;
  });

  ipcMain.handle('content:getAll', async () => {
    logger.info('IPC: content:getAll (stubbed)');
    return [];
  });

  ipcMain.handle('content:update', async () => {
    logger.info('IPC: content:update (stubbed)');
    return null;
  });

  ipcMain.handle('content:delete', async () => {
    logger.info('IPC: content:delete (stubbed)');
    return { success: false };
  });

  logger.info('Content IPC handlers registered (stubbed)');
}
