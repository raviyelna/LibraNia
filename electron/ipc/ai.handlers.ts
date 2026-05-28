import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../logger';
import { loadProviderFromEnv } from '../store/env.store';
import { createMessage, getMessagesByConversation } from '../services/message.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  conversationId: string;
  messages: ChatMessage[];
  providerId?: string;
  model?: string;
}

async function callDeepSeek(messages: ChatMessage[], apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(messages: ChatMessage[], apiKey: string, model: string, baseURL?: string): Promise<string> {
  // Extract system message if present
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const url = baseURL ? `${baseURL}/v1/messages` : 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: conversationMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(messages: ChatMessage[], apiKey: string, model: string, baseURL?: string): Promise<string> {
  const url = baseURL ? `${baseURL}/chat/completions` : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export function registerAIHandlers(mainWindow?: BrowserWindow) {
  ipcMain.handle('ai:chat', async (event, request: ChatRequest) => {
    try {
      logger.info('IPC: ai:chat', {
        conversationId: request.conversationId,
        messageCount: request.messages.length,
        providerId: request.providerId,
        model: request.model
      });

      // Determine provider
      const providerId = request.providerId || 'deepseek';
      const config = loadProviderFromEnv(providerId);

      if (!config) {
        throw new Error(`Provider ${providerId} not configured. Please add API key in Settings.`);
      }

      // Use model from request or fall back to config
      const model = request.model || config.model;

      logger.info('Using provider:', {
        id: config.id,
        model: model,
        hasApiKey: !!config.apiKey
      });

      // Save user message to DB
      const userMessage = request.messages[request.messages.length - 1];
      if (userMessage.role === 'user') {
        await createMessage({
          conversation_id: request.conversationId,
          role: userMessage.role,
          content: userMessage.content,
        });
      }

      // Call appropriate API
      let response: string;
      switch (config.id) {
        case 'deepseek':
          response = await callDeepSeek(request.messages, config.apiKey, model);
          break;
        case 'claude':
          response = await callClaude(request.messages, config.apiKey, model, config.baseURL);
          break;
        case 'openai':
          response = await callOpenAI(request.messages, config.apiKey, model, config.baseURL);
          break;
        default:
          throw new Error(`Unsupported provider: ${config.id}`);
      }

      logger.info('AI response received', { length: response.length });

      // Save assistant message to DB
      await createMessage({
        conversation_id: request.conversationId,
        role: 'assistant',
        content: response,
        provider_id: config.id,
        model: model,
      });

      return { success: true, content: response };

    } catch (error: any) {
      logger.error('ai:chat failed', error);
      return { success: false, error: error.message };
    }
  });

  // Get messages for a conversation
  ipcMain.handle('ai:getMessages', async (event, data: { conversationId: string }) => {
    try {
      logger.info('IPC: ai:getMessages', { conversationId: data.conversationId });
      const msgs = await getMessagesByConversation(data.conversationId);
      return { success: true, messages: msgs };
    } catch (error: any) {
      logger.error('ai:getMessages failed', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('AI IPC handlers registered');
}
