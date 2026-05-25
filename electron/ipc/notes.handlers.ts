import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getORM } from '../database/connection';
import {
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  getNoteById,
  getAllNotes,
  getDeletedNotes,
} from '../services/notes.service';
import { getBacklinks, getSemanticLinks } from '../services/links.service';

/**
 * Register IPC handlers for note operations
 * Called from main.ts after database initialization
 */
export function registerNotesHandlers() {
  const orm = getORM();

  // Create note
  ipcMain.handle('notes:create', async (event, data) => {
    try {
      logger.info('IPC: notes:create', { title: data.title });
      const note = await createNote(data, orm);
      return note;
    } catch (error) {
      logger.error('notes:create failed', error as Error);
      throw error;
    }
  });

  // Update note
  ipcMain.handle('notes:update', async (event, data) => {
    try {
      logger.info('IPC: notes:update', { id: data.id });
      const { id, ...updates } = data;
      const note = await updateNote(id, updates, orm);
      return note;
    } catch (error) {
      logger.error('notes:update failed', error as Error);
      throw error;
    }
  });

  // Delete note (soft or hard)
  ipcMain.handle('notes:delete', async (event, data) => {
    try {
      logger.info('IPC: notes:delete', { id: data.id, hard: data.hard });
      const success = await deleteNote(data.id, data.hard || false, orm);
      return { success };
    } catch (error) {
      logger.error('notes:delete failed', error as Error);
      throw error;
    }
  });

  // Restore note
  ipcMain.handle('notes:restore', async (event, data) => {
    try {
      logger.info('IPC: notes:restore', { id: data.id });
      const note = await restoreNote(data.id, orm);
      return note;
    } catch (error) {
      logger.error('notes:restore failed', error as Error);
      throw error;
    }
  });

  // Get note by ID
  ipcMain.handle('notes:getById', async (event, data) => {
    try {
      logger.info('IPC: notes:getById', { id: data.id });
      const note = await getNoteById(data.id, orm, data.includeDeleted || false);
      return note;
    } catch (error) {
      logger.error('notes:getById failed', error as Error);
      throw error;
    }
  });

  // Get all notes
  ipcMain.handle('notes:getAll', async (event) => {
    try {
      logger.info('IPC: notes:getAll');
      const notes = await getAllNotes(orm);
      return notes;
    } catch (error) {
      logger.error('notes:getAll failed', error as Error);
      throw error;
    }
  });

  // Get deleted notes (trash view)
  ipcMain.handle('notes:getDeleted', async (event) => {
    try {
      logger.info('IPC: notes:getDeleted');
      const notes = await getDeletedNotes(orm);
      return notes;
    } catch (error) {
      logger.error('notes:getDeleted failed', error as Error);
      throw error;
    }
  });

  // Get backlinks for a note
  ipcMain.handle('links:getBacklinks', async (event, data) => {
    try {
      logger.info('IPC: links:getBacklinks', { noteId: data.noteId });
      const backlinks = await getBacklinks(data.noteId, orm);
      return backlinks;
    } catch (error) {
      logger.error('links:getBacklinks failed', error as Error);
      throw error;
    }
  });

  // Get semantic links for a note
  ipcMain.handle('links:getSemanticLinks', async (event, data) => {
    try {
      logger.info('IPC: links:getSemanticLinks', { noteId: data.noteId });
      const semanticLinks = await getSemanticLinks(data.noteId, orm);
      return semanticLinks;
    } catch (error) {
      logger.error('links:getSemanticLinks failed', error as Error);
      throw error;
    }
  });

  logger.info('Notes IPC handlers registered');
}
