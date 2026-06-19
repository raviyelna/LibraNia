import { useState, useCallback } from 'react';
import { searchAPI } from '../api';
import { handleAPIError } from '../utils/toast';

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
        case 'semantic':
          data = await searchAPI.semantic(query);
          break;
        case 'quickNav':
        case 'fullText':
        case 'fuzzy':
        default:
          data = await searchAPI.search(query, mode);
          break;
      }

      setResults(data);
    } catch (err) {
      handleAPIError(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, results, loading };
}
