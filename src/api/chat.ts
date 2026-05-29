/**
 * Chat API methods
 */

import { apiRequest } from './client';

export const chatAPI = {
  async summarizeNote(noteId: string): Promise<string> {
    const response = await apiRequest<{ success: boolean; summary: string }>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ noteId }),
    });
    return response.summary;
  },

  // Note: streaming chat methods will use Socket.IO (Plan 02), not HTTP
};
