import { Server, Socket } from 'socket.io';
import { logger } from '../logger.js';
import { callClaude, callDeepSeek, callOpenAI } from '../services/ai/ai-chat.service.js';
import { loadProviderFromEnv } from '../store/env.store.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIChatData {
  conversationId: string;
  messages: ChatMessage[];
  providerId?: string;
  model?: string;
  researchMode?: boolean;
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
          researchMode: data.researchMode,
        });

        // Save user message to DB
        const { createMessage } = await import('../services/message.service.js');
        const userMessage = data.messages[data.messages.length - 1];
        if (userMessage.role === 'user') {
          await createMessage({
            conversation_id: data.conversationId,
            role: userMessage.role,
            content: userMessage.content,
          });
        }

        // Prepare tools for research mode
        let tools = undefined;
        let messagesToSend = data.messages;

        if (data.researchMode) {
          const { RESEARCH_TOOLS } = await import('../tools/research.tools.js');
          const { RESEARCH_SYSTEM_PROMPT } = await import('../prompts/research.system.js');
          tools = RESEARCH_TOOLS;

          // Add research system prompt
          messagesToSend = [
            { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
            ...data.messages.filter(m => m.role !== 'system')
          ];

          logger.info('Research mode enabled with tools:', tools.map(t => t.name));
        }

        // Call AI provider with streaming callback
        let response: string;
        const onProgress = (status: string) => {
          socket.emit('ai:progress', {
            conversationId: data.conversationId,
            status: status,
          });
        };

        switch (config.id) {
          case 'deepseek':
            response = await callDeepSeek(messagesToSend, config.apiKey, model, tools, onProgress);
            break;
          case 'claude':
            response = await callClaude(messagesToSend, config.apiKey, model, config.baseURL, tools, onProgress);
            break;
          case 'openai':
            response = await callOpenAI(messagesToSend, config.apiKey, model, config.baseURL, tools, onProgress);
            break;
          default:
            socket.emit('ai:error', {
              conversationId: data.conversationId,
              error: `Unsupported provider: ${config.id}`,
            });
            return;
        }

        // Save assistant message to DB
        await createMessage({
          conversation_id: data.conversationId,
          role: 'assistant',
          content: response,
          provider_id: config.id,
          model: model,
        });

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
