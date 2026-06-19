import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, Message, GenerateOptions } from './base.provider.js';

/**
 * Claude AI provider implementation using official Anthropic SDK.
 * Implements unified AIProvider interface per D-01.
 */
export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private client: Anthropic;
  private baseURL?: string;

  /**
   * Create Claude provider instance.
   *
   * @param apiKey - Anthropic API key
   * @param baseURL - Optional custom base URL (per D-03)
   */
  constructor(apiKey: string, baseURL?: string) {
    this.baseURL = baseURL;
    this.client = new Anthropic({
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
      const testClient = new Anthropic({
        apiKey,
        baseURL: baseURL || this.baseURL,
      });

      // Make minimal request to test API key
      await testClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
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
    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Create streaming request
    const stream = await this.client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      messages: anthropicMessages,
    });

    let fullResponse = '';

    // Iterate through stream chunks
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        const token = chunk.delta.text;
        fullResponse += token;
        onToken(token);
      }
    }

    return fullResponse;
  }

  /**
   * Get list of supported Claude models.
   * Per D-20: per-provider model selection.
   * Per D-22: hardcoded model list.
   *
   * @returns Array of Claude model identifiers
   */
  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}
