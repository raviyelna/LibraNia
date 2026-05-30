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
  configured?: boolean;
  apiKeyPreview?: string;
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
    const response = await apiRequest<{ success: boolean; data: AIProvider[] }>('/api/ai/providers');
    return response.data || [];
  },

  async validateKey(providerId: string, apiKey: string, baseURL?: string): Promise<ValidationResult> {
    const response = await apiRequest<{ success: boolean; data: { valid: boolean; error?: string } }>('/api/ai/validate-key', {
      method: 'POST',
      body: JSON.stringify({ provider: providerId, apiKey, baseURL }),
    });
    return { valid: response.data?.valid || false, error: response.data?.error };
  },

  // Provider config management
  async setConfig(config: ProviderConfig): Promise<void> {
    await apiRequest<{ success: boolean }>('/api/providers', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async deleteConfig(providerId: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/providers/${providerId}`, {
      method: 'DELETE',
    });
  },
};
