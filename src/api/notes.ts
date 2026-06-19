/**
 * Notes API methods
 */

import { apiRequest } from './client';

export interface Note {
  id: string;
  title: string;
  body: string;
  metadata?: string;
  tags?: string[];
  group?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AutoLinkResult {
  note: Note;
  addedLinks: string[];
}

export const notesAPI = {
  async getAll(): Promise<Note[]> {
    const response = await apiRequest<{ success: boolean; data: Note[] }>('/api/notes');
    return response.data || [];
  },

  async getById(id: string): Promise<Note> {
    const response = await apiRequest<{ success: boolean; data: Note }>(`/api/notes/${id}`);
    if (!response.data) throw new Error('Note not found');
    return response.data;
  },

  async create(data: { title: string; body: string; metadata?: string }): Promise<Note> {
    const response = await apiRequest<{ success: boolean; data: Note }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create note');
    return response.data;
  },

  async update(id: string, data: { title?: string; body?: string; metadata?: string }): Promise<Note> {
    const response = await apiRequest<{ success: boolean; data: Note }>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to update note');
    return response.data;
  },

  async autoLink(id: string): Promise<AutoLinkResult> {
    const response = await apiRequest<{ success: boolean; data: AutoLinkResult }>(`/api/notes/${id}/auto-link`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!response.data) throw new Error('Failed to auto-link note');
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  },

  async restore(id: string): Promise<Note> {
    const response = await apiRequest<{ success: boolean; data: Note }>(`/api/notes/${id}/restore`, {
      method: 'POST',
    });
    if (!response.data) throw new Error('Failed to restore note');
    return response.data;
  },

  async getDeleted(): Promise<Note[]> {
    const response = await apiRequest<{ success: boolean; data: Note[] }>('/api/notes/deleted');
    return response.data || [];
  },
};
