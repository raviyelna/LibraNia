/**
 * Available models per provider
 */

export const PROVIDER_MODELS = {
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
  ],
  claude: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 Mini' },
  ],
} as const;

export type ProviderId = keyof typeof PROVIDER_MODELS;
