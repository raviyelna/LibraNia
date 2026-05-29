import { ipcMain } from 'electron';
import { logger } from '../logger';
import { loadConfig, saveConfig, updateConfig } from '../../src/config/appConfig';
import { readEnv } from '../store/env.store';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
function getEnvPath() {
    const userDataPath = app?.getPath('userData') || process.cwd();
    return path.join(userDataPath, '.env');
}
function writeEnvVar(key, value) {
    const envPath = getEnvPath();
    const env = readEnv();
    env[key] = value;
    const content = Object.entries(env)
        .map(([k, v]) => `${k}="${v}"`)
        .join('\n') + '\n';
    fs.writeFileSync(envPath, content, 'utf-8');
    logger.info(`[ENV] Set ${key} in .env`);
}
export function registerConfigHandlers() {
    ipcMain.handle('config:get', async () => {
        try {
            logger.info('IPC: config:get');
            const config = await loadConfig();
            return config;
        }
        catch (error) {
            logger.error('config:get failed', error);
            throw error;
        }
    });
    ipcMain.handle('config:set', async (event, data) => {
        try {
            logger.info('IPC: config:set');
            await saveConfig(data);
            return { success: true };
        }
        catch (error) {
            logger.error('config:set failed', error);
            throw error;
        }
    });
    ipcMain.handle('config:update', async (event, data) => {
        try {
            logger.info('IPC: config:update');
            await updateConfig(data);
            return { success: true };
        }
        catch (error) {
            logger.error('config:update failed', error);
            throw error;
        }
    });
    ipcMain.handle('config:setEnvVar', async (event, data) => {
        try {
            logger.info('IPC: config:setEnvVar', { key: data.key });
            writeEnvVar(data.key, data.value);
            return { success: true };
        }
        catch (error) {
            logger.error('config:setEnvVar failed', error);
            throw error;
        }
    });
    logger.info('Config IPC handlers registered');
}
