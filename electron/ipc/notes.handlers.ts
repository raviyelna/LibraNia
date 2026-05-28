import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../logger';
import {
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  getNoteById,
  getAllNotes,
  syncFilesystemToDb,
} from '../services/file-storage.service';
import { getBacklinks, getSemanticLinks } from '../services/links.service';

/**
 * Register IPC handlers for note operations
 * Called from main.ts after file storage initialization
 */
export function registerNotesHandlers(mainWindow?: BrowserWindow) {
  // Create note
  ipcMain.handle('notes:create', async (event, data) => {
    try {
      logger.info('IPC: notes:create', { title: data.title });
      const note = createNote(data);

      // Emit real-time event to all renderer processes
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notes:created', note);
      }

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
      const note = updateNote(id, updates);

      // Emit real-time event to all renderer processes
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notes:updated', note);
      }

      return note;
    } catch (error) {
      logger.error('notes:update failed', error as Error);
      throw error;
    }
  });

  // Delete note (soft delete only for file storage)
  ipcMain.handle('notes:delete', async (event, data) => {
    try {
      logger.info('IPC: notes:delete', { id: data.id });
      const success = deleteNote(data.id);
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
      const note = restoreNote(data.id);
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
      const note = getNoteById(data.id, data.includeDeleted || false);
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
      const notes = getAllNotes();
      return notes;
    } catch (error) {
      logger.error('notes:getAll failed', error as Error);
      throw error;
    }
  });

  // Get deleted notes (trash view) - filter from getAllNotes
  ipcMain.handle('notes:getDeleted', async (event) => {
    try {
      logger.info('IPC: notes:getDeleted');
      // File storage doesn't have separate getDeleted, filter manually
      const notes = getAllNotes().filter(n => n.deleted_at !== null);
      return notes;
    } catch (error) {
      logger.error('notes:getDeleted failed', error as Error);
      throw error;
    }
  });

  // Get backlinks for a note - disabled for now
  ipcMain.handle('links:getBacklinks', async (event, data) => {
    try {
      logger.info('IPC: links:getBacklinks', { noteId: data.noteId });
      // TODO: implement file-based link tracking
      return [];
    } catch (error) {
      logger.error('links:getBacklinks failed', error as Error);
      throw error;
    }
  });

  // Get semantic links for a note - disabled for now
  ipcMain.handle('links:getSemanticLinks', async (event, data) => {
    try {
      logger.info('IPC: links:getSemanticLinks', { noteId: data.noteId });
      // TODO: implement file-based semantic link tracking
      return [];
    } catch (error) {
      logger.error('links:getSemanticLinks failed', error as Error);
      throw error;
    }
  });

  // Sync filesystem to database
  ipcMain.handle('notes:syncFilesystemToDb', async () => {
    try {
      logger.info('IPC: notes:syncFilesystemToDb');
      const result = await syncFilesystemToDb();
      return result;
    } catch (error) {
      logger.error('notes:syncFilesystemToDb failed', error as Error);
      throw error;
    }
  });

  logger.info('Notes IPC handlers registered');
}
