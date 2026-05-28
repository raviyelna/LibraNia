import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../logger';
import { loadProviderFromEnv } from '../store/env.store';
import { createMessage, getMessagesByConversation } from '../services/message.service';
import { RESEARCH_SYSTEM_PROMPT } from '../prompts/research.system';
import { RESEARCH_TOOLS, executeToolCall } from '../tools/research.tools';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  conversationId: string;
  messages: ChatMessage[];
  providerId?: string;
  model?: string;
  researchMode?: boolean;
}

export async function callDeepSeek(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  tools?: any[],
  onProgress?: (status: string) => void
): Promise<string> {
  const requestBody: any = {
    model,
    messages,
    stream: false,
  };

  if (tools && tools.length > 0) {
    // Convert Claude tool format to OpenAI function format (DeepSeek uses OpenAI format)
    requestBody.tools = tools.map((tool: any) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  let response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  let data = await response.json();

  // Handle tool calls loop (same as OpenAI)
  const maxIterations = 10;
  let iteration = 0;
  const conversationMessages = [...messages];

  while (data.choices[0].message.tool_calls && iteration < maxIterations) {
    iteration++;
    logger.info(`Tool call iteration ${iteration}`);

    const assistantMessage = data.choices[0].message;
    conversationMessages.push(assistantMessage);

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      logger.info(`Executing tool: ${toolCall.function.name}`, toolCall.function.arguments);
      if (onProgress) {
        onProgress(`Executing: ${toolCall.function.name}...`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(toolCall.function.name, args);
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        } as any);
      } catch (error: any) {
        logger.error(`Tool execution failed: ${toolCall.function.name}`, error);
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: ${error.message}`,
        } as any);
      }
    }

    // Continue conversation
    response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        tools: requestBody.tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${error}`);
    }

    data = await response.json();
  }

  return data.choices[0].message.content;
}

export async function callClaude(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  baseURL?: string,
  tools?: any[],
  onProgress?: (status: string) => void
): Promise<string> {
  // Extract system message if present
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const url = baseURL ? `${baseURL}/v1/messages` : 'https://api.anthropic.com/v1/messages';

  const requestBody: any = {
    model,
    max_tokens: 4096,
    system: systemMessage?.content,
    messages: conversationMessages,
  };

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} ${error}`);
  }

  let data = await response.json();

  // Handle tool use loop
  const maxIterations = 10;
  let iteration = 0;
  while (data.stop_reason === 'tool_use' && iteration < maxIterations) {
    iteration++;
    logger.info(`Tool use iteration ${iteration}`, { stopReason: data.stop_reason });

    // Extract tool calls
    const toolUseBlocks = data.content.filter((block: any) => block.type === 'tool_use');
    const textBlocks = data.content.filter((block: any) => block.type === 'text');

    logger.info(`Found ${toolUseBlocks.length} tool calls`, {
      tools: toolUseBlocks.map((t: any) => t.name)
    });

    // Execute tools
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      logger.info(`Executing tool: ${toolUse.name}`, { input: toolUse.input });
      if (onProgress) {
        onProgress(`Executing: ${toolUse.name}...`);
      }

      try {
        const result = await executeToolCall(toolUse.name, toolUse.input);
        logger.info(`Tool ${toolUse.name} succeeded`, { resultLength: JSON.stringify(result).length });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (error: any) {
        logger.error(`Tool execution failed: ${toolUse.name}`, error);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: ${error.message}`,
          is_error: true,
        });
      }
    }

    // Continue conversation with tool results
    conversationMessages.push({
      role: 'assistant',
      content: data.content,
    });
    conversationMessages.push({
      role: 'user',
      content: toolResults,
    });

    response = await fetch(url, {
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
        tools: tools,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    data = await response.json();
  }

  // Extract final text response
  const textContent = data.content.find((block: any) => block.type === 'text');
  return textContent?.text || '';
}

export async function callOpenAI(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  baseURL?: string,
  tools?: any[],
  onProgress?: (status: string) => void
): Promise<string> {
  const url = baseURL ? `${baseURL}/chat/completions` : 'https://api.openai.com/v1/chat/completions';

  const requestBody: any = {
    model,
    messages,
    stream: false,
  };

  if (tools && tools.length > 0) {
    // Convert Claude tool format to OpenAI function format
    requestBody.tools = tools.map((tool: any) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  let data = await response.json();

  // Handle tool calls loop
  const maxIterations = 10;
  let iteration = 0;
  const conversationMessages = [...messages];

  while (data.choices[0].message.tool_calls && iteration < maxIterations) {
    iteration++;
    logger.info(`Tool call iteration ${iteration}`);

    const assistantMessage = data.choices[0].message;
    conversationMessages.push(assistantMessage);

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      logger.info(`Executing tool: ${toolCall.function.name}`, toolCall.function.arguments);
      if (onProgress) {
        onProgress(`Executing: ${toolCall.function.name}...`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(toolCall.function.name, args);
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        } as any);
      } catch (error: any) {
        logger.error(`Tool execution failed: ${toolCall.function.name}`, error);
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: ${error.message}`,
        } as any);
      }
    }

    // Continue conversation
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        tools: requestBody.tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    data = await response.json();
  }

  return data.choices[0].message.content;
}

export function registerAIHandlers(mainWindow?: BrowserWindow) {
  ipcMain.handle('ai:chat', async (event, request: ChatRequest) => {
    try {
      logger.info('IPC: ai:chat', {
        conversationId: request.conversationId,
        messageCount: request.messages.length,
        providerId: request.providerId,
        model: request.model,
        researchMode: request.researchMode
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

      // Prepare messages with system prompt for research mode
      let messagesToSend = [...request.messages];
      let tools = undefined;

      if (request.researchMode) {
        // Add research system prompt
        messagesToSend = [
          { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
          ...request.messages.filter(m => m.role !== 'system')
        ];
        tools = RESEARCH_TOOLS;
      }

      // Progress callback for tool execution
      const onProgress = (status: string) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai:progress', {
            conversationId: request.conversationId,
            status
          });
        }
      };

      // Call appropriate API
      let response: string;
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
