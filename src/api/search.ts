/**
 * Search API methods
 */

import { apiRequest } from './client';

export interface SearchResult {
  id: string;
  title: string;
  body: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

export const searchAPI = {
  async search(query: string, type: 'fullText' | 'quickNav' | 'fuzzy' = 'fullText'): Promise<SearchResult[]> {
    const response = await apiRequest<{ success: boolean; results: SearchResult[] }>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, type }),
    });
    return response.results;
  },

  async semantic(query: string): Promise<SearchResult[]> {
    const response = await apiRequest<{ success: boolean; results: SearchResult[] }>('/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return response.results;
  },
};
