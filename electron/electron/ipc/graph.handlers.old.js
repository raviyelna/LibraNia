import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { getORM } from '../database/connection.js';
import { getGraphData } from '../services/graph.service.js';
export function registerGraphHandlers() {
    ipcMain.handle('graph:getData', async () => {
        try {
            logger.info('IPC: graph:getData');
            const orm = getORM();
            const graphData = await getGraphData(orm);
            return graphData;
        }
        catch (error) {
            logger.error('graph:getData failed', error);
            return {
                nodes: [],
                links: []
            };
        }
    });
    logger.info('Graph IPC handlers registered');
}
