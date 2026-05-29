import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../logger.js';
import { getORM } from '../database/connection.js';
import {
  createConversation,
  addMessage,
  addCitations,
  getConversation,
  getAllConversations,
  deleteConversation,
} from '../services/conversation.service.js';
import { getAIService } from '../services/ai/ai.service.js';
import { WebSearchService } from '../services/ai/websearch.service.js';
import { getNoteById } from '../services/notes.service.js';
import {
  setProviderConfig,
  getProviderConfig,
  getAllProviderConfigs,
  deleteProviderConfig,
  type ProviderConfig,
} from '../store/secure.store.js';

/**
 * Register IPC handlers for AI and chat operations
 * Called from main.ts after database initialization
 * @param mainWindow BrowserWindow instance for streaming tokens
 * @param webSearchService Optional WebSearchService instance (for testing)
 */
export function registerAIHandlers(
  mainWindow: BrowserWindow,
  webSearchService?: WebSearchService
) {
  const orm = getORM();
  const aiService = getAIService();
  const searchService = webSearchService || new WebSearchService();

  // For testing: return handlers object
  const handlers: Record<string, (data: any) => Promise<any>> = {};

  /**
   * chat:send - Send message and get AI response
   * Per D-12: parallel execution of web search + AI generation
   * Per D-02: streaming tokens via mainWindow.webContents.send
   * Per D-06, D-23: store provider_id and model metadata
   * Per D-19: store citations from web search
   */
  handlers['chat:send'] = async (data: {
    conversationId: string | null;
    message: string;
    providerId: string;
    model: string;
    useWebSearch: boolean;
  }) => {
    try {
      logger.info('IPC: chat:send', {
        conversationId: data.conversationId,
        providerId: data.providerId,
        useWebSearch: data.useWebSearch,
      });

      let conversationId = data.conversationId;

      // Create new conversation if needed (per D-11: auto-generate title from first 50 chars)
      if (!conversationId) {
        const title = data.message.slice(0, 50);
        const conversation = await createConversation({ title }, orm);
        conversationId = conversation.id;
      }

      // Add user message
      const userMessage = await addMessage(
        {
          conversation_id: conversationId,
          role: 'user',
          content: data.message,
        },
        orm
      );

      // Parallel execution: web search + AI generation per D-12
      let webSearchResults: any[] = [];
      let webSearchContext = '';
      let citations: any[] = [];

      if (data.useWebSearch) {
        try {
          // Run web search (per D-14: top 5 results, per D-22: 10s timeout)
          webSearchResults = await Promise.race([
            searchService.search(data.message, 5),
            new Promise<any[]>((_, reject) =>
              setTimeout(() => reject(new Error('Search timeout')), 10000)
            ),
          ]);

          // Format results for AI prompt per D-16
          webSearchContext = searchService.formatResultsForPrompt(webSearchResults);

          // Extract citations for storage per D-19
          citations = searchService.extractCitations(webSearchResults);
        } catch (error) {
          logger.error('Web search failed, continuing without search results', error as Error);
          // Continue with AI response even if search fails per D-22
          citations = []; // Ensure citations is always an array
        }
      }

      // Build messages array for AI
      const messages = [
        {
          role: 'user' as const,
          content: data.message + webSearchContext,
        },
      ];

      // Generate AI response with streaming per D-02
      const response = await aiService.generateResponse(
        data.providerId,
        data.model,
        messages,
        {
          onToken: (token: string) => {
            mainWindow.webContents.send('chat:token', {
              conversationId,
              token,
            });
          },
        }
      );

      // Add assistant message with provider metadata per D-06, D-23
      const assistantMessage = await addMessage(
        {
          conversation_id: conversationId,
          role: 'assistant',
          content: response,
          provider_id: data.providerId,
          model: data.model,
        },
        orm
      );

      // Store citations if web search was used per D-19
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
    } catch (error) {
      logger.error('chat:send failed', error as Error);
      throw error;
    }
  };

  /**
   * chat:summarizeNote - Generate summary of note content
   * Per AI-07: AI can generate summaries of notes
   */
  handlers['chat:summarizeNote'] = async (data: { noteId: string }) => {
    try {
      logger.info('IPC: chat:summarizeNote', { noteId: data.noteId });

      const note = await getNoteById(data.noteId, orm, false);
      if (!note) {
        throw new Error(`Note with id ${data.noteId} not found`);
      }

      // Create system prompt for summarization
      const messages = [
        {
          role: 'system' as const,
          content: 'Summarize the following note concisely:',
        },
        {
          role: 'user' as const,
          content: `Title: ${note.title}\n\n${note.body}`,
        },
      ];

      // Use default provider (claude) for summarization
      const summary = await aiService.generateResponse(
        'claude',
        'claude-sonnet-4',
        messages,
        {
          onToken: () => {}, // No streaming for summarization
        }
      );

      return { summary };
    } catch (error) {
      logger.error('chat:summarizeNote failed', error as Error);
      throw error;
    }
  };

  /**
   * conversation:getAll - Get all conversations
   */
  handlers['conversation:getAll'] = async () => {
    try {
      logger.info('IPC: conversation:getAll');
      const conversations = await getAllConversations(orm);
      return conversations;
    } catch (error) {
      logger.error('conversation:getAll failed', error as Error);
      throw error;
    }
  };

  /**
   * conversation:create - Create a new conversation
   */
  handlers['conversation:create'] = async (data: { title: string }) => {
    try {
      logger.info('IPC: conversation:create', { title: data.title });
      const conversation = await createConversation({ title: data.title }, orm);
      return conversation;
    } catch (error) {
      logger.error('conversation:create failed', error as Error);
      throw error;
    }
  };

  /**
   * conversation:get - Get conversation with messages and citations
   */
  handlers['conversation:get'] = async (data: { conversationId: string }) => {
    try {
      logger.info('IPC: conversation:get', { conversationId: data.conversationId });
      const conversation = await getConversation(data.conversationId, orm);
      return conversation;
    } catch (error) {
      logger.error('conversation:get failed', error as Error);
      throw error;
    }
  };

  /**
   * conversation:delete - Delete conversation
   */
  handlers['conversation:delete'] = async (data: { conversationId: string }) => {
    try {
      logger.info('IPC: conversation:delete', { conversationId: data.conversationId });
      await deleteConversation(data.conversationId, orm);
      return { success: true };
    } catch (error) {
      logger.error('conversation:delete failed', error as Error);
      throw error;
    }
  };

  /**
   * provider:setConfig - Save provider configuration
   * Per D-24: encrypted storage via electron-store
   */
  handlers['provider:setConfig'] = async (data: ProviderConfig) => {
    try {
      logger.info('IPC: provider:setConfig', { providerId: data.id });
      await setProviderConfig(data);
      return { success: true };
    } catch (error) {
      logger.error('provider:setConfig failed', error as Error);
      throw error;
    }
  };

  /**
   * provider:getConfig - Retrieve provider configuration
   */
  handlers['provider:getConfig'] = async (data: { providerId: string }) => {
    try {
      logger.info('IPC: provider:getConfig', { providerId: data.providerId });
      const config = await getProviderConfig(data.providerId);
      return config;
    } catch (error) {
      logger.error('provider:getConfig failed', error as Error);
      throw error;
    }
  };

  /**
   * provider:getAllConfigs - Get all provider configurations
   */
  handlers['provider:getAllConfigs'] = async () => {
    try {
      logger.info('IPC: provider:getAllConfigs');
      const configs = await getAllProviderConfigs();
      return configs;
    } catch (error) {
      logger.error('provider:getAllConfigs failed', error as Error);
      throw error;
    }
  };

  /**
   * provider:deleteConfig - Delete provider configuration
   */
  handlers['provider:deleteConfig'] = async (data: { providerId: string }) => {
    try {
      logger.info('IPC: provider:deleteConfig', { providerId: data.providerId });
      await deleteProviderConfig(data.providerId);
      return { success: true };
    } catch (error) {
      logger.error('provider:deleteConfig failed', error as Error);
      throw error;
    }
  };

  /**
   * provider:validate - Validate API key
   * Per D-05: validate API keys on save
   * Creates provider instance directly with provided credentials (not from stored config)
   */
  handlers['provider:validate'] = async (data: {
    providerId: string;
    apiKey: string;
    baseURL?: string;
  }) => {
    try {
      logger.info('IPC: provider:validate', { providerId: data.providerId });

      // Import provider classes directly for validation
      const { ClaudeProvider } = await import('../services/ai/providers/claude.provider');
      const { OpenAIProvider } = await import('../services/ai/providers/openai.provider');
      const { DeepSeekProvider } = await import('../services/ai/providers/deepseek.provider');

      // Create temporary provider instance with provided credentials
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
    } catch (error) {
      logger.error('provider:validate failed', error as Error);
      throw error;
    }
  };

  // Register all handlers with ipcMain
  Object.entries(handlers).forEach(([channel, handler]) => {
    ipcMain.handle(channel, async (event, data) => handler(data));
  });

  logger.info('AI IPC handlers registered');

  // Return handlers for testing
  return handlers;
}
