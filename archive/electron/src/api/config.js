import { apiRequest } from './client.js';
export const configAPI = {
    async get() {
        const response = await apiRequest('/api/config');
        return response.config;
    },
    async update(data) {
        const response = await apiRequest('/api/config', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.config;
    },
    async reset() {
        const response = await apiRequest('/api/config/reset', {
            method: 'POST',
        });
        return response.config;
    },
};
