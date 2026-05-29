import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { getDatabase } from '../database/connection.js';
import { quickNavSearch, fullTextSearch, fuzzySearch, semanticSearch } from '../services/search.service.js';
export function registerSearchHandlers() {
    ipcMain.handle('search:quickNav', async (event, { query }) => {
        try {
            const db = getDatabase();
            return await quickNavSearch(db, query);
        }
        catch (error) {
            logger.error('search:quickNav failed', error);
            throw error;
        }
    });
    ipcMain.handle('search:fullText', async (event, { query }) => {
        try {
            const db = getDatabase();
            return await fullTextSearch(db, query);
        }
        catch (error) {
            logger.error('search:fullText failed', error);
            throw error;
        }
    });
    ipcMain.handle('search:fuzzy', async (event, { query }) => {
        try {
            const db = getDatabase();
            return await fuzzySearch(db, query);
        }
        catch (error) {
            logger.error('search:fuzzy failed', error);
            throw error;
        }
    });
    ipcMain.handle('search:semantic', async (event, { query }) => {
        try {
            const db = getDatabase();
            return await semanticSearch(db, query);
        }
        catch (error) {
            logger.error('search:semantic failed', error);
            throw error;
        }
    });
}
