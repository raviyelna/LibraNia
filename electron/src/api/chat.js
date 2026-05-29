import { apiRequest } from './client';
export const chatAPI = {
    async summarizeNote(noteId) {
        const response = await apiRequest('/api/ai/summarize', {
            method: 'POST',
            body: JSON.stringify({ noteId }),
        });
        return response.summary;
    },
};
