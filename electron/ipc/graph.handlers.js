import { ipcMain } from 'electron';
import { logger } from '../logger';
import { getGraphData } from '../services/graph.service';
export function registerGraphHandlers() {
    ipcMain.handle('graph:getData', async () => {
        try {
            logger.info('IPC: graph:getData');
            const graphData = getGraphData();
            return graphData;
        }
        catch (error) {
            logger.error('graph:getData failed', error);
            throw error;
        }
    });
    logger.info('Graph IPC handlers registered');
}
