import { useState, useEffect } from 'react';
import { useSearch } from '../../hooks/useSearch';
import { Search, X } from 'lucide-react';

interface GraphControlsProps {
  onSearchResults: (nodeIds: string[]) => void;
  nodeCount?: number;
  linkCount?: number;
}

/**
 * GraphControls Component
 *
 * Provides search integration for graph visualization.
 * Search uses existing useSearch hook (all modes: quickNav, fullText, fuzzy, semantic).
 */
export function GraphControls({ onSearchResults, nodeCount = 0, linkCount = 0 }: GraphControlsProps) {
  const [query, setQuery] = useState('');
  const { search, results, loading } = useSearch();

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
    <div className="absolute left-4 top-4 z-10 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">Knowledge Graph</h1>
          <p className="text-xs text-secondary">{nodeCount} notes · {linkCount} connections</p>
        </div>
        {loading && <span className="text-xs text-primary" aria-live="polite">Searching...</span>}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
        <input
          type="search"
          placeholder="Search graph..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-secondary transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Clear graph search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-secondary">
        Select a node to reveal its neighborhood and open the reading panel.
      </p>
    </div>
  );
}
