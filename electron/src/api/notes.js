import { apiRequest } from './client';
export const notesAPI = {
    async getAll() {
        const response = await apiRequest('/api/notes');
        return response.data;
    },
    async getById(id) {
        const response = await apiRequest(`/api/notes/${id}`);
        return response.note;
    },
    async create(data) {
        const response = await apiRequest('/api/notes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.note;
    },
    async update(id, data) {
        const response = await apiRequest(`/api/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.note;
    },
    async delete(id) {
        await apiRequest(`/api/notes/${id}`, {
            method: 'DELETE',
        });
    },
    async restore(id) {
        const response = await apiRequest(`/api/notes/${id}/restore`, {
            method: 'POST',
        });
        return response.note;
    },
    async getDeleted() {
        const response = await apiRequest('/api/notes/deleted');
        return response.data;
    },
};
