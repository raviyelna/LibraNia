import { apiRequest } from './client';
export const conversationsAPI = {
    async getAll() {
        const response = await apiRequest('/api/conversations');
        return response.conversations;
    },
    async getById(id) {
        const response = await apiRequest(`/api/conversations/${id}`);
        return response.conversation;
    },
    async create(data) {
        const response = await apiRequest('/api/conversations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.conversation;
    },
    async update(id, data) {
        await apiRequest(`/api/conversations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
    async delete(id) {
        await apiRequest(`/api/conversations/${id}`, {
            method: 'DELETE',
        });
    },
    async getMessages(id) {
        const response = await apiRequest(`/api/conversations/${id}/messages`);
        return response.messages;
    },
};
