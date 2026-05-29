/**
 * Graph API methods
 */

import { apiRequest } from './client';

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'manual' | 'semantic' | 'citation';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const graphAPI = {
  async getData(): Promise<GraphData> {
    const response = await apiRequest<{ success: boolean; data: GraphData }>('/api/graph');
    return response.data;
  },

  async createNode(data: { title: string; tags?: string[] }): Promise<GraphNode> {
    const response = await apiRequest<{ success: boolean; data: GraphNode }>('/api/graph/nodes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateNode(id: string, data: { title: string; tags?: string[] }): Promise<GraphNode> {
    const response = await apiRequest<{ success: boolean; data: GraphNode }>(`/api/graph/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteNode(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/graph/nodes/${id}`, {
      method: 'DELETE',
    });
  },

  async createEdge(data: { source: string; target: string; type?: string }): Promise<GraphEdge> {
    const response = await apiRequest<{ success: boolean; data: GraphEdge }>('/api/graph/edges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteEdge(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/graph/edges/${id}`, {
      method: 'DELETE',
    });
  },
};
