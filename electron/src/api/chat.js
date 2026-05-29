import { apiRequest } from './client.js';
export const chatAPI = {
    async summarizeNote(noteId) {
        const response = await apiRequest('/api/ai/summarize', {
            method: 'POST',
            body: JSON.stringify({ noteId }),
        });
        return response.summary;
    },
};
