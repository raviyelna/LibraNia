/**
 * Content API methods
 */

import { apiRequest } from './client';

export interface Content {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  source: 'manual' | 'ai-generated';
  created_at: string;
}

export const contentAPI = {
  async getAll(): Promise<Content[]> {
    const response = await apiRequest<{ success: boolean; data: Content[] }>('/api/content');
    return response.data;
  },

  async getById(id: string): Promise<Content> {
    const response = await apiRequest<{ success: boolean; content: Content }>(`/api/content/${id}`);
    return response.content;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/content/${id}`, {
      method: 'DELETE',
    });
  },

  // Note: upload method will be added in Plan 03 (requires FormData and XMLHttpRequest for progress tracking)
};
