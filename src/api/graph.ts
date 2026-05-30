/**
 * Graph API methods
 */

import { apiRequest } from './client';

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
}

export interface GraphLink {
  id?: string;
  source: string;
  target: string;
  type: 'manual' | 'semantic' | 'citation';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const graphAPI = {
  async getData(): Promise<GraphData> {
    const response = await apiRequest<{ success: boolean; data: { nodes: GraphNode[]; links: GraphLink[] } }>('/api/graph');
    // Backend returns 'links', frontend expects 'links'
    return {
      nodes: response.data?.nodes || [],
      links: response.data?.links || [],
    };
  },

  async createNode(data: { title: string; tags?: string[] }): Promise<GraphNode> {
    const response = await apiRequest<{ success: boolean; data: GraphNode }>('/api/graph/nodes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create node');
    return response.data;
  },

  async updateNode(id: string, data: { title: string; tags?: string[] }): Promise<GraphNode> {
    const response = await apiRequest<{ success: boolean; data: GraphNode }>(`/api/graph/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to update node');
    return response.data;
  },

  async deleteNode(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/graph/nodes/${id}`, {
      method: 'DELETE',
    });
  },

  async createEdge(data: { source: string; target: string; type?: string }): Promise<GraphLink> {
    const response = await apiRequest<{ success: boolean; data: GraphLink }>('/api/graph/edges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) throw new Error('Failed to create edge');
    return response.data;
  },

  async deleteEdge(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/graph/edges/${id}`, {
      method: 'DELETE',
    });
  },
};
