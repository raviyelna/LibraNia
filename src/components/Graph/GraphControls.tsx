import { useState, useEffect } from 'react';
import { useSearch } from '../../hooks/useSearch';

interface GraphControlsProps {
  onSearchResults: (nodeIds: string[]) => void;
}

/**
 * GraphControls Component
 *
 * Provides search integration for graph visualization.
 * Search uses existing useSearch hook (all modes: quickNav, fullText, fuzzy, semantic).
 */
export function GraphControls({ onSearchResults }: GraphControlsProps) {
  const [query, setQuery] = useState('');
  const { search, results } = useSearch();

  // Execute search when query changes
  useEffect(() => {
    if (query.trim()) {
      console.log('[GraphControls] Searching for:', query);
      search(query, 'quickNav');
    } else {
      // Clear results when query is empty
      onSearchResults([]);
    }
  }, [query, search, onSearchResults]);

  // Notify parent when results change
  useEffect(() => {
    // Ensure results is always an array
    const nodeIds = Array.isArray(results) && results ? results.map((r: any) => r.id) : [];
    console.log('[GraphControls] Search results:', results?.length ?? 0, 'nodes:', nodeIds);
    onSearchResults(nodeIds);
  }, [results, onSearchResults]);

  return (
    <div className="absolute top-4 left-4 bg-background p-4 rounded shadow border border-border z-10">
      <input
        type="text"
        placeholder="Search graph..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
