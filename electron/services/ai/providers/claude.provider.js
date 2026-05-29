import Anthropic from '@anthropic-ai/sdk';
export class ClaudeProvider {
    name = 'claude';
    client;
    baseURL;
    constructor(apiKey, baseURL) {
        this.baseURL = baseURL;
        this.client = new Anthropic({
            apiKey,
            baseURL,
        });
    }
    async validateApiKey(apiKey, baseURL) {
        try {
            const testClient = new Anthropic({
                apiKey,
                baseURL: baseURL || this.baseURL,
            });
            await testClient.messages.create({
                model: 'claude-3-5-sonnet-20241022',
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
        const anthropicMessages = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
        const stream = await this.client.messages.stream({
            model: options.model,
            max_tokens: options.maxTokens || 4096,
            temperature: options.temperature,
            messages: anthropicMessages,
        });
        let fullResponse = '';
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta') {
                const token = chunk.delta.text;
                fullResponse += token;
                onToken(token);
            }
        }
        return fullResponse;
    }
    getSupportedModels() {
        return [
            'claude-3-5-sonnet-20241022',
            'claude-3-opus-20240229',
            'claude-3-haiku-20240307',
        ];
    }
}
