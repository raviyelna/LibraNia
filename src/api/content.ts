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
};

/**
 * Upload content with progress tracking
 * Uses XMLHttpRequest instead of fetch to support upload progress events
 */
export function uploadContent(
  file: File,
  source: 'manual' | 'ai-generated',
  onProgress?: (percent: number) => void
): Promise<Content> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.content);
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
