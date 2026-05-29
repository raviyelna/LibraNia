import { Server, Socket } from 'socket.io';
import { logger } from '../logger';
import { callClaude, callDeepSeek, callOpenAI } from '../ipc/ai.handlers';
import { loadProviderFromEnv } from '../store/env.store';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIChatData {
  conversationId: string;
  messages: ChatMessage[];
  providerId?: string;
  model?: string;
}

interface GraphSubscribeData {
  graphId: string;
}

/**
 * Setup Socket.IO event handlers for AI streaming and graph updates
 * @param io Socket.IO server instance
 */
export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id });

    // Handle AI chat streaming
    socket.on('ai:chat', async (data: AIChatData) => {
      try {
        logger.info('WebSocket: ai:chat', {
          socketId: socket.id,
          conversationId: data.conversationId,
          messageCount: data.messages?.length,
          providerId: data.providerId,
        });

        // Validate required fields
        if (!data.conversationId || !data.messages || !Array.isArray(data.messages)) {
          socket.emit('ai:error', {
            conversationId: data.conversationId,
            error: 'Missing required fields: conversationId, messages (array)',
          });
          return;
        }

        // Determine provider
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

        // Call AI provider with streaming callback
        let response: string;
        const onProgress = (status: string) => {
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

        // Emit completion event
        socket.emit('ai:complete', {
          conversationId: data.conversationId,
          content: response,
        });

        logger.info('AI streaming complete', {
          conversationId: data.conversationId,
          responseLength: response.length,
        });
      } catch (error: any) {
        logger.error('ai:chat WebSocket handler failed', error);
        socket.emit('ai:error', {
          conversationId: data.conversationId,
          error: error.message,
        });
      }
    });

    // Handle graph subscription
    socket.on('graph:subscribe', (data: GraphSubscribeData) => {
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
      } catch (error: any) {
        logger.error('graph:subscribe failed', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', { socketId: socket.id });
    });
  });

  logger.info('Socket.IO handlers registered');
}

/**
 * Emit graph update to all subscribed clients
 * @param io Socket.IO server instance
 * @param graphId Graph identifier
 * @param update Update data to emit
 */
export function emitGraphUpdate(io: Server, graphId: string, update: any): void {
  const roomName = `graph:${graphId}`;
  io.to(roomName).emit('graph:updated', update);
  logger.info('Graph update emitted', { graphId, room: roomName });
}
