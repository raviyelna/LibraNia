import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useSearch } from '../../hooks/useSearch';

interface QuickNavProps {
  onNavigate: (noteId: string) => void;
}

export function QuickNav({ onNavigate }: QuickNavProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { search, results, loading } = useSearch();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      search(query, 'quickNav');
      setSelectedIndex(0);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onNavigate(results[selectedIndex].id);
      setOpen(false);
      setQuery('');
    }
  };

  const handleClick = (noteId: string) => {
    onNavigate(noteId);
    setOpen(false);
    setQuery('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background border border-border rounded-lg shadow-lg z-50 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes..."
            autoFocus
            className="w-full px-4 py-3 bg-background border border-border rounded-md text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary mb-4"
          />

          {loading && (
            <div className="text-secondary text-sm p-4">Searching...</div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-secondary text-sm p-4">No results found</div>
          )}

          {results.length > 0 && (
            <ul className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <li
                  key={result.id}
                  role="listitem"
                  className={`px-4 py-3 cursor-pointer rounded-md transition-colors ${
                    index === selectedIndex ? 'selected bg-accent' : 'hover:bg-accent'
                  }`}
                  onClick={() => handleClick(result.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="font-medium text-foreground">{result.title}</div>
                  <div className="text-xs text-secondary mt-1">
                    {new Date(result.updated_at).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!query && (
            <div className="text-secondary text-sm p-4 text-center">
              Type to search notes...
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
