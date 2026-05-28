import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getORM } from '../database/connection';
import { getGraphData } from '../services/graph.service';

/**
 * Register IPC handlers for graph operations
 * Called from main.ts after database initialization
 */
export function registerGraphHandlers() {
  // Get graph data for 3D visualization
  ipcMain.handle('graph:getData', async () => {
    try {
      logger.info('IPC: graph:getData');
      const orm = getORM();
      const graphData = await getGraphData(orm);
      return graphData;
    } catch (error) {
      logger.error('graph:getData failed', error as Error);
      // Return empty graph on error (graceful degradation)
      return {
        nodes: [],
        links: []
      };
    }
  });

  logger.info('Graph IPC handlers registered');
}
