import { ipcMain } from 'electron';
import { logger } from '../logger.js';
import { loadProviderFromEnv, readEnv } from '../store/env.store.js';
import { createMessage, getMessagesByConversation } from '../services/message.service.js';
import { RESEARCH_SYSTEM_PROMPT } from '../prompts/research.system.js';
import { RESEARCH_TOOLS, executeToolCall } from '../tools/research.tools.js';
import { searchWeb } from '../services/web-search.service.js';
import { searchWithClaude, searchWithDeepSeek, searchWithOpenAI } from '../services/provider-search.service.js';
export async function callDeepSeek(messages, apiKey, model, tools, onProgress) {
    const env = readEnv();
    const tavilyApiKey = env.TAVILY_API_KEY;
    const webSearchFn = tavilyApiKey
        ? async (query) => await searchWeb(query, tavilyApiKey)
        : async (query) => await searchWithDeepSeek(query, apiKey);
    const requestBody = {
        model,
        messages,
        stream: false,
    };
    if (tools && tools.length > 0) {
        requestBody.tools = tools.map((tool) => ({
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
    const maxIterations = 10;
    let iteration = 0;
    const conversationMessages = [...messages];
    while (data.choices[0].message.tool_calls && iteration < maxIterations) {
        iteration++;
        logger.info(`Tool call iteration ${iteration}`);
        const assistantMessage = data.choices[0].message;
        conversationMessages.push(assistantMessage);
        for (const toolCall of assistantMessage.tool_calls) {
            logger.info(`Executing tool: ${toolCall.function.name}`, toolCall.function.arguments);
            if (onProgress) {
                onProgress(`Executing: ${toolCall.function.name}...`);
            }
            try {
                const args = JSON.parse(toolCall.function.arguments);
                const env = readEnv();
                const tavilyApiKey = env.TAVILY_API_KEY;
                const webSearchFn = tavilyApiKey
                    ? async (query) => await searchWeb(query, tavilyApiKey)
                    : undefined;
                const result = await executeToolCall(toolCall.function.name, args, webSearchFn);
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });
            }
            catch (error) {
                logger.error(`Tool execution failed: ${toolCall.function.name}`, error);
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: `Error: ${error.message}`,
                });
            }
        }
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
export async function callClaude(messages, apiKey, model, baseURL, tools, onProgress) {
    const env = readEnv();
    const tavilyApiKey = env.TAVILY_API_KEY;
    const webSearchFn = tavilyApiKey
        ? async (query) => await searchWeb(query, tavilyApiKey)
        : async (query) => await searchWithClaude(query, apiKey, baseURL);
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const url = baseURL ? `${baseURL}/v1/messages` : 'https://api.anthropic.com/v1/messages';
    const requestBody = {
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
    const maxIterations = 10;
    let iteration = 0;
    while (data.stop_reason === 'tool_use' && iteration < maxIterations) {
        iteration++;
        logger.info(`Tool use iteration ${iteration}`, { stopReason: data.stop_reason });
        const toolUseBlocks = data.content.filter((block) => block.type === 'tool_use');
        const textBlocks = data.content.filter((block) => block.type === 'text');
        logger.info(`Found ${toolUseBlocks.length} tool calls`, {
            tools: toolUseBlocks.map((t) => t.name)
        });
        const toolResults = [];
        for (const toolUse of toolUseBlocks) {
            logger.info(`Executing tool: ${toolUse.name}`, { input: toolUse.input });
            if (onProgress) {
                onProgress(`Executing: ${toolUse.name}...`);
            }
            try {
                const env = readEnv();
                const tavilyApiKey = env.TAVILY_API_KEY;
                const webSearchFn = tavilyApiKey
                    ? async (query) => await searchWeb(query, tavilyApiKey)
                    : async (query) => await searchWithClaude(query, apiKey, baseURL);
                const result = await executeToolCall(toolUse.name, toolUse.input, webSearchFn);
                logger.info(`Tool ${toolUse.name} succeeded`, { resultLength: JSON.stringify(result).length });
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: JSON.stringify(result),
                });
            }
            catch (error) {
                logger.error(`Tool execution failed: ${toolUse.name}`, error);
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: `Error: ${error.message}`,
                    is_error: true,
                });
            }
        }
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
    const textContent = data.content.find((block) => block.type === 'text');
    return textContent?.text || '';
}
export async function callOpenAI(messages, apiKey, model, baseURL, tools, onProgress) {
    const env = readEnv();
    const tavilyApiKey = env.TAVILY_API_KEY;
    const webSearchFn = tavilyApiKey
        ? async (query) => await searchWeb(query, tavilyApiKey)
        : async (query) => await searchWithOpenAI(query, apiKey, baseURL);
    const url = baseURL ? `${baseURL}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const requestBody = {
        model,
        messages,
        stream: false,
    };
    if (tools && tools.length > 0) {
        requestBody.tools = tools.map((tool) => ({
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
    const maxIterations = 10;
    let iteration = 0;
    const conversationMessages = [...messages];
    while (data.choices[0].message.tool_calls && iteration < maxIterations) {
        iteration++;
        logger.info(`Tool call iteration ${iteration}`);
        const assistantMessage = data.choices[0].message;
        conversationMessages.push(assistantMessage);
        for (const toolCall of assistantMessage.tool_calls) {
            logger.info(`Executing tool: ${toolCall.function.name}`, toolCall.function.arguments);
            if (onProgress) {
                onProgress(`Executing: ${toolCall.function.name}...`);
            }
            try {
                const args = JSON.parse(toolCall.function.arguments);
                const env = readEnv();
                const tavilyApiKey = env.TAVILY_API_KEY;
                const webSearchFn = tavilyApiKey
                    ? async (query) => await searchWeb(query, tavilyApiKey)
                    : undefined;
                const result = await executeToolCall(toolCall.function.name, args, webSearchFn);
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });
            }
            catch (error) {
                logger.error(`Tool execution failed: ${toolCall.function.name}`, error);
                conversationMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: `Error: ${error.message}`,
                });
            }
        }
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
export function registerAIHandlers(mainWindow) {
    ipcMain.handle('ai:chat', async (event, request) => {
        try {
            logger.info('IPC: ai:chat', {
                conversationId: request.conversationId,
                messageCount: request.messages.length,
                providerId: request.providerId,
                model: request.model,
                researchMode: request.researchMode
            });
            const providerId = request.providerId || 'deepseek';
            const config = loadProviderFromEnv(providerId);
            if (!config) {
                throw new Error(`Provider ${providerId} not configured. Please add API key in Settings.`);
            }
            const model = request.model || config.model;
            logger.info('Using provider:', {
                id: config.id,
                model: model,
                hasApiKey: !!config.apiKey
            });
            const userMessage = request.messages[request.messages.length - 1];
            if (userMessage.role === 'user') {
                await createMessage({
                    conversation_id: request.conversationId,
                    role: userMessage.role,
                    content: userMessage.content,
                });
            }
            let messagesToSend = [...request.messages];
            let tools = undefined;
            if (request.researchMode) {
                logger.info('Research mode enabled - adding system prompt and tools');
                messagesToSend = [
                    { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
                    ...request.messages.filter(m => m.role !== 'system')
                ];
                tools = RESEARCH_TOOLS;
                logger.info('Tools configured:', { toolCount: tools.length, toolNames: tools.map(t => t.name) });
            }
            const onProgress = (status) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ai:progress', {
                        conversationId: request.conversationId,
                        status
                    });
                }
            };
            let response;
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
            await createMessage({
                conversation_id: request.conversationId,
                role: 'assistant',
                content: response,
                provider_id: config.id,
                model: model,
            });
            return { success: true, content: response };
        }
        catch (error) {
            logger.error('ai:chat failed', error);
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('ai:getMessages', async (event, data) => {
        try {
            logger.info('IPC: ai:getMessages', { conversationId: data.conversationId });
            const msgs = await getMessagesByConversation(data.conversationId);
            return { success: true, messages: msgs };
        }
        catch (error) {
            logger.error('ai:getMessages failed', error);
            return { success: false, error: error.message };
        }
    });
    logger.info('AI IPC handlers registered');
}
