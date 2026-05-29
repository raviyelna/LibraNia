import OpenAI from 'openai';
export class OpenAIProvider {
    name = 'openai';
    client;
    baseURL;
    constructor(apiKey, baseURL) {
        this.baseURL = baseURL;
        this.client = new OpenAI({
            apiKey,
            baseURL,
        });
    }
    async validateApiKey(apiKey, baseURL) {
        try {
            const testClient = new OpenAI({
                apiKey,
                baseURL: baseURL || this.baseURL,
            });
            await testClient.chat.completions.create({
                model: 'gpt-4',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }],
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async generateResponse(messages, options, onToken) {
        const openaiMessages = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
        const stream = await this.client.chat.completions.create({
            model: options.model,
            max_tokens: options.maxTokens || 4096,
            temperature: options.temperature,
            messages: openaiMessages,
            stream: true,
        });
        let fullResponse = '';
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
                fullResponse += token;
                onToken(token);
            }
        }
        return fullResponse;
    }
    getSupportedModels() {
        return [
            'gpt-4',
            'gpt-4o',
            'gpt-4-turbo',
        ];
    }
}
