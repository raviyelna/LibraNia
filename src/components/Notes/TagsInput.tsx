import { KeyboardEvent, useMemo, useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { useTags, useNoteTags } from '../../hooks/useTags';

interface TagsInputProps {
  noteId: string;
}

export function TagsInput({ noteId }: TagsInputProps) {
  const { tags: allTags } = useTags();
  const { tags: noteTags, loading, addTag, removeTag } = useNoteTags(noteId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const availableTags = useMemo(() => {
    const linkedIds = new Set(noteTags.map(tag => tag.id));
    const normalizedQuery = query.trim().toLowerCase();
    return allTags.filter(tag =>
      !linkedIds.has(tag.id) && tag.name.toLowerCase().includes(normalizedQuery)
    );
  }, [allTags, noteTags, query]);

  const handleAdd = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || busy) return;

    setBusy(true);
    await addTag(trimmedName);
    setQuery('');
    setBusy(false);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleAdd(query);
    }
    if (event.key === 'Escape') setOpen(false);
  };

  if (loading) {
    return (
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm text-secondary">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
          <Tag size={14} />
          Tags
        </div>
        {noteTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => void removeTag(tag.id)}
              className="rounded-full p-0.5 transition-colors hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={`Remove tag ${tag.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <div className="relative min-w-48 flex-1">
          <label htmlFor="note-tag-input" className="sr-only">Add a tag</label>
          <div className="flex items-center gap-1">
            <Plus size={14} className="text-secondary" />
            <input
              id="note-tag-input"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 100)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              placeholder="Add or create a tag..."
              className="w-full bg-transparent py-1 text-sm text-foreground placeholder-secondary focus:outline-none"
            />
          </div>

          {open && (availableTags.length > 0 || query.trim()) && (
            <div className="tag-picker-menu absolute left-0 top-full z-30 mt-2 max-h-56 w-full min-w-64 overflow-y-auto rounded-lg border border-border p-1 shadow-xl ring-1 ring-foreground/10">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => void handleAdd(tag.name)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Tag size={14} className="text-secondary" />
                  {tag.name}
                </button>
              ))}
              {query.trim() && !allTags.some(tag => tag.name.toLowerCase() === query.trim().toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => void handleAdd(query)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Plus size={14} />
                  Create "{query.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
