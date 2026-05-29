import { ipcMain, dialog } from 'electron';
import { logger } from '../logger';
import { getORM } from '../database/connection';
import { exportNotesToMarkdown, exportNotesToJSON } from '../services/export.service';
export function registerExportHandlers() {
    const orm = getORM();
    ipcMain.handle('export:selectDirectory', async () => {
        try {
            logger.info('IPC: export:selectDirectory');
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory', 'createDirectory'],
                title: 'Select Export Directory',
            });
            if (result.canceled) {
                return null;
            }
            return result.filePaths[0];
        }
        catch (error) {
            logger.error('export:selectDirectory failed', error);
            throw error;
        }
    });
    ipcMain.handle('export:selectFile', async (event, { defaultName }) => {
        try {
            logger.info('IPC: export:selectFile', { defaultName });
            const result = await dialog.showSaveDialog({
                title: 'Export Notes',
                defaultPath: defaultName,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });
            if (result.canceled) {
                return null;
            }
            return result.filePath;
        }
        catch (error) {
            logger.error('export:selectFile failed', error);
            throw error;
        }
    });
    ipcMain.handle('export:markdown', async (event, { noteIds, directory }) => {
        try {
            logger.info('IPC: export:markdown', { noteIds: noteIds.length, directory });
            const count = await exportNotesToMarkdown(noteIds, directory, orm);
            return { success: true, count };
        }
        catch (error) {
            logger.error('export:markdown failed', error);
            throw error;
        }
    });
    ipcMain.handle('export:json', async (event, { noteIds, filePath }) => {
        try {
            logger.info('IPC: export:json', { noteIds: noteIds.length, filePath });
            const success = await exportNotesToJSON(noteIds, filePath, orm);
            return { success };
        }
        catch (error) {
            logger.error('export:json failed', error);
            throw error;
        }
    });
    logger.info('Export IPC handlers registered');
}
