/**
 * Tags API methods
 */

import { apiRequest } from './client';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export const tagsAPI = {
  async getAll(): Promise<Tag[]> {
    const response = await apiRequest<{ success: boolean; data: Tag[] }>('/api/tags');
    return response.data;
  },

  async create(data: { name: string; color?: string }): Promise<Tag> {
    const response = await apiRequest<{ success: boolean; tag: Tag }>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.tag;
  },

  async update(id: string, data: { name?: string; color?: string }): Promise<Tag> {
    const response = await apiRequest<{ success: boolean; tag: Tag }>(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.tag;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  },

  async getByNote(noteId: string): Promise<Tag[]> {
    const response = await apiRequest<{ success: boolean; tags: Tag[] }>(`/api/tags/note/${noteId}`);
    return response.tags;
  },

  async addToNote(noteId: string, tagId: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/tags/note/${noteId}`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    });
  },

  async removeFromNote(noteId: string, tagId: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/tags/note/${noteId}/${tagId}`, {
      method: 'DELETE',
    });
  },
};
