/**
 * AI API methods
 */

import { apiRequest } from './client';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export interface AIProvider {
  id: string;
  name: string;
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export interface ProviderConfig {
  id: 'claude' | 'openai' | 'deepseek';
  apiKey: string;
  baseURL?: string;
  model: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const aiAPI = {
  async getModels(): Promise<AIModel[]> {
    const response = await apiRequest<{ success: boolean; models: AIModel[] }>('/api/ai/models');
    return response.models;
  },

  async getProviders(): Promise<AIProvider[]> {
    const response = await apiRequest<{ success: boolean; providers: AIProvider[] }>('/api/ai/providers');
    return response.providers;
  },

  async validateKey(providerId: string, apiKey: string, baseURL?: string): Promise<ValidationResult> {
    const response = await apiRequest<{ success: boolean; valid: boolean; error?: string }>('/api/ai/validate-key', {
      method: 'POST',
      body: JSON.stringify({ providerId, apiKey, baseURL }),
    });
    return { valid: response.valid, error: response.error };
  },

  // TODO: These methods need backend implementation
  // Provider config is currently managed via /api/config, not /api/ai
  async setConfig(config: ProviderConfig): Promise<void> {
    // Stub - backend endpoint doesn't exist yet
    console.warn('[aiAPI.setConfig] Not implemented - provider config managed via /api/config');
    throw new Error('setConfig not implemented - use /api/config endpoint');
  },

  async deleteConfig(providerId: string): Promise<void> {
    // Stub - backend endpoint doesn't exist yet
    console.warn('[aiAPI.deleteConfig] Not implemented - provider config managed via /api/config');
    throw new Error('deleteConfig not implemented - use /api/config endpoint');
  },
};
