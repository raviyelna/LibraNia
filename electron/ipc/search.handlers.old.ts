import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getDatabase } from '../database/connection';
import { quickNavSearch, fullTextSearch, fuzzySearch, semanticSearch } from '../services/search.service';

/**
 * Register all IPC handlers for search operations
 */
export function registerSearchHandlers(): void {
  // Quick navigation search (title-only, for Cmd+K autocomplete)
  ipcMain.handle('search:quickNav', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await quickNavSearch(db, query);
    } catch (error) {
      logger.error('search:quickNav failed', error);
      throw error;
    }
  });

  // Full-text search (title + body with snippets)
  ipcMain.handle('search:fullText', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await fullTextSearch(db, query);
    } catch (error) {
      logger.error('search:fullText failed', error);
      throw error;
    }
  });

  // Fuzzy search (trigram tokenizer for typo tolerance)
  ipcMain.handle('search:fuzzy', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await fuzzySearch(db, query);
    } catch (error) {
      logger.error('search:fuzzy failed', error);
      throw error;
    }
  });

  // Semantic search (embeddings + vector similarity)
  ipcMain.handle('search:semantic', async (event, { query }) => {
    try {
      const db = getDatabase();
      return await semanticSearch(db, query);
    } catch (error) {
      logger.error('search:semantic failed', error);
      throw error;
    }
  });
}
