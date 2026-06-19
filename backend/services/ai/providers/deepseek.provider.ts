import OpenAI from 'openai';
import type { AIProvider, Message, GenerateOptions } from './base.provider.js';

/**
 * DeepSeek provider implementation using OpenAI SDK with custom baseURL.
 * DeepSeek API is OpenAI-compatible per D-03.
 * Implements unified AIProvider interface per D-01.
 */
export class DeepSeekProvider implements AIProvider {
  name = 'deepseek';
  private client: OpenAI;
  private baseURL: string;

  /**
   * Create DeepSeek provider instance.
   *
   * @param apiKey - DeepSeek API key
   * @param baseURL - Custom base URL (defaults to DeepSeek API endpoint per D-03)
   */
  constructor(apiKey: string, baseURL: string = 'https://api.deepseek.com/v1') {
    this.baseURL = baseURL;
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  /**
   * Validate API key by making a minimal test request.
   * Per D-05: validate API keys on save for immediate feedback.
   *
   * @param apiKey - API key to validate
   * @param baseURL - Optional custom base URL
   * @returns true if valid, false otherwise
   */
  async validateApiKey(apiKey: string, baseURL?: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({
        apiKey,
        baseURL: baseURL || this.baseURL,
      });

      // Make minimal request to test API key
      await testClient.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate AI response with streaming support.
   * Per D-02: streaming responses deliver tokens incrementally.
   *
   * @param messages - Conversation history
   * @param options - Generation options
   * @param onToken - Callback for each streamed token
   * @returns Full response text
   */
  async generateResponse(
    messages: Message[],
    options: GenerateOptions,
    onToken: (token: string) => void
  ): Promise<string> {
    // Convert messages to OpenAI format (DeepSeek is OpenAI-compatible)
    const deepseekMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Create streaming request
    const stream = await this.client.chat.completions.create({
      model: options.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      messages: deepseekMessages,
      stream: true,
    });

    let fullResponse = '';

    // Iterate through stream chunks
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullResponse += token;
        onToken(token);
      }
    }

    return fullResponse;
  }

  /**
   * Get list of supported DeepSeek models.
   * Per D-20: per-provider model selection.
   * Per D-22: hardcoded model list.
   *
   * @returns Array of DeepSeek model identifiers
   */
  getSupportedModels(): string[] {
    return [
      'deepseek-chat',
      'deepseek-coder',
    ];
  }
}
