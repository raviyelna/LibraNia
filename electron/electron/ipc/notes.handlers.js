import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { createNote, updateNote, deleteNote, restoreNote, getNoteById, getAllNotes, syncFilesystemToDb, } from '../services/file-storage.service.js';
export function registerNotesHandlers(mainWindow) {
    ipcMain.handle('notes:create', async (event, data) => {
        try {
            logger.info('IPC: notes:create', { title: data.title });
            const note = createNote(data);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('notes:created', note);
            }
            return note;
        }
        catch (error) {
            logger.error('notes:create failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:update', async (event, data) => {
        try {
            logger.info('IPC: notes:update', { id: data.id });
            const { id, ...updates } = data;
            const note = updateNote(id, updates);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('notes:updated', note);
            }
            return note;
        }
        catch (error) {
            logger.error('notes:update failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:delete', async (event, data) => {
        try {
            logger.info('IPC: notes:delete', { id: data.id });
            const success = deleteNote(data.id);
            return { success };
        }
        catch (error) {
            logger.error('notes:delete failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:restore', async (event, data) => {
        try {
            logger.info('IPC: notes:restore', { id: data.id });
            const note = restoreNote(data.id);
            return note;
        }
        catch (error) {
            logger.error('notes:restore failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:getById', async (event, data) => {
        try {
            logger.info('IPC: notes:getById', { id: data.id });
            const note = getNoteById(data.id, data.includeDeleted || false);
            return note;
        }
        catch (error) {
            logger.error('notes:getById failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:getAll', async (event) => {
        try {
            logger.info('IPC: notes:getAll');
            const notes = getAllNotes();
            return notes;
        }
        catch (error) {
            logger.error('notes:getAll failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:getDeleted', async (event) => {
        try {
            logger.info('IPC: notes:getDeleted');
            const notes = getAllNotes().filter(n => n.deleted_at !== null);
            return notes;
        }
        catch (error) {
            logger.error('notes:getDeleted failed', error);
            throw error;
        }
    });
    ipcMain.handle('links:getBacklinks', async (event, data) => {
        try {
            logger.info('IPC: links:getBacklinks', { noteId: data.noteId });
            return [];
        }
        catch (error) {
            logger.error('links:getBacklinks failed', error);
            throw error;
        }
    });
    ipcMain.handle('links:getSemanticLinks', async (event, data) => {
        try {
            logger.info('IPC: links:getSemanticLinks', { noteId: data.noteId });
            return [];
        }
        catch (error) {
            logger.error('links:getSemanticLinks failed', error);
            throw error;
        }
    });
    ipcMain.handle('notes:syncFilesystemToDb', async () => {
        try {
            logger.info('IPC: notes:syncFilesystemToDb');
            const result = await syncFilesystemToDb();
            return result;
        }
        catch (error) {
            logger.error('notes:syncFilesystemToDb failed', error);
            throw error;
        }
    });
    logger.info('Notes IPC handlers registered');
}
