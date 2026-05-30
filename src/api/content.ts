/**
 * Content API methods
 */

import { apiRequest } from './client';

export interface Content {
  id: string;
  file_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  original_filename: string;
  file_size: number;
  extracted_text: string | null;
  source: 'manual' | 'ai-generated';
  confidence_score: number | null;
  metadata: string | null;
  note_id: string | null;
  message_id: string | null;
  created_at: string;
  updated_at: string;
}

export const contentAPI = {
  async getAll(noteId?: string): Promise<Content[]> {
    const query = noteId ? `?noteId=${encodeURIComponent(noteId)}` : '';
    const response = await apiRequest<{ success: boolean; data: Content[] }>(`/api/content${query}`);
    return response.data || [];
  },

  async getById(id: string): Promise<Content> {
    const response = await apiRequest<{ success: boolean; data: Content }>(`/api/content/${id}`);
    if (!response.data) throw new Error('Content not found');
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/content/${id}`, {
      method: 'DELETE',
    });
  },

  async saveImage(params: {
    buffer: ArrayBuffer;
    filename: string;
    noteId: string;
  }): Promise<{ filePath: string }> {
    const blob = new Blob([params.buffer]);
    const file = new File([blob], params.filename, { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', 'manual');
    formData.append('note_id', params.noteId);
    formData.append('append_reference', 'false');

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/content/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { filePath: result.data.file_path };
  },
};

/**
 * Upload content with progress tracking
 * Uses XMLHttpRequest instead of fetch to support upload progress events
 */
export function uploadContent(
  file: File,
  source: 'manual' | 'ai-generated',
  options?: { confidence_score?: number; note_id?: string; message_id?: string },
  onProgress?: (percent: number) => void
): Promise<Content> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    if (options?.confidence_score !== undefined) {
      formData.append('confidence_score', String(options.confidence_score));
    }
    if (options?.note_id) {
      formData.append('note_id', options.note_id);
    }
    if (options?.message_id) {
      formData.append('message_id', options.message_id);
    }

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.data);
        } catch (error) {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    // Handle aborted uploads
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', `${apiUrl}/api/content/upload`);
    xhr.send(formData);
  });
}
