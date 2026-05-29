/**
 * Notes API methods
 */

import { apiRequest } from './client';

export interface Note {
  id: string;
  title: string;
  body: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export const notesAPI = {
  async getAll(): Promise<Note[]> {
    const response = await apiRequest<{ success: boolean; data: Note[] }>('/api/notes');
    return response.data;
  },

  async getById(id: string): Promise<Note> {
    const response = await apiRequest<{ success: boolean; note: Note }>(`/api/notes/${id}`);
    return response.note;
  },

  async create(data: { title: string; body: string; metadata?: string }): Promise<Note> {
    const response = await apiRequest<{ success: boolean; note: Note }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  async update(id: string, data: { title?: string; body?: string; metadata?: string }): Promise<Note> {
    const response = await apiRequest<{ success: boolean; note: Note }>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.note;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  },

  async restore(id: string): Promise<Note> {
    const response = await apiRequest<{ success: boolean; note: Note }>(`/api/notes/${id}/restore`, {
      method: 'POST',
    });
    return response.note;
  },

  async getDeleted(): Promise<Note[]> {
    const response = await apiRequest<{ success: boolean; data: Note[] }>('/api/notes/deleted');
    return response.data;
  },
};
