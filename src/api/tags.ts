/**
 * Tags API methods
 */

import { apiRequest } from './client';
import type { Note } from './notes';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export const tagsAPI = {
  async getAll(): Promise<Tag[]> {
    const response = await apiRequest<{ success: boolean; data: Tag[] }>('/api/tags');
    return response.data || [];
  },

  async create(data: { name: string; color?: string }): Promise<Tag> {
    const response = await apiRequest<{ success: boolean; data: Tag }>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create tag');
    return response.data;
  },

  async update(id: string, data: { name?: string; color?: string }): Promise<Tag> {
    const response = await apiRequest<{ success: boolean; data: Tag }>(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to update tag');
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  },

  async getByNote(noteId: string): Promise<Tag[]> {
    const response = await apiRequest<{ success: boolean; data: Tag[] }>(`/api/tags/note/${noteId}`);
    return response.data || [];
  },

  async getNotesByTag(tagId: string): Promise<Note[]> {
    const response = await apiRequest<{ success: boolean; data: Note[] }>(`/api/tags/${tagId}/notes`);
    return response.data || [];
  },

  async addToNote(noteId: string, tagName: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/tags/note/${noteId}`, {
      method: 'POST',
      body: JSON.stringify({ tagNames: [tagName] }),
    });
  },

  async removeFromNote(noteId: string, tagId: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/tags/note/${noteId}/${tagId}`, {
      method: 'DELETE',
    });
  },
};
