import { ClaudeProvider } from './providers/claude.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { DeepSeekProvider } from './providers/deepseek.provider.js';
import { getProviderConfig } from '../../store/secure.store.js';
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (error.status === 401 || error.status === 403) {
                throw error;
            }
            if (attempt === maxRetries - 1) {
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
export class AIService {
    async getProvider(providerId) {
        const config = await getProviderConfig(providerId);
        if (!config) {
            throw new Error(`Provider "${providerId}" is not configured. Please configure it in Settings.`);
        }
        switch (providerId) {
            case 'claude':
                return new ClaudeProvider(config.apiKey, config.baseURL);
            case 'openai':
                return new OpenAIProvider(config.apiKey, config.baseURL);
            case 'deepseek':
                return new DeepSeekProvider(config.apiKey, config.baseURL);
            default:
                throw new Error(`Unknown provider: ${providerId}`);
        }
    }
    async generateResponse(providerId, model, messages, options) {
        const provider = await this.getProvider(providerId);
        return retryWithBackoff(async () => {
            return provider.generateResponse(messages, {
                model,
                signal: options.signal,
            }, options.onToken);
        });
    }
}
let aiServiceInstance = null;
export function getAIService() {
    if (!aiServiceInstance) {
        aiServiceInstance = new AIService();
    }
    return aiServiceInstance;
}
