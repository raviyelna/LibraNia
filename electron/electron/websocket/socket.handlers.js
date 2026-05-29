import { logger } from '../logger';
import { callClaude, callDeepSeek, callOpenAI } from '../ipc/ai.handlers';
import { loadProviderFromEnv } from '../store/env.store';
export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        logger.info('WebSocket client connected', { socketId: socket.id });
        socket.on('ai:chat', async (data) => {
            try {
                logger.info('WebSocket: ai:chat', {
                    socketId: socket.id,
                    conversationId: data.conversationId,
                    messageCount: data.messages?.length,
                    providerId: data.providerId,
                });
                if (!data.conversationId || !data.messages || !Array.isArray(data.messages)) {
                    socket.emit('ai:error', {
                        conversationId: data.conversationId,
                        error: 'Missing required fields: conversationId, messages (array)',
                    });
                    return;
                }
                const providerId = data.providerId || 'deepseek';
                const config = loadProviderFromEnv(providerId);
                if (!config) {
                    socket.emit('ai:error', {
                        conversationId: data.conversationId,
                        error: `Provider ${providerId} not configured. Please add API key in Settings.`,
                    });
                    return;
                }
                const model = data.model || config.model;
                logger.info('Using provider for streaming:', {
                    id: config.id,
                    model: model,
                    hasApiKey: !!config.apiKey,
                });
                let response;
                const onProgress = (status) => {
                    socket.emit('ai:token', {
                        conversationId: data.conversationId,
                        token: status,
                    });
                };
                switch (config.id) {
                    case 'deepseek':
                        response = await callDeepSeek(data.messages, config.apiKey, model, undefined, onProgress);
                        break;
                    case 'claude':
                        response = await callClaude(data.messages, config.apiKey, model, config.baseURL, undefined, onProgress);
                        break;
                    case 'openai':
                        response = await callOpenAI(data.messages, config.apiKey, model, config.baseURL, undefined, onProgress);
                        break;
                    default:
                        socket.emit('ai:error', {
                            conversationId: data.conversationId,
                            error: `Unsupported provider: ${config.id}`,
                        });
                        return;
                }
                socket.emit('ai:complete', {
                    conversationId: data.conversationId,
                    content: response,
                });
                logger.info('AI streaming complete', {
                    conversationId: data.conversationId,
                    responseLength: response.length,
                });
            }
            catch (error) {
                logger.error('ai:chat WebSocket handler failed', error);
                socket.emit('ai:error', {
                    conversationId: data.conversationId,
                    error: error.message,
                });
            }
        });
        socket.on('graph:subscribe', (data) => {
            try {
                logger.info('WebSocket: graph:subscribe', {
                    socketId: socket.id,
                    graphId: data.graphId,
                });
                const roomName = `graph:${data.graphId}`;
                socket.join(roomName);
                logger.info('Client joined graph room', {
                    socketId: socket.id,
                    room: roomName,
                });
            }
            catch (error) {
                logger.error('graph:subscribe failed', error);
            }
        });
        socket.on('disconnect', () => {
            logger.info('WebSocket client disconnected', { socketId: socket.id });
        });
    });
    logger.info('Socket.IO handlers registered');
}
export function emitGraphUpdate(io, graphId, update) {
    const roomName = `graph:${graphId}`;
    io.to(roomName).emit('graph:updated', update);
    logger.info('Graph update emitted', { graphId, room: roomName });
}
