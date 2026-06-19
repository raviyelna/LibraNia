/**
 * HTTP API client for web mode
 * Replaces window.api (Electron IPC) with fetch-based HTTP calls
 */

const API_BASE = 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiClient = {
  notes: {
    async getAll() {
      const res = await fetch(`${API_BASE}/api/notes`);
      const json: ApiResponse<any[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data || [];
    },

    async getById(id: string) {
      const res = await fetch(`${API_BASE}/api/notes/${id}`);
      const json: ApiResponse<any> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },

    async create(data: { title: string; body: string; metadata?: string }) {
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<any> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },

    async update(id: string, data: { title?: string; body?: string; metadata?: string }) {
      const res = await fetch(`${API_BASE}/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<any> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },

    async delete(id: string) {
      const res = await fetch(`${API_BASE}/api/notes/${id}`, {
        method: 'DELETE',
      });
      const json: ApiResponse<void> = await res.json();
      if (!json.success) throw new Error(json.error);
    },
  },

  links: {
    async getBacklinks(noteId: string) {
      const res = await fetch(`${API_BASE}/api/notes/${noteId}/backlinks`);
      const json: ApiResponse<any[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data || [];
    },

    async getRelated(noteId: string) {
      const res = await fetch(`${API_BASE}/api/notes/${noteId}/related`);
      const json: ApiResponse<any[]> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data || [];
    },
  },

  graph: {
    async getData() {
      const res = await fetch(`${API_BASE}/api/graph`);
      const json: ApiResponse<any> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  },

  config: {
    async get() {
      const res = await fetch(`${API_BASE}/api/config`);
      const json: ApiResponse<any> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },

    async update(data: any) {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<void> = await res.json();
      if (!json.success) throw new Error(json.error);
    },
  },

  content: {
    async saveImage(data: { buffer: ArrayBuffer; filename: string }) {
      // TODO: implement image upload endpoint
      throw new Error('Image upload not implemented in web mode');
    },
  },
};
