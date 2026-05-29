import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { getGraphData } from '../services/graph.service.js';

export function registerGraphHandlers() {
  ipcMain.handle('graph:getData', async () => {
    try {
      logger.info('IPC: graph:getData');
      const graphData = getGraphData();
      return graphData;
    } catch (error) {
      logger.error('graph:getData failed', error as Error);
      throw error;
    }
  });

  logger.info('Graph IPC handlers registered');
}
