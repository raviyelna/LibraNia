/**
 * Base AIProvider interface for unified multi-provider AI integration.
 * All AI providers (Claude, OpenAI, DeepSeek) implement this interface.
 */

/**
 * Message format for AI conversations.
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Options for generating AI responses.
 */
export interface GenerateOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal; // For cancellation support
}

/**
 * Unified AI provider interface.
 * Enables provider switching without code changes (D-01: unified interface pattern).
 */
export interface AIProvider {
  /**
   * Provider name identifier (e.g., 'claude', 'openai', 'deepseek').
   */
  name: string;

  /**
   * Validate API key by making a test request to the provider.
   * Per D-05: validate API keys on save for immediate feedback.
   *
   * @param apiKey - API key to validate
   * @param baseURL - Optional custom base URL (per D-03)
   * @returns true if valid, false otherwise
   */
  validateApiKey(apiKey: string, baseURL?: string): Promise<boolean>;

  /**
   * Generate AI response with streaming support.
   * Per D-02: streaming responses for better UX.
   *
   * @param messages - Conversation history
   * @param options - Generation options (model, temperature, etc.)
   * @param onToken - Callback for each streamed token
   * @returns Full response text
   */
  generateResponse(
    messages: Message[],
    options: GenerateOptions,
    onToken: (token: string) => void
  ): Promise<string>;

  /**
   * Get list of supported models for this provider.
   * Per D-20: per-provider model selection.
   *
   * @returns Array of model identifiers
   */
  getSupportedModels(): string[];
}
