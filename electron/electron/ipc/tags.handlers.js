import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { getAllTags, getNoteTags, addTagsToNote, removeTagFromNote, } from '../services/tags.service.js';
export function registerTagsHandlers() {
    ipcMain.handle('tags:getAll', async () => {
        try {
            logger.info('IPC: tags:getAll');
            const tags = await getAllTags();
            return tags;
        }
        catch (error) {
            logger.error('tags:getAll failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:create', async (event, data) => {
        try {
            logger.info('IPC: tags:create', { name: data.name });
            return { success: true, name: data.name };
        }
        catch (error) {
            logger.error('tags:create failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:delete', async (event, data) => {
        try {
            logger.info('IPC: tags:delete', { id: data.id });
            return { success: true };
        }
        catch (error) {
            logger.error('tags:delete failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:rename', async (event, data) => {
        try {
            logger.info('IPC: tags:rename', { id: data.id, name: data.name });
            return { success: true };
        }
        catch (error) {
            logger.error('tags:rename failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:getForNote', async (event, data) => {
        try {
            logger.info('IPC: tags:getForNote', { noteId: data.noteId });
            const tags = await getNoteTags(data.noteId);
            return tags;
        }
        catch (error) {
            logger.error('tags:getForNote failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:addToNote', async (event, data) => {
        try {
            logger.info('IPC: tags:addToNote', { noteId: data.noteId, tagNames: data.tagNames });
            const tags = Array.isArray(data.tagNames) ? data.tagNames : [data.tagNames];
            await addTagsToNote(data.noteId, tags);
            return { success: true };
        }
        catch (error) {
            logger.error('tags:addToNote failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:removeFromNote', async (event, data) => {
        try {
            logger.info('IPC: tags:removeFromNote', { noteId: data.noteId, tagId: data.tagId });
            await removeTagFromNote(data.noteId, data.tagId);
            return { success: true };
        }
        catch (error) {
            logger.error('tags:removeFromNote failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:getNotesByTag', async (event, data) => {
        try {
            logger.info('IPC: tags:getNotesByTag', { tagId: data.tagId });
            return [];
        }
        catch (error) {
            logger.error('tags:getNotesByTag failed', error);
            throw error;
        }
    });
    ipcMain.handle('tags:setForNote', async (event, data) => {
        try {
            logger.info('IPC: tags:setForNote', { noteId: data.noteId, tagNames: data.tagNames });
            const tags = Array.isArray(data.tagNames) ? data.tagNames : [];
            const note = addTagsToNote(data.noteId, tags);
            return { success: true, note };
        }
        catch (error) {
            logger.error('tags:setForNote failed', error);
            throw error;
        }
    });
    logger.info('Tags IPC handlers registered');
}
