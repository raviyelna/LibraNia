/**
 * Web search using AI provider's native capabilities
 * Fallback when Tavily not configured
 */

import { logger } from '../logger.js';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Search web using Claude's web search capability
 */
export async function searchWithClaude(
  query: string,
  apiKey: string,
  baseURL?: string
): Promise<SearchResult[]> {
  logger.info('Web search via Claude:', { query });

  // Claude doesn't have native web search
  // Return empty results with message
  return [{
    title: 'Web search not available',
    url: '',
    content: 'Claude API does not support web search. Please configure TAVILY_API_KEY in .env for web search capability.',
    score: 0,
  }];
}

/**
 * Search web using DeepSeek's web search capability
 */
export async function searchWithDeepSeek(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
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
    } catch {
      // If not JSON, return as single result
      return [{
        title: 'Search Results',
        url: '',
        content: content,
        score: 1.0,
      }];
    }
  } catch (error) {
    logger.error('DeepSeek web search failed:', error);
    throw error;
  }
}

/**
 * Search web using OpenAI (no native web search)
 */
export async function searchWithOpenAI(
  query: string,
  apiKey: string,
  baseURL?: string
): Promise<SearchResult[]> {
  logger.info('Web search via OpenAI:', { query });

  // OpenAI doesn't have native web search
  return [{
    title: 'Web search not available',
    url: '',
    content: 'OpenAI API does not support web search. Please configure TAVILY_API_KEY in .env for web search capability.',
    score: 0,
  }];
}
