import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getAllNotes } from '../services/file-storage.service';
import { getAllTags, getTagsForNote } from '../services/tags.service';

export function registerSearchHandlers() {
  // Full-text search in notes
  ipcMain.handle('search:fullText', async (event, data: { query: string }) => {
    try {
      logger.info('IPC: search:fullText', { query: data.query });
      const notes = getAllNotes();
      const query = data.query.toLowerCase();

      const results = notes
        .filter(note => !note.deleted_at)
        .filter(note =>
          note.title.toLowerCase().includes(query) ||
          note.body.toLowerCase().includes(query)
        )
        .map(note => ({
          id: note.id,
          title: note.title,
          body: note.body.substring(0, 200), // Preview
          created_at: note.created_at,
          updated_at: note.updated_at,
        }));

      return results;
    } catch (error) {
      logger.error('search:fullText failed', error as Error);
      throw error;
    }
  });

  // Quick navigation search (title only)
  ipcMain.handle('search:quickNav', async (event, data: { query: string }) => {
    try {
      logger.info('IPC: search:quickNav', { query: data.query });
      const notes = getAllNotes();
      const query = data.query.toLowerCase();

      const results = notes
        .filter(note => !note.deleted_at)
        .filter(note => note.title.toLowerCase().includes(query))
        .map(note => ({
          id: note.id,
          title: note.title,
        }));

      return results;
    } catch (error) {
      logger.error('search:quickNav failed', error as Error);
      throw error;
    }
  });

  // Fuzzy search (simple implementation)
  ipcMain.handle('search:fuzzy', async (event, data: { query: string }) => {
    try {
      logger.info('IPC: search:fuzzy', { query: data.query });
      const notes = getAllNotes();
      const query = data.query.toLowerCase();

      const results = notes
        .filter(note => !note.deleted_at)
        .filter(note => {
          const title = note.title.toLowerCase();
          const body = note.body.toLowerCase();
          // Simple fuzzy: check if all query chars appear in order
          let queryIdx = 0;
          for (const char of title + ' ' + body) {
            if (char === query[queryIdx]) {
              queryIdx++;
              if (queryIdx === query.length) return true;
            }
          }
          return false;
        })
        .map(note => ({
          id: note.id,
          title: note.title,
          body: note.body.substring(0, 200),
        }));

      return results;
    } catch (error) {
      logger.error('search:fuzzy failed', error as Error);
      throw error;
    }
  });

  // Semantic search (placeholder - requires embeddings)
  ipcMain.handle('search:semantic', async (event, data: { query: string }) => {
    try {
      logger.info('IPC: search:semantic', { query: data.query });
      // TODO: Implement with embeddings service
      return [];
    } catch (error) {
      logger.error('search:semantic failed', error as Error);
      throw error;
    }
  });

  logger.info('Search IPC handlers registered');
}
