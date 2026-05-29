import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getORM } from '../database/connection';
import { getGraphData } from '../services/graph.service';
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
