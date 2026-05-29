import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import {
  createTag,
  getAllTags,
  getTagById,
  deleteTag,
  renameTag,
  addTagsToNote,
  removeTagFromNote,
  getNoteTags,
  getNotesByTag,
  setNoteTags,
} from '../services/tags.service.js';

/**
 * Register all IPC handlers for tag operations
 */
export function registerTagsHandlers(): void {
  // Get all tags
  ipcMain.handle('tags:getAll', async () => {
    try {
      return await getAllTags();
    } catch (error) {
      logger.error('tags:getAll failed', error);
      throw error;
    }
  });

  // Create a new tag
  ipcMain.handle('tags:create', async (event, { name }) => {
    try {
      return await createTag(name);
    } catch (error) {
      logger.error('tags:create failed', error);
      throw error;
    }
  });

  // Delete a tag
  ipcMain.handle('tags:delete', async (event, { id }) => {
    try {
      return await deleteTag(id);
    } catch (error) {
      logger.error('tags:delete failed', error);
      throw error;
    }
  });

  // Rename a tag
  ipcMain.handle('tags:rename', async (event, { id, name }) => {
    try {
      return await renameTag(id, name);
    } catch (error) {
      logger.error('tags:rename failed', error);
      throw error;
    }
  });

  // Add tags to a note
  ipcMain.handle('tags:addToNote', async (event, { noteId, tagNames }) => {
    try {
      return await addTagsToNote(noteId, tagNames);
    } catch (error) {
      logger.error('tags:addToNote failed', error);
      throw error;
    }
  });

  // Remove tag from note
  ipcMain.handle('tags:removeFromNote', async (event, { noteId, tagId }) => {
    try {
      await removeTagFromNote(noteId, tagId);
      return true;
    } catch (error) {
      logger.error('tags:removeFromNote failed', error);
      throw error;
    }
  });

  // Get all tags for a note
  ipcMain.handle('tags:getForNote', async (event, { noteId }) => {
    try {
      return await getNoteTags(noteId);
    } catch (error) {
      logger.error('tags:getForNote failed', error);
      throw error;
    }
  });

  // Get all notes with a specific tag
  ipcMain.handle('tags:getNotesByTag', async (event, { tagId }) => {
    try {
      return await getNotesByTag(tagId);
    } catch (error) {
      logger.error('tags:getNotesByTag failed', error);
      throw error;
    }
  });

  // Set all tags for a note (replace existing)
  ipcMain.handle('tags:setForNote', async (event, { noteId, tagNames }) => {
    try {
      await setNoteTags(noteId, tagNames);
      return true;
    } catch (error) {
      logger.error('tags:setForNote failed', error);
      throw error;
    }
  });
}
