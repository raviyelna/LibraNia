import { Server, Socket } from 'socket.io';
import { logger } from '../logger.js';
import { callClaude, callDeepSeek, callOpenAI } from '../services/ai/ai-chat.service.js';
import { loadProviderFromEnv } from '../store/env.store.js';
import { generateContextSummary, getContextSummary } from '../services/conversation-context.service.js';

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

          // Get context summary for conversation continuity
          const contextSummary = await getContextSummary(data.conversationId);
          let systemPrompt = RESEARCH_SYSTEM_PROMPT;

          if (contextSummary) {
            systemPrompt += `\n\n## Previous Conversation Context\n\n${contextSummary}\n\nUse this context to understand what has been discussed before and maintain continuity.`;
          }

          // Add research system prompt with context
          messagesToSend = [
            { role: 'system', content: systemPrompt },
            ...data.messages.filter(m => m.role !== 'system')
          ];

          logger.info('Research mode enabled with tools:', tools.map(t => t.name));
          if (contextSummary) {
            logger.info('Loaded context summary:', contextSummary.substring(0, 100));
          }
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
            response = await callDeepSeek(messagesToSend, config.apiKey, model, config.baseURL, tools, onProgress);
            break;
          case 'claude':
            response = await callClaude(messagesToSend, config.apiKey, model, config.baseURL, tools, onProgress);
            break;
          case 'openai':
            response = await callOpenAI(messagesToSend, config.apiKey, model, config.baseURL, tools, onProgress);
            break;
          case 'custom':
            response = await callOpenAI(
              messagesToSend,
              config.apiKey,
              model,
              config.baseURL,
              tools,
              onProgress,
              Object.fromEntries((config.customHeaders || []).map(header => [header.name, header.value]))
            );
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

        // Auto-generate title if conversation still has default title
        try {
          const { getORM } = await import('../database/connection.js');
          const { conversations } = await import('../database/schema.js');
          const { eq } = await import('drizzle-orm');
          const { autoGenerateTitle } = await import('../services/conversation-title.service.js');
          const { getMessagesByConversation } = await import('../services/message.service.js');

          const db = getORM();
          console.log('[WebSocket] Checking conversation title for:', data.conversationId);
          const conv = await db.query.conversations.findFirst({
            where: eq(conversations.id, data.conversationId),
          });

          console.log('[WebSocket] Conversation found:', conv ? `title="${conv.title}"` : 'NOT FOUND');

          if (conv && conv.title === 'New Conversation') {
            const existingMessages = await getMessagesByConversation(data.conversationId);
            const firstUserMsg = existingMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
              console.log('[WebSocket] Triggering auto-title generation');
              autoGenerateTitle(data.conversationId, firstUserMsg.content, config.id).catch(err => {
                logger.error('Auto-title generation failed', err);
              });
            } else {
              console.log('[WebSocket] No user message found');
            }
          } else {
            console.log('[WebSocket] Skipping auto-title (already renamed or not found)');
          }
        } catch (err) {
          console.error('[WebSocket] Auto-title check failed:', err);
        }

        // Generate context summary for next conversation turn (hidden from user)
        try {
          console.log('[WebSocket] Generating context summary for conversation continuity');
          generateContextSummary(data.conversationId, config.id).catch(err => {
            logger.error('Context summary generation failed', err);
          });
        } catch (err) {
          console.error('[WebSocket] Context summary generation failed:', err);
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
