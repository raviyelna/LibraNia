import { apiRequest } from './client.js';
export const graphAPI = {
    async getData() {
        const response = await apiRequest('/api/graph');
        return {
            nodes: response.data.nodes,
            links: response.data.edges,
        };
    },
    async createNode(data) {
        const response = await apiRequest('/api/graph/nodes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },
    async updateNode(id, data) {
        const response = await apiRequest(`/api/graph/nodes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },
    async deleteNode(id) {
        await apiRequest(`/api/graph/nodes/${id}`, {
            method: 'DELETE',
        });
    },
    async createEdge(data) {
        const response = await apiRequest('/api/graph/edges', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },
    async deleteEdge(id) {
        await apiRequest(`/api/graph/edges/${id}`, {
            method: 'DELETE',
        });
    },
};
