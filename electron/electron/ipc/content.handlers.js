import { ipcMain, dialog } from 'electron';
import { logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
export function registerContentHandlers() {
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
        }
        catch (error) {
            logger.error('content:upload failed', error);
            throw error;
        }
    });
    ipcMain.handle('content:saveImage', async (event, data) => {
        try {
            logger.info('IPC: content:saveImage', { filename: data.filename, noteId: data.noteId });
            const dataDir = process.env.LIBRANIA_DATA_DIR || path.join(os.homedir(), '.librania');
            const attachmentsDir = path.join(dataDir, 'attachments', data.noteId);
            if (!fs.existsSync(attachmentsDir)) {
                fs.mkdirSync(attachmentsDir, { recursive: true });
            }
            const timestamp = Date.now();
            const ext = path.extname(data.filename) || '.png';
            const basename = path.basename(data.filename, ext);
            const filename = `${basename}-${timestamp}${ext}`;
            const filePath = path.join(attachmentsDir, filename);
            const buffer = Buffer.from(data.buffer);
            fs.writeFileSync(filePath, buffer);
            logger.info('Image saved', { filePath });
            return { filePath };
        }
        catch (error) {
            logger.error('content:saveImage failed', error);
            throw error;
        }
    });
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
