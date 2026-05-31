import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Search, Tag, Trash2, Unlink } from 'lucide-react';
import { tagsAPI, type Tag as TagRecord } from '../../api';
import { handleAPIError } from '../../utils/toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DATA_EVENTS, emitDataUpdated, subscribeDataUpdated } from '../../utils/data-events';

interface TagManagementProps {
  selectedNoteId: string | null;
}

export function TagManagement({ selectedNoteId }: TagManagementProps) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [linkedTagIds, setLinkedTagIds] = useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyTagId, setBusyTagId] = useState<string | null>(null);
  const [pendingDeleteTag, setPendingDeleteTag] = useState<TagRecord | null>(null);

  const loadTags = async () => {
    try {
      setLoading(true);
      const [allTags, noteTags] = await Promise.all([
        tagsAPI.getAll(),
        selectedNoteId ? tagsAPI.getByNote(selectedNoteId) : Promise.resolve([]),
      ]);
      setTags(allTags);
      setLinkedTagIds(new Set(noteTags.map(tag => tag.id)));
    } catch (error) {
      handleAPIError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, [selectedNoteId]);

  useEffect(() => subscribeDataUpdated(DATA_EVENTS.tags, () => void loadTags()), [selectedNoteId]);

  const filteredTags = useMemo(
    () => tags.filter(tag => tag.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query, tags]
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name) return;

    try {
      await tagsAPI.create({ name });
      setNewTagName('');
      await loadTags();
      emitDataUpdated(DATA_EVENTS.tags);
    } catch (error) {
      handleAPIError(error);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteTag) return;
    try {
      setBusyTagId(pendingDeleteTag.id);
      await tagsAPI.delete(pendingDeleteTag.id);
      setPendingDeleteTag(null);
      await loadTags();
      emitDataUpdated(DATA_EVENTS.tags);
    } catch (error) {
      handleAPIError(error);
    } finally {
      setBusyTagId(null);
    }
  };

  const handleToggleLink = async (tag: TagRecord) => {
    if (!selectedNoteId) return;

    try {
      setBusyTagId(tag.id);
      if (linkedTagIds.has(tag.id)) {
        await tagsAPI.removeFromNote(selectedNoteId, tag.id);
      } else {
        await tagsAPI.addToNote(selectedNoteId, tag.name);
      }
      await loadTags();
      emitDataUpdated(DATA_EVENTS.tags);
    } catch (error) {
      handleAPIError(error);
    } finally {
      setBusyTagId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 rounded-xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Tag management</h2>
              <p className="mt-1 text-sm leading-6 text-secondary">
                Create and delete global tags. {selectedNoteId
                  ? 'Use Link or Unlink to manage the selected note.'
                  : 'Select a note from the sidebar to manage its tag links.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="new-tag-name" className="sr-only">New tag name</label>
            <input
              id="new-tag-name"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="Create a tag..."
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!newTagName.trim()}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Create tag
            </button>
          </form>
        </header>

        <section className="rounded-xl border border-border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">All tags</h3>
              <p className="mt-0.5 text-xs text-secondary">{tags.length} tags in your library</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={15} />
              <label htmlFor="tag-search" className="sr-only">Search tags</label>
              <input
                id="tag-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tags..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary sm:w-64"
              />
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-secondary" aria-live="polite">Loading tags...</p>
          ) : filteredTags.length === 0 ? (
            <p className="p-6 text-sm text-secondary">
              {query ? 'No tags match your search.' : 'No tags yet. Create one to organize your notes.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredTags.map(tag => {
                const linked = linkedTagIds.has(tag.id);
                const busy = busyTagId === tag.id;

                return (
                  <li key={tag.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{tag.name}</span>
                        {linked && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Linked to selected note
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleLink(tag)}
                        disabled={!selectedNoteId || busy}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {linked ? <Unlink size={14} /> : <Link2 size={14} />}
                        {linked ? 'Unlink' : 'Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteTag(tag)}
                        disabled={busy}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={!!pendingDeleteTag}
        title="Delete tag?"
        description={`Delete "${pendingDeleteTag?.name ?? ''}" from the library? This removes it from every linked note.`}
        confirmLabel="Delete tag"
        onOpenChange={open => {
          if (!open) setPendingDeleteTag(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
