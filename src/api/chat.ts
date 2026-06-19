/**
 * Chat API methods
 */

import { apiRequest } from './client';
import { conversationsAPI, Message } from './conversations';

export const chatAPI = {
  async summarizeNote(noteId: string): Promise<string> {
    const response = await apiRequest<{ success: boolean; summary: string }>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ noteId }),
    });
    return response.summary;
  },

  async chat(params: {
    conversationId: string;
    messages: Array<{ role: string; content: string }>;
    providerId: string;
    model: string;
    researchMode?: boolean;
  }): Promise<{ success: boolean; content?: string; error?: string }> {
    const response = await apiRequest<{ success: boolean; content?: string; error?: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response;
  },

  async getMessages(conversationId: string): Promise<{ success: boolean; messages?: Message[] }> {
    const messages = await conversationsAPI.getMessages(conversationId);
    return { success: true, messages };
  },

  // Note: streaming chat methods will use Socket.IO (Plan 02), not HTTP
};
