import { logger } from '../logger';
export async function searchWithClaude(query, apiKey, baseURL) {
    logger.info('Web search via Claude:', { query });
    return [{
            title: 'Web search not available',
            url: '',
            content: 'Claude API does not support web search. Please configure TAVILY_API_KEY in .env for web search capability.',
            score: 0,
        }];
}
export async function searchWithDeepSeek(query, apiKey) {
    logger.info('Web search via DeepSeek:', { query });
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a web search assistant. Search the web and return results in JSON format with title, url, content, and score fields.',
                    },
                    {
                        role: 'user',
                        content: `Search the web for: ${query}. Return top 5 results as JSON array.`,
                    },
                ],
                temperature: 0.3,
            }),
        });
        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.status}`);
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '[]';
        try {
            const results = JSON.parse(content);
            return Array.isArray(results) ? results : [];
        }
        catch {
            return [{
                    title: 'Search Results',
                    url: '',
                    content: content,
                    score: 1.0,
                }];
        }
    }
    catch (error) {
        logger.error('DeepSeek web search failed:', error);
        throw error;
    }
}
export async function searchWithOpenAI(query, apiKey, baseURL) {
    logger.info('Web search via OpenAI:', { query });
    return [{
            title: 'Web search not available',
            url: '',
            content: 'OpenAI API does not support web search. Please configure TAVILY_API_KEY in .env for web search capability.',
            score: 0,
        }];
}
