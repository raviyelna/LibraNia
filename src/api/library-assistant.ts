import { apiRequest } from './client';

export interface LibraryAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const libraryAssistantAPI = {
  async ask(params: {
    noteId: string;
    question: string;
    conversationId?: string;
    messages?: LibraryAssistantMessage[];
    providerId?: string;
    model?: string;
  }): Promise<{ conversationId: string; content: string }> {
    return apiRequest<{ success: boolean; conversationId: string; content: string }>('/api/library/ask', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
