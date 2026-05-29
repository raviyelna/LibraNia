import { search } from 'duck-duck-scrape';
export class WebSearchService {
    async search(query, maxResults = 5) {
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
        }
        catch (error) {
            console.error('Web search failed:', error);
            return [];
        }
    }
    formatResultsForPrompt(results) {
        if (results.length === 0)
            return '';
        return `\n\nWeb search results:\n${results
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
            .join('\n\n')}`;
    }
    extractCitations(results) {
        return results.map((r, index) => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            position: index + 1,
        }));
    }
}
