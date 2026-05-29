import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { getORM } from '../database/connection.js';
import { createConversation, addMessage, addCitations, getConversation, getAllConversations, deleteConversation, } from '../services/conversation.service.js';
import { getAIService } from '../services/ai/ai.service.js';
import { WebSearchService } from '../services/ai/websearch.service.js';
import { getNoteById } from '../services/notes.service.js';
import { setProviderConfig, getProviderConfig, getAllProviderConfigs, deleteProviderConfig, } from '../store/secure.store.js';
export function registerAIHandlers(mainWindow, webSearchService) {
    const orm = getORM();
    const aiService = getAIService();
    const searchService = webSearchService || new WebSearchService();
    const handlers = {};
    handlers['chat:send'] = async (data) => {
        try {
            logger.info('IPC: chat:send', {
                conversationId: data.conversationId,
                providerId: data.providerId,
                useWebSearch: data.useWebSearch,
            });
            let conversationId = data.conversationId;
            if (!conversationId) {
                const title = data.message.slice(0, 50);
                const conversation = await createConversation({ title }, orm);
                conversationId = conversation.id;
            }
            const userMessage = await addMessage({
                conversation_id: conversationId,
                role: 'user',
                content: data.message,
            }, orm);
            let webSearchResults = [];
            let webSearchContext = '';
            let citations = [];
            if (data.useWebSearch) {
                try {
                    webSearchResults = await Promise.race([
                        searchService.search(data.message, 5),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 10000)),
                    ]);
                    webSearchContext = searchService.formatResultsForPrompt(webSearchResults);
                    citations = searchService.extractCitations(webSearchResults);
                }
                catch (error) {
                    logger.error('Web search failed, continuing without search results', error);
                    citations = [];
                }
            }
            const messages = [
                {
                    role: 'user',
                    content: data.message + webSearchContext,
                },
            ];
            const response = await aiService.generateResponse(data.providerId, data.model, messages, {
                onToken: (token) => {
                    mainWindow.webContents.send('chat:token', {
                        conversationId,
                        token,
                    });
                },
            });
            const assistantMessage = await addMessage({
                conversation_id: conversationId,
                role: 'assistant',
                content: response,
                provider_id: data.providerId,
                model: data.model,
            }, orm);
            if (citations.length > 0) {
                const citationsWithMessageId = citations.map((c) => ({
                    ...c,
                    message_id: assistantMessage.id,
                }));
                await addCitations(citationsWithMessageId, orm);
            }
            return {
                conversationId,
                messageId: assistantMessage.id,
                response,
            };
        }
        catch (error) {
            logger.error('chat:send failed', error);
            throw error;
        }
    };
    handlers['chat:summarizeNote'] = async (data) => {
        try {
            logger.info('IPC: chat:summarizeNote', { noteId: data.noteId });
            const note = await getNoteById(data.noteId, orm, false);
            if (!note) {
                throw new Error(`Note with id ${data.noteId} not found`);
            }
            const messages = [
                {
                    role: 'system',
                    content: 'Summarize the following note concisely:',
                },
                {
                    role: 'user',
                    content: `Title: ${note.title}\n\n${note.body}`,
                },
            ];
            const summary = await aiService.generateResponse('claude', 'claude-sonnet-4', messages, {
                onToken: () => { },
            });
            return { summary };
        }
        catch (error) {
            logger.error('chat:summarizeNote failed', error);
            throw error;
        }
    };
    handlers['conversation:getAll'] = async () => {
        try {
            logger.info('IPC: conversation:getAll');
            const conversations = await getAllConversations(orm);
            return conversations;
        }
        catch (error) {
            logger.error('conversation:getAll failed', error);
            throw error;
        }
    };
    handlers['conversation:create'] = async (data) => {
        try {
            logger.info('IPC: conversation:create', { title: data.title });
            const conversation = await createConversation({ title: data.title }, orm);
            return conversation;
        }
        catch (error) {
            logger.error('conversation:create failed', error);
            throw error;
        }
    };
    handlers['conversation:get'] = async (data) => {
        try {
            logger.info('IPC: conversation:get', { conversationId: data.conversationId });
            const conversation = await getConversation(data.conversationId, orm);
            return conversation;
        }
        catch (error) {
            logger.error('conversation:get failed', error);
            throw error;
        }
    };
    handlers['conversation:delete'] = async (data) => {
        try {
            logger.info('IPC: conversation:delete', { conversationId: data.conversationId });
            await deleteConversation(data.conversationId, orm);
            return { success: true };
        }
        catch (error) {
            logger.error('conversation:delete failed', error);
            throw error;
        }
    };
    handlers['provider:setConfig'] = async (data) => {
        try {
            logger.info('IPC: provider:setConfig', { providerId: data.id });
            await setProviderConfig(data);
            return { success: true };
        }
        catch (error) {
            logger.error('provider:setConfig failed', error);
            throw error;
        }
    };
    handlers['provider:getConfig'] = async (data) => {
        try {
            logger.info('IPC: provider:getConfig', { providerId: data.providerId });
            const config = await getProviderConfig(data.providerId);
            return config;
        }
        catch (error) {
            logger.error('provider:getConfig failed', error);
            throw error;
        }
    };
    handlers['provider:getAllConfigs'] = async () => {
        try {
            logger.info('IPC: provider:getAllConfigs');
            const configs = await getAllProviderConfigs();
            return configs;
        }
        catch (error) {
            logger.error('provider:getAllConfigs failed', error);
            throw error;
        }
    };
    handlers['provider:deleteConfig'] = async (data) => {
        try {
            logger.info('IPC: provider:deleteConfig', { providerId: data.providerId });
            await deleteProviderConfig(data.providerId);
            return { success: true };
        }
        catch (error) {
            logger.error('provider:deleteConfig failed', error);
            throw error;
        }
    };
    handlers['provider:validate'] = async (data) => {
        try {
            logger.info('IPC: provider:validate', { providerId: data.providerId });
            const { ClaudeProvider } = await import('../services/ai/providers/claude.provider');
            const { OpenAIProvider } = await import('../services/ai/providers/openai.provider');
            const { DeepSeekProvider } = await import('../services/ai/providers/deepseek.provider');
            let provider;
            switch (data.providerId) {
                case 'claude':
                    provider = new ClaudeProvider(data.apiKey, data.baseURL);
                    break;
                case 'openai':
                    provider = new OpenAIProvider(data.apiKey, data.baseURL);
                    break;
                case 'deepseek':
                    provider = new DeepSeekProvider(data.apiKey, data.baseURL);
                    break;
                default:
                    throw new Error(`Unknown provider: ${data.providerId}`);
            }
            const result = await provider.validateApiKey(data.apiKey, data.baseURL);
            return result;
        }
        catch (error) {
            logger.error('provider:validate failed', error);
            throw error;
        }
    };
    Object.entries(handlers).forEach(([channel, handler]) => {
        ipcMain.handle(channel, async (event, data) => handler(data));
    });
    logger.info('AI IPC handlers registered');
    return handlers;
}
