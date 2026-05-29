import { search } from 'duck-duck-scrape';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface Citation {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

export class WebSearchService {
  /**
   * Search DuckDuckGo and return top results
   * @param query Search query string
   * @param maxResults Maximum number of results to return (default 5 per D-14)
   * @returns Array of search results with title, url, snippet
   */
  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    try {
      const results = await search(query, {
        safeSearch: 'moderate',
      });

      return results.results
        .slice(0, maxResults)
        .map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
        }));
    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  /**
   * Format search results for AI prompt injection
   * Creates numbered citation format [1], [2], [3] per D-16
   * @param results Array of search results
   * @returns Formatted string for AI prompt, or empty string if no results
   */
  formatResultsForPrompt(results: SearchResult[]): string {
    if (results.length === 0) return '';

    return `\n\nWeb search results:\n${results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
      .join('\n\n')}`;
  }

  /**
   * Extract citations from search results for database storage
   * Converts SearchResult[] to citation objects with position tracking per D-19
   * @param results Array of search results
   * @returns Array of citation objects ready for database storage
   */
  extractCitations(results: SearchResult[]): Citation[] {
    return results.map((r, index) => ({
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      position: index + 1,
    }));
  }
}
