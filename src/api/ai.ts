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

export const aiAPI = {
  async getModels(): Promise<AIModel[]> {
    const response = await apiRequest<{ success: boolean; models: AIModel[] }>('/api/ai/models');
    return response.models;
  },

  async getProviders(): Promise<AIProvider[]> {
    const response = await apiRequest<{ success: boolean; providers: AIProvider[] }>('/api/ai/providers');
    return response.providers;
  },

  async validateKey(providerId: string, apiKey: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean; valid: boolean }>('/api/ai/validate-key', {
      method: 'POST',
      body: JSON.stringify({ providerId, apiKey }),
    });
    return response.valid;
  },
};
