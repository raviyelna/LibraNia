import { useState, useCallback } from 'react';

interface SearchResult {
  id: string;
  title: string;
  updated_at: number;
  rank: number;
}

interface FullTextSearchResult {
  id: string;
  title: string;
  snippet: string;
  updated_at: number;
  score: number;
}

interface SemanticSearchResult {
  id: string;
  title: string;
  updated_at: number;
  similarity: number;
}

type SearchMode = 'quickNav' | 'fullText' | 'fuzzy' | 'semantic';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[] | FullTextSearchResult[] | SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, mode: SearchMode = 'quickNav') => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      let data;

      switch (mode) {
        case 'quickNav':
          data = await window.api.search.quickNav(query);
          break;
        case 'fullText':
          data = await window.api.search.fullText(query);
          break;
        case 'fuzzy':
          data = await window.api.search.fuzzy(query);
          break;
        case 'semantic':
          data = await window.api.search.semantic(query);
          break;
      }

      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, results, loading };
}
