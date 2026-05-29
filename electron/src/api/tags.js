import { apiRequest } from './client';
export const tagsAPI = {
    async getAll() {
        const response = await apiRequest('/api/tags');
        return response.data;
    },
    async create(data) {
        const response = await apiRequest('/api/tags', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.tag;
    },
    async update(id, data) {
        const response = await apiRequest(`/api/tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.tag;
    },
    async delete(id) {
        await apiRequest(`/api/tags/${id}`, {
            method: 'DELETE',
        });
    },
    async getByNote(noteId) {
        const response = await apiRequest(`/api/tags/note/${noteId}`);
        return response.tags;
    },
    async addToNote(noteId, tagId) {
        await apiRequest(`/api/tags/note/${noteId}`, {
            method: 'POST',
            body: JSON.stringify({ tagId }),
        });
    },
    async removeFromNote(noteId, tagId) {
        await apiRequest(`/api/tags/note/${noteId}/${tagId}`, {
            method: 'DELETE',
        });
    },
};
