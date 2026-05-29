import { ipcMain, shell, app } from 'electron';
import { logger } from '../logger.js';
import path from 'path';
import { getORM } from '../database/connection.js';
import { createConversation, getConversation, getAllConversations, deleteConversation, } from '../services/conversation.service.js';
import { saveProviderToEnv, loadProviderFromEnv, loadAllProvidersFromEnv, deleteProviderFromEnv, } from '../store/env.store.js';
export function registerMiscHandlers() {
    ipcMain.handle('log:error', async (event, data) => {
        logger.error('Renderer error:', data);
        return { success: true };
    });
    ipcMain.handle('logs:open', async () => {
        try {
            const logsDir = path.join(app.getPath('userData'), 'logs');
            await shell.openPath(logsDir);
            return { success: true };
        }
        catch (error) {
            logger.error('logs:open failed', error);
            throw error;
        }
    });
    ipcMain.handle('mode:switch', async (event, data) => {
        logger.info('IPC: mode:switch', { mode: data.mode });
        return { success: true, requiresRestart: true };
    });
    ipcMain.handle('provider:getConfig', async (event, data) => {
        try {
            logger.info('IPC: provider:getConfig', { providerId: data.providerId });
            const config = loadProviderFromEnv(data.providerId);
            return config || null;
        }
        catch (error) {
            logger.error('provider:getConfig failed', error);
            throw error;
        }
    });
    ipcMain.handle('provider:getAllConfigs', async () => {
        try {
            logger.info('IPC: provider:getAllConfigs');
            const configs = loadAllProvidersFromEnv();
            logger.info('Retrieved configs from .env:', configs.map(c => ({
                id: c.id,
                hasApiKey: !!c.apiKey,
                model: c.model
            })));
            return configs;
        }
        catch (error) {
            logger.error('provider:getAllConfigs failed', error);
            throw error;
        }
    });
    ipcMain.handle('provider:setConfig', async (event, data) => {
        try {
            logger.info('IPC: provider:setConfig', {
                providerId: data.id,
                hasApiKey: !!data.apiKey,
                model: data.model
            });
            saveProviderToEnv(data);
            logger.info('Config saved to .env');
            const saved = loadProviderFromEnv(data.id);
            logger.info('Verification:', {
                id: saved?.id,
                hasApiKey: !!saved?.apiKey,
                model: saved?.model
            });
            return { success: true };
        }
        catch (error) {
            logger.error('provider:setConfig failed', error);
            throw error;
        }
    });
    ipcMain.handle('provider:deleteConfig', async (event, data) => {
        try {
            logger.info('IPC: provider:deleteConfig', { providerId: data.providerId });
            deleteProviderFromEnv(data.providerId);
            return { success: true };
        }
        catch (error) {
            logger.error('provider:deleteConfig failed', error);
            throw error;
        }
    });
    ipcMain.handle('provider:validate', async (event, data) => {
        try {
            logger.info('IPC: provider:validate - raw data:', data);
            logger.info('IPC: provider:validate', {
                providerId: data?.providerId,
                hasApiKey: !!data?.apiKey,
                hasModel: !!data?.model,
                apiKeyLength: data?.apiKey?.length || 0
            });
            const isValid = !!(data?.providerId && data?.apiKey);
            logger.info('Validation result:', { isValid });
            return { valid: isValid };
        }
        catch (error) {
            logger.error('provider:validate failed', error);
            throw error;
        }
    });
    ipcMain.handle('chat:send', async (event, data) => {
        logger.info('IPC: chat:send (stubbed)');
        return { success: false };
    });
    ipcMain.handle('chat:summarizeNote', async (event, data) => {
        logger.info('IPC: chat:summarizeNote (stubbed)');
        return { success: false };
    });
    ipcMain.handle('conversation:create', async (event, data) => {
        try {
            logger.info('IPC: conversation:create', { title: data.title });
            const orm = getORM();
            const conversation = await createConversation({ title: data.title }, orm);
            return conversation;
        }
        catch (error) {
            logger.error('conversation:create failed', error);
            throw error;
        }
    });
    ipcMain.handle('conversation:get', async (event, data) => {
        try {
            logger.info('IPC: conversation:get', { conversationId: data.conversationId });
            const orm = getORM();
            const conversation = await getConversation(data.conversationId, orm);
            return conversation;
        }
        catch (error) {
            logger.error('conversation:get failed', error);
            throw error;
        }
    });
    ipcMain.handle('conversation:getAll', async () => {
        try {
            logger.info('IPC: conversation:getAll');
            const orm = getORM();
            const conversations = await getAllConversations(orm);
            return conversations;
        }
        catch (error) {
            logger.error('conversation:getAll failed', error);
            throw error;
        }
    });
    ipcMain.handle('conversation:delete', async (event, data) => {
        try {
            logger.info('IPC: conversation:delete', { conversationId: data.conversationId });
            const orm = getORM();
            await deleteConversation(data.conversationId, orm);
            return { success: true };
        }
        catch (error) {
            logger.error('conversation:delete failed', error);
            throw error;
        }
    });
    ipcMain.handle('conversation:rename', async (event, data) => {
        try {
            logger.info('IPC: conversation:rename', { conversationId: data.conversationId, title: data.title });
            const orm = getORM();
            const { conversations } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');
            await orm.update(conversations).set({ title: data.title, updated_at: new Date() }).where(eq(conversations.id, data.conversationId));
            return { success: true };
        }
        catch (error) {
            logger.error('conversation:rename failed', error);
            throw error;
        }
    });
    logger.info('Misc IPC handlers registered');
}
