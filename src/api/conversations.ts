/**
 * Conversations API methods
 */

import { apiRequest } from './client';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];  // Optional - fetched separately via getMessages
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id?: string;
  model?: string;
  created_at: string;
}

export const conversationsAPI = {
  async getAll(): Promise<Conversation[]> {
    const response = await apiRequest<{ success: boolean; conversations: Conversation[] }>('/api/conversations');
    return response.conversations || [];
  },

  async getById(id: string): Promise<Conversation> {
    const response = await apiRequest<{ success: boolean; conversation: Conversation }>(`/api/conversations/${id}`);
    if (!response.conversation) throw new Error('Conversation not found');
    return response.conversation;
  },

  async create(data: { title: string }): Promise<Conversation> {
    const response = await apiRequest<{ success: boolean; conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.conversation) throw new Error('Failed to create conversation');
    return response.conversation;
  },

  async update(id: string, data: { title: string }): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async getMessages(id: string): Promise<Message[]> {
    const response = await apiRequest<{ success: boolean; messages: Message[] }>(`/api/conversations/${id}/messages`);
    return response.messages || [];
  },
};
