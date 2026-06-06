import { apiRequest } from './client';

export interface BlackboardAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  customTools: string;
  maxResponseTokens?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlackboardTool {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'http';
  inputSchema: string;
  staticResponse: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  httpUrl: string;
  httpBody: string;
  httpHeaders: Array<{ name: string; value: string }>;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlackboardMessage {
  id: string;
  sessionId: string;
  agentId: string | null;
  agentName: string;
  role: 'task' | 'agent' | 'system' | 'user';
  content: string;
  details?: string;
  createdAt: string;
}

export interface BlackboardArtifact {
  id: string;
  type: 'scope' | 'relevant_notes' | 'topic_clusters' | 'review_summary' | 'candidate_ideas' | 'final_recommendation' | 'handoff' | 'open_questions';
  title: string;
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export interface BlackboardSession {
  id: string;
  title: string;
  task: string;
  status: 'running' | 'complete' | 'failed';
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
  artifacts: BlackboardArtifact[];
  messages: BlackboardMessage[];
}

export const blackboardAPI = {
  async getAgents(): Promise<BlackboardAgent[]> {
    const response = await apiRequest<{ success: boolean; data: BlackboardAgent[] }>('/api/blackboard/agents');
    return response.data || [];
  },

  async saveAgent(agent: Partial<BlackboardAgent>): Promise<BlackboardAgent> {
    const endpoint = agent.id ? `/api/blackboard/agents/${agent.id}` : '/api/blackboard/agents';
    const response = await apiRequest<{ success: boolean; data: BlackboardAgent }>(endpoint, {
      method: agent.id ? 'PUT' : 'POST',
      body: JSON.stringify(agent),
    });
    if (!response.data) throw new Error('Failed to save agent');
    return response.data;
  },

  async deleteAgent(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/blackboard/agents/${id}`, { method: 'DELETE' });
  },

  async getTools(): Promise<BlackboardTool[]> {
    const response = await apiRequest<{ success: boolean; data: BlackboardTool[] }>('/api/blackboard/tools');
    return response.data || [];
  },

  async saveTool(tool: Partial<BlackboardTool>): Promise<BlackboardTool> {
    const endpoint = tool.id ? `/api/blackboard/tools/${tool.id}` : '/api/blackboard/tools';
    const response = await apiRequest<{ success: boolean; data: BlackboardTool }>(endpoint, {
      method: tool.id ? 'PUT' : 'POST',
      body: JSON.stringify(tool),
    });
    if (!response.data) throw new Error('Failed to save blackboard tool');
    return response.data;
  },

  async deleteTool(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/blackboard/tools/${id}`, { method: 'DELETE' });
  },

  async executeTool(id: string, input: any): Promise<any> {
    const response = await apiRequest<{ success: boolean; data: any }>(`/api/blackboard/tools/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
    return response.data;
  },

  async getSessions(): Promise<BlackboardSession[]> {
    const response = await apiRequest<{ success: boolean; data: BlackboardSession[] }>('/api/blackboard/sessions');
    return response.data || [];
  },

  async renameSession(id: string, title: string): Promise<BlackboardSession> {
    const response = await apiRequest<{ success: boolean; data: BlackboardSession }>(`/api/blackboard/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    if (!response.data) throw new Error('Failed to rename blackboard session');
    return response.data;
  },

  async deleteSession(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/blackboard/sessions/${id}`, { method: 'DELETE' });
  },

  async sendMessage(id: string, params: {
    content: string;
    providerId?: string;
    model?: string;
  }): Promise<BlackboardSession> {
    const response = await apiRequest<{ success: boolean; data: BlackboardSession }>(`/api/blackboard/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!response.data) throw new Error('Failed to send blackboard message');
    return response.data;
  },

  async assignTask(params: {
    task: string;
    agentIds: string[];
    providerId?: string;
    model?: string;
  }): Promise<BlackboardSession> {
    const response = await apiRequest<{ success: boolean; data: BlackboardSession }>('/api/blackboard/assign', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!response.data) throw new Error('Failed to assign blackboard task');
    return response.data;
  },
};
