import { apiRequest } from './client';
export const searchAPI = {
    async search(query, type = 'fullText') {
        const response = await apiRequest('/api/search', {
            method: 'POST',
            body: JSON.stringify({ query, type }),
        });
        return response.results;
    },
    async semantic(query) {
        const response = await apiRequest('/api/search/semantic', {
            method: 'POST',
            body: JSON.stringify({ query }),
        });
        return response.results;
    },
};
