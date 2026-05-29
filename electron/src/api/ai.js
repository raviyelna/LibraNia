import { apiRequest } from './client';
export const aiAPI = {
    async getModels() {
        const response = await apiRequest('/api/ai/models');
        return response.models;
    },
    async getProviders() {
        const response = await apiRequest('/api/ai/providers');
        return response.providers;
    },
    async validateKey(providerId, apiKey, baseURL) {
        const response = await apiRequest('/api/ai/validate-key', {
            method: 'POST',
            body: JSON.stringify({ providerId, apiKey, baseURL }),
        });
        return { valid: response.valid, error: response.error };
    },
    async setConfig(config) {
        console.warn('[aiAPI.setConfig] Not implemented - provider config managed via /api/config');
        throw new Error('setConfig not implemented - use /api/config endpoint');
    },
    async deleteConfig(providerId) {
        console.warn('[aiAPI.deleteConfig] Not implemented - provider config managed via /api/config');
        throw new Error('deleteConfig not implemented - use /api/config endpoint');
    },
};
