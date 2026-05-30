/**
 * Config API methods
 */

import { apiRequest } from './client';

export interface Config {
  theme?: string;
  language?: string;
  aiProvider?: string;
  [key: string]: any;
}

export const configAPI = {
  async get(): Promise<Config> {
    const response = await apiRequest<{ success: boolean; data: Config }>('/api/config');
    return response.data || {};
  },

  async update(data: Partial<Config>): Promise<Config> {
    const response = await apiRequest<{ success: boolean; data: Config }>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || {};
  },

  async reset(): Promise<Config> {
    const response = await apiRequest<{ success: boolean; data: Config }>('/api/config/reset', {
      method: 'POST',
    });
    return response.data || {};
  },
};
