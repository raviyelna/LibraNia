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
    const response = await apiRequest<{ success: boolean; config: Config }>('/api/config');
    return response.config;
  },

  async update(data: Partial<Config>): Promise<Config> {
    const response = await apiRequest<{ success: boolean; config: Config }>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.config;
  },

  async reset(): Promise<Config> {
    const response = await apiRequest<{ success: boolean; config: Config }>('/api/config/reset', {
      method: 'POST',
    });
    return response.config;
  },
};
