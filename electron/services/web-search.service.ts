/**
 * Web search service using Tavily API
 * Free tier: 1000 searches/month
 */

import { logger } from '../logger.js';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

/**
 * Search the web using Tavily API
 * @param query Search query
 * @param apiKey Tavily API key
 * @param maxResults Maximum number of results (default: 5)
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  if (!apiKey) {
    throw new Error('Tavily API key not configured');
  }

  logger.info('Web search:', { query, maxResults });

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavily API error: ${response.status} ${error}`);
    }

    const data: TavilyResponse = await response.json();
    logger.info('Web search results:', { count: data.results.length });

    return data.results.map(result => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
    }));
  } catch (error) {
    logger.error('Web search failed:', error);
    throw error;
  }
}
