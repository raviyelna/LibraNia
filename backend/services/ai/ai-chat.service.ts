import { logger } from '../../logger.js';
import { loadProviderFromEnv, readEnv } from '../../store/env.store.js';
import { createMessage, getMessagesByConversation } from '../message.service.js';
import { autoGenerateTitle } from '../conversation-title.service.js';
import { getORM } from '../../database/connection.js';
import { RESEARCH_SYSTEM_PROMPT } from '../../prompts/research.system.js';
import { RESEARCH_TOOLS, executeToolCall, type ResearchToolContext } from '../../tools/research.tools.js';
import { searchWeb } from '../web-search.service.js';
import { searchWithClaude, searchWithDeepSeek, searchWithOpenAI } from '../provider-search.service.js';
import { randomUUID } from 'crypto';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  conversationId: string;
  messages: ChatMessage[];
  providerId?: string;
  model?: string;
  researchMode?: boolean;
  systemContext?: string;
  readOnlyResearch?: boolean;
}

const MAX_TOOL_ITERATIONS = 10;
const MAX_WEB_SEARCH_CALLS = 3;
const FINAL_SYNTHESIS_PROMPT =
  'Tool use is complete. Answer the user now using the information already gathered. ' +
  'Do not request more tools. Be concise, factual, and include useful source links when available.';
const WEB_SEARCH_COMPLETE_PROMPT =
  'Web search is complete. Do not request more web searches. Use the gathered results, ' +
  'write back useful knowledge with note and tag tools when appropriate, then answer the user.';

interface ToolBudget {
  webSearchCalls: number;
}

function consumeToolBudget(toolName: string, budget: ToolBudget): string | null {
  if (toolName !== 'web_search') return null;

  if (budget.webSearchCalls >= MAX_WEB_SEARCH_CALLS) {
    return `Web search budget exhausted after ${MAX_WEB_SEARCH_CALLS} searches. Synthesize the final answer from existing results.`;
  }

  budget.webSearchCalls++;
  return null;
}

function shouldForceFinalAnswer(iteration: number): boolean {
  return iteration >= MAX_TOOL_ITERATIONS;
}

function getAvailableOpenAITools(tools: any[] | undefined, budget: ToolBudget): any[] | undefined {
  if (budget.webSearchCalls < MAX_WEB_SEARCH_CALLS) return tools;
  return tools?.filter((tool: any) => tool.function?.name !== 'web_search');
}

function getAvailableClaudeTools(tools: any[] | undefined, budget: ToolBudget): any[] | undefined {
  if (budget.webSearchCalls < MAX_WEB_SEARCH_CALLS) return tools;
  return tools?.filter((tool: any) => tool.name !== 'web_search');
}

function getChatCompletionsUrl(baseURL?: string): string {
  const normalizedBaseURL = (baseURL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  return normalizedBaseURL.endsWith('/v1')
    ? `${normalizedBaseURL}/chat/completions`
    : `${normalizedBaseURL}/v1/chat/completions`;
}

function parseDSMLToolCalls(content: unknown): any[] {
  if (typeof content !== 'string' || !content.includes('｜｜DSML｜｜tool_calls')) {
    return [];
  }

  const toolCalls = [];
  const invokePattern = /<｜｜DSML｜｜invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/｜｜DSML｜｜invoke>/g;
  let invokeMatch;

  while ((invokeMatch = invokePattern.exec(content)) !== null) {
    const args: Record<string, any> = {};
    const parameterPattern = /<｜｜DSML｜｜parameter\s+name="([^"]+)"(?:\s+string="([^"]+)")?\s*>([\s\S]*?)<\/｜｜DSML｜｜parameter>/g;
    let parameterMatch;

    while ((parameterMatch = parameterPattern.exec(invokeMatch[2])) !== null) {
      const [, name, stringFlag, rawValue] = parameterMatch;
      const value = rawValue.trim();

      if (stringFlag === 'true') {
        args[name] = value;
        continue;
      }

      try {
        args[name] = JSON.parse(value);
      } catch {
        args[name] = value;
      }
    }

    toolCalls.push({
      id: `dsml-call-${randomUUID()}`,
      type: 'function',
      function: {
        name: invokeMatch[1],
        arguments: JSON.stringify(args),
      },
    });
  }

  return toolCalls;
}

function getOpenAICompatibleMessage(data: any, providerName: string): any {
  const message = data?.choices?.[0]?.message;

  if (!message) {
    throw new Error(`${providerName} API returned no completion message.`);
  }

  if (!message.tool_calls) {
    const dsmlToolCalls = parseDSMLToolCalls(message.content);

    if (dsmlToolCalls.length > 0) {
      return {
        ...message,
        content: null,
        tool_calls: dsmlToolCalls,
      };
    }
  }

  return message;
}

function getOpenAICompatibleText(data: any, providerName: string): string {
  const message = getOpenAICompatibleMessage(data, providerName);
  const content = message.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content
          .map((part: any) => typeof part === 'string' ? part : part?.text || '')
          .join('')
      : '';

  if (!text.trim()) {
    const finishReason = data?.choices?.[0]?.finish_reason;
    const reasoningOnly = !!message.reasoning_content;
    throw new Error(
      `${providerName} API returned an empty final answer` +
      `${finishReason ? ` (finish_reason: ${finishReason})` : ''}` +
      `${reasoningOnly ? '. The model returned reasoning but no final content.' : '.'}`
    );
  }

  return text;
}

export async function callDeepSeek(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  baseURL?: string,
  tools?: any[],
  onProgress?: (status: string) => void
): Promise<string> {
  // Create web search function
  const env = readEnv();
  const tavilyApiKey = env.TAVILY_API_KEY;
  const webSearchFn = tavilyApiKey
    ? async (query: string) => await searchWeb(query, tavilyApiKey)
    : async (query: string) => await searchWithDeepSeek(query, apiKey);

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

  const url = getChatCompletionsUrl(baseURL);

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
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  let data = await response.json();

  // Handle tool calls loop (same as OpenAI)
  let iteration = 0;
  const toolBudget: ToolBudget = { webSearchCalls: 0 };
  const toolContext: ResearchToolContext = { pendingImageUrls: [] };
  const conversationMessages = [...messages];

  while (getOpenAICompatibleMessage(data, 'DeepSeek').tool_calls && iteration < MAX_TOOL_ITERATIONS) {
    iteration++;
    logger.info(`Tool call iteration ${iteration}`);

    const assistantMessage = getOpenAICompatibleMessage(data, 'DeepSeek');
    conversationMessages.push(assistantMessage);

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      logger.info(`Executing tool: ${toolCall.function.name}`, toolCall.function.arguments);
      if (onProgress) {
        onProgress(`Executing: ${toolCall.function.name}...`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const budgetError = consumeToolBudget(toolCall.function.name, toolBudget);

        if (budgetError) {
          throw new Error(budgetError);
        }

        // Create web search function if API key available
        const env = readEnv();
        const tavilyApiKey = env.TAVILY_API_KEY;
        const webSearchFn = tavilyApiKey
          ? async (query: string) => await searchWeb(query, tavilyApiKey)
          : undefined;

        const result = await executeToolCall(toolCall.function.name, args, webSearchFn, toolContext);
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

    const forceFinalAnswer = shouldForceFinalAnswer(iteration);
    const continuationMessages = [...conversationMessages];

    if (forceFinalAnswer) {
      continuationMessages.push({ role: 'system', content: FINAL_SYNTHESIS_PROMPT });
    } else if (toolBudget.webSearchCalls >= MAX_WEB_SEARCH_CALLS) {
      continuationMessages.push({ role: 'system', content: WEB_SEARCH_COMPLETE_PROMPT });
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
        messages: continuationMessages,
        tools: forceFinalAnswer ? undefined : getAvailableOpenAITools(requestBody.tools, toolBudget),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${error}`);
    }

    data = await response.json();

    if (forceFinalAnswer) {
      return getOpenAICompatibleText(data, 'DeepSeek');
    }
  }

  if (getOpenAICompatibleMessage(data, 'DeepSeek').tool_calls) {
    throw new Error(`DeepSeek API exceeded the ${MAX_TOOL_ITERATIONS}-iteration tool-call limit.`);
  }

  return getOpenAICompatibleText(data, 'DeepSeek');
}

export async function callClaude(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  baseURL?: string,
  tools?: any[],
  onProgress?: (status: string) => void
): Promise<string> {
  // Create web search function
  const env = readEnv();
  const tavilyApiKey = env.TAVILY_API_KEY;
  const webSearchFn = tavilyApiKey
    ? async (query: string) => await searchWeb(query, tavilyApiKey)
    : async (query: string) => await searchWithClaude(query, apiKey, baseURL);

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
  let iteration = 0;
  const toolBudget: ToolBudget = { webSearchCalls: 0 };
  const toolContext: ResearchToolContext = { pendingImageUrls: [] };
  while (data.stop_reason === 'tool_use' && iteration < MAX_TOOL_ITERATIONS) {
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
        const budgetError = consumeToolBudget(toolUse.name, toolBudget);

        if (budgetError) {
          throw new Error(budgetError);
        }

        // Create web search function if API key available
        const env = readEnv();
        const tavilyApiKey = env.TAVILY_API_KEY;
        const webSearchFn = tavilyApiKey
          ? async (query: string) => await searchWeb(query, tavilyApiKey)
          : async (query: string) => await searchWithClaude(query, apiKey, baseURL);

        const result = await executeToolCall(toolUse.name, toolUse.input, webSearchFn, toolContext);
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
    const forceFinalAnswer = shouldForceFinalAnswer(iteration);
    conversationMessages.push({
      role: 'user',
      content: JSON.stringify(toolResults) +
        (forceFinalAnswer
          ? `\n\n${FINAL_SYNTHESIS_PROMPT}`
          : toolBudget.webSearchCalls >= MAX_WEB_SEARCH_CALLS
            ? `\n\n${WEB_SEARCH_COMPLETE_PROMPT}`
            : ''),
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
        tools: forceFinalAnswer ? undefined : getAvailableClaudeTools(tools, toolBudget),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    data = await response.json();

    if (forceFinalAnswer) {
      const textContent = data.content.find((block: any) => block.type === 'text');
      return textContent?.text || '';
    }
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
  onProgress?: (status: string) => void,
  customHeaders?: Record<string, string>
): Promise<string> {
  // Create web search function
  const env = readEnv();
  const tavilyApiKey = env.TAVILY_API_KEY;
  const webSearchFn = tavilyApiKey
    ? async (query: string) => await searchWeb(query, tavilyApiKey)
    : async (query: string) => await searchWithOpenAI(query, apiKey, baseURL);

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
      ...customHeaders,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  let data = await response.json();

  // Handle tool calls loop
  let iteration = 0;
  const toolBudget: ToolBudget = { webSearchCalls: 0 };
  const toolContext: ResearchToolContext = { pendingImageUrls: [] };
  const conversationMessages = [...messages];

  while (getOpenAICompatibleMessage(data, 'OpenAI').tool_calls && iteration < MAX_TOOL_ITERATIONS) {
    iteration++;
    logger.info(`Tool call iteration ${iteration}`);

    const assistantMessage = getOpenAICompatibleMessage(data, 'OpenAI');
    conversationMessages.push(assistantMessage);

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      logger.info(`Executing tool: ${toolCall.function.name}`, toolCall.function.arguments);
      if (onProgress) {
        onProgress(`Executing: ${toolCall.function.name}...`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const budgetError = consumeToolBudget(toolCall.function.name, toolBudget);

        if (budgetError) {
          throw new Error(budgetError);
        }

        // Create web search function if API key available
        const env = readEnv();
        const tavilyApiKey = env.TAVILY_API_KEY;
        const webSearchFn = tavilyApiKey
          ? async (query: string) => await searchWeb(query, tavilyApiKey)
          : undefined;

        const result = await executeToolCall(toolCall.function.name, args, webSearchFn, toolContext);
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

    const forceFinalAnswer = shouldForceFinalAnswer(iteration);
    const continuationMessages = [...conversationMessages];

    if (forceFinalAnswer) {
      continuationMessages.push({ role: 'system', content: FINAL_SYNTHESIS_PROMPT });
    } else if (toolBudget.webSearchCalls >= MAX_WEB_SEARCH_CALLS) {
      continuationMessages.push({ role: 'system', content: WEB_SEARCH_COMPLETE_PROMPT });
    }

    // Continue conversation
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...customHeaders,
      },
      body: JSON.stringify({
        model,
        messages: continuationMessages,
        tools: forceFinalAnswer ? undefined : getAvailableOpenAITools(requestBody.tools, toolBudget),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    data = await response.json();

    if (forceFinalAnswer) {
      return getOpenAICompatibleText(data, 'OpenAI');
    }
  }

  if (getOpenAICompatibleMessage(data, 'OpenAI').tool_calls) {
    throw new Error(`OpenAI API exceeded the ${MAX_TOOL_ITERATIONS}-iteration tool-call limit.`);
  }

  return getOpenAICompatibleText(data, 'OpenAI');
}

/**
 * Handle AI chat request - main entry point for chat functionality
 */
export async function handleAIChat(request: ChatRequest): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    logger.info('AI chat request', {
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
      logger.info('Research mode enabled - adding system prompt and tools');
      // Add research system prompt
      messagesToSend = [
        { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
        ...(request.systemContext ? [{ role: 'system' as const, content: request.systemContext }] : []),
        ...request.messages.filter(m => m.role !== 'system')
      ];
      tools = request.readOnlyResearch
        ? RESEARCH_TOOLS.filter(tool => tool.name !== 'create_note' && tool.name !== 'add_tags')
        : RESEARCH_TOOLS;
      logger.info('Tools configured:', { toolCount: tools.length, toolNames: tools.map(t => t.name) });
    } else if (request.systemContext) {
      messagesToSend = [
        { role: 'system', content: request.systemContext },
        ...request.messages.filter(m => m.role !== 'system'),
      ];
    }

    // Call appropriate API
    let response: string;
    switch (config.id) {
      case 'deepseek':
        response = await callDeepSeek(messagesToSend, config.apiKey, model, config.baseURL, tools);
        break;
      case 'claude':
        response = await callClaude(messagesToSend, config.apiKey, model, config.baseURL, tools);
        break;
      case 'openai':
        response = await callOpenAI(messagesToSend, config.apiKey, model, config.baseURL, tools);
        break;
      case 'custom':
        response = await callOpenAI(
          messagesToSend,
          config.apiKey,
          model,
          config.baseURL,
          tools,
          undefined,
          Object.fromEntries((config.customHeaders || []).map(header => [header.name, header.value]))
        );
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

    // Auto-generate title if conversation still has default title
    try {
      const db = getORM();
      const { conversations } = await import('../../database/schema.js');
      const { eq } = await import('drizzle-orm');

      console.log('[AI-Chat] Checking conversation title for:', request.conversationId);
      const conv = await db.query.conversations.findFirst({
        where: eq(conversations.id, request.conversationId),
      });

      console.log('[AI-Chat] Conversation found:', conv ? `title="${conv.title}"` : 'NOT FOUND');

      if (conv && conv.title === 'New Conversation') {
        const existingMessages = await getMessagesByConversation(request.conversationId);
        const firstUserMsg = existingMessages.find(m => m.role === 'user');
        if (firstUserMsg) {
          console.log('[AI-Chat] Triggering auto-title generation');
          autoGenerateTitle(request.conversationId, firstUserMsg.content, config.id).catch(err => {
            logger.error('Auto-title generation failed', err);
          });
        } else {
          console.log('[AI-Chat] No user message found');
        }
      } else {
        console.log('[AI-Chat] Skipping auto-title (already renamed or not found)');
      }
    } catch (err) {
      console.error('[AI-Chat] Auto-title check failed:', err);
    }

    return { success: true, content: response };

  } catch (error: any) {
    logger.error('AI chat failed', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  try {
    logger.info('Get conversation messages', { conversationId });
    const msgs = await getMessagesByConversation(conversationId);
    return { success: true, messages: msgs };
  } catch (error: any) {
    logger.error('Get messages failed', error);
    return { success: false, error: error.message };
  }
}
