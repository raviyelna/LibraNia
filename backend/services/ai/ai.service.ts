import { ClaudeProvider } from './providers/claude.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { DeepSeekProvider } from './providers/deepseek.provider.js';
import type { AIProvider, Message, GenerateOptions } from './providers/base.provider.js';
import { getProviderConfig } from '../../store/secure.store.js';

/**
 * Retry a function with exponential backoff.
 * Per D-03: retry with exponential backoff (1s, 2s, 4s).
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @returns Result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on authentication errors (401/403)
      if ((error as any).status === 401 || (error as any).status === 403) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * AI service providing provider factory and retry logic.
 * Per D-01: unified interface pattern with provider factory.
 * Per D-03: retry with exponential backoff for transient failures.
 */
export class AIService {
  /**
   * Get AI provider instance based on provider ID.
   * Per D-01: provider factory creates correct provider based on providerId.
   *
   * @param providerId - Provider identifier ('claude', 'openai', 'deepseek')
   * @returns AIProvider instance
   * @throws Error if provider not configured
   */
  async getProvider(providerId: string): Promise<AIProvider> {
    const config = await getProviderConfig(providerId);

    if (!config) {
      throw new Error(`Provider "${providerId}" is not configured. Please configure it in Settings.`);
    }

    // Create provider instance based on providerId
    switch (providerId) {
      case 'claude':
        return new ClaudeProvider(config.apiKey, config.baseURL);
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.baseURL);
      case 'deepseek':
        return new DeepSeekProvider(config.apiKey, config.baseURL);
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }

  /**
   * Generate AI response with retry logic.
   * Per D-02: streaming responses via onToken callback.
   * Per D-03: retry with exponential backoff on transient errors.
   *
   * @param providerId - Provider identifier
   * @param model - Model to use
   * @param messages - Conversation history
   * @param options - Generation options including onToken callback
   * @returns Full response text
   */
  async generateResponse(
    providerId: string,
    model: string,
    messages: Message[],
    options: { onToken: (token: string) => void; signal?: AbortSignal }
  ): Promise<string> {
    const provider = await this.getProvider(providerId);

    // Wrap provider call in retry logic
    return retryWithBackoff(async () => {
      return provider.generateResponse(
        messages,
        {
          model,
          signal: options.signal,
        },
        options.onToken
      );
    });
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

/**
 * Get singleton AIService instance.
 * Follows Phase 2 service pattern.
 *
 * @returns AIService singleton
 */
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
