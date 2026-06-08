import { useMemo, useRef, useState, useEffect } from 'react';
import { useNotes, useCreateNote } from '../../hooks/useNotes';
import { contentAPI, notesAPI, searchAPI, type Note, type SearchResult } from '../../api';
import { Check, ChevronDown, ChevronRight, FileUp, FolderPlus, FolderTree, List, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { DATA_EVENTS, emitDataUpdated } from '../../utils/data-events';

interface NotesListProps {
  selectedNoteId?: string;
  onSelectNote: (noteId: string) => void;
}

export function NotesList({ selectedNoteId, onSelectNote }: NotesListProps) {
  const { notes, loading } = useNotes();
  const { createNote } = useCreateNote();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingGroupNoteId, setEditingGroupNoteId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [grouped, setGrouped] = useState(() => localStorage.getItem('librania:notes-grouped') !== 'false');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('librania:note-group-collapsed') || '{}');
    } catch {
      return {};
    }
  });
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const searchNotes = async () => {
      setSearching(true);
      try {
        const results = await searchAPI.search(searchQuery, 'fullText');
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchNotes, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const displayNotes = searchQuery.trim() ? searchResults : notes || [];
  const groupingEnabled = grouped && !searchQuery.trim();

  useEffect(() => {
    localStorage.setItem('librania:notes-grouped', String(grouped));
  }, [grouped]);

  useEffect(() => {
    localStorage.setItem('librania:note-group-collapsed', JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const noteGroups = useMemo(() => groupNotes(displayNotes), [displayNotes]);
  const groupOptions = useMemo(() => {
    const labels = new Set(noteGroups.map((group) => group.label).filter((label) => label !== 'Other'));
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [noteGroups]);

  const handleCreateNote = async () => {
    const note = await createNote({ title: 'Untitled', body: '' });
    onSelectNote(note.id);
  };

  const handleImportNote = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setImporting(true);
    let importedCount = 0;
    let lastImportedId: string | null = null;
    try {
      for (const file of files) {
        try {
          const imported = await contentAPI.importNote(file);
          importedCount += 1;
          lastImportedId = imported.note.id;
        } catch (error) {
          console.error(`Import note failed for ${file.name}:`, error);
          toast.error(`${file.name}: ${error instanceof Error ? error.message : 'Failed to import note.'}`);
        }
      }

      emitDataUpdated(DATA_EVENTS.notes);
      if (lastImportedId) {
        onSelectNote(lastImportedId);
      }
      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} note${importedCount === 1 ? '' : 's'}`);
      }
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const startEditingGroup = (note: SidebarNote) => {
    if (!isEditableNote(note)) return;
    setEditingGroupNoteId(note.id);
    setGroupDraft(getManualGroup(note) || inferGroupLabel(note));
  };

  const saveManualGroup = async (note: SidebarNote, groupName: string) => {
    if (!isEditableNote(note)) return;

    const normalizedGroupName = groupName.trim();
    setSavingGroup(true);
    try {
      const metadata = setNoteGroupMetadata(note.metadata, normalizedGroupName || null);
      await notesAPI.update(note.id, { metadata });
      emitDataUpdated(DATA_EVENTS.notes);
      setEditingGroupNoteId(null);
      setGroupDraft('');
      toast.success(normalizedGroupName ? `Moved to ${normalizedGroupName}` : 'Removed manual group');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update note group');
    } finally {
      setSavingGroup(false);
    }
  };

  if (loading && !searchQuery) {
    return (
      <div className="notes-list p-4">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="notes-list flex flex-col h-full">
      <div className="notes-list-header p-4 border-b border-border">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 mb-3 bg-background border border-border rounded-md text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={handleCreateNote}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            New Note
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            title="Import a document as a note"
            aria-label="Import note"
            className="inline-flex items-center justify-center rounded-md border border-border px-3 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp size={17} />
          </button>
          <input
            ref={importInputRef}
            type="file"
            multiple
            accept=".md,.txt,.pdf,.docx,.csv,.html,.htm,.json,.rtf"
            onChange={handleImportNote}
            className="hidden"
          />
        </div>
        <button
          type="button"
          onClick={() => setGrouped((value) => !value)}
          aria-pressed={groupingEnabled}
          className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(searchQuery.trim())}
          title={searchQuery.trim() ? 'Grouping is hidden while searching' : 'Toggle note grouping'}
        >
          {groupingEnabled ? <FolderTree size={15} /> : <List size={15} />}
          {groupingEnabled ? 'Grouped notes' : 'Flat list'}
        </button>
        {importing && <p className="mt-2 text-xs text-secondary">Importing and linking note...</p>}
      </div>

      <div className="notes-list-items flex-1 overflow-y-auto">
        {searching ? (
          <div className="p-4 text-center text-secondary">Searching...</div>
        ) : displayNotes.length === 0 ? (
          <div className="p-4 text-center text-secondary">
            {searchQuery ? 'No matching notes' : 'No notes yet'}
          </div>
        ) : groupingEnabled ? (
          noteGroups.map(group => {
            const collapsed = collapsedGroups[group.key] ?? false;
            return (
              <section key={group.key} className="border-b border-border/70">
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((current) => ({
                    ...current,
                    [group.key]: !collapsed,
                  }))}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase text-secondary transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-secondary">
                    {group.notes.length}
                  </span>
                </button>
                {!collapsed && group.notes.map(note => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    selected={selectedNoteId === note.id}
                    onSelect={() => onSelectNote(note.id)}
                    groupOptions={groupOptions}
                    editingGroup={editingGroupNoteId === note.id}
                    groupDraft={editingGroupNoteId === note.id ? groupDraft : ''}
                    savingGroup={savingGroup}
                    onStartEditingGroup={() => startEditingGroup(note)}
                    onGroupDraftChange={setGroupDraft}
                    onCancelEditingGroup={() => setEditingGroupNoteId(null)}
                    onSaveGroup={(groupName) => void saveManualGroup(note, groupName)}
                  />
                ))}
              </section>
            );
          })
        ) : (
          displayNotes.map(note => (
            <NoteListItem
              key={note.id}
              note={note}
              selected={selectedNoteId === note.id}
              onSelect={() => onSelectNote(note.id)}
              groupOptions={groupOptions}
              editingGroup={editingGroupNoteId === note.id}
              groupDraft={editingGroupNoteId === note.id ? groupDraft : ''}
              savingGroup={savingGroup}
              onStartEditingGroup={() => startEditingGroup(note)}
              onGroupDraftChange={setGroupDraft}
              onCancelEditingGroup={() => setEditingGroupNoteId(null)}
              onSaveGroup={(groupName) => void saveManualGroup(note, groupName)}
            />
          ))
        )}
      </div>
    </div>
  );
}

type SidebarNote = Note | SearchResult;

interface NoteGroup {
  key: string;
  label: string;
  notes: SidebarNote[];
}

interface NoteListItemProps {
  note: SidebarNote;
  selected: boolean;
  groupOptions: string[];
  editingGroup: boolean;
  groupDraft: string;
  savingGroup: boolean;
  onSelect: () => void;
  onStartEditingGroup: () => void;
  onGroupDraftChange: (value: string) => void;
  onCancelEditingGroup: () => void;
  onSaveGroup: (groupName: string) => void;
}

function NoteListItem({
  note,
  selected,
  groupOptions,
  editingGroup,
  groupDraft,
  savingGroup,
  onSelect,
  onStartEditingGroup,
  onGroupDraftChange,
  onCancelEditingGroup,
  onSaveGroup,
}: NoteListItemProps) {
  const manualGroup = isEditableNote(note) ? getManualGroup(note) : '';

  return (
    <div
      className={`cursor-pointer border-b border-border p-4 transition-colors hover:bg-accent ${
        selected ? 'selected bg-accent' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 truncate font-medium text-foreground">{note.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
            <span>{new Date(note.updated_at).toLocaleDateString()}</span>
            {manualGroup && (
              <span className="max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {manualGroup}
              </span>
            )}
          </div>
        </div>
        {isEditableNote(note) && (
          <button
            type="button"
            aria-label="Edit note group"
            title="Edit note group"
            onClick={(event) => {
              event.stopPropagation();
              onStartEditingGroup();
            }}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-secondary transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <FolderPlus size={15} />
          </button>
        )}
      </div>
      {editingGroup && (
        <div
          className="mt-3 space-y-2"
          onClick={(event) => event.stopPropagation()}
        >
          {groupOptions.length > 0 && (
            <select
              value={groupOptions.includes(groupDraft) ? groupDraft : ''}
              onChange={(event) => onGroupDraftChange(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Choose existing group"
            >
              <option value="">Choose existing group...</option>
              {groupOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={groupDraft}
            onChange={(event) => onGroupDraftChange(event.target.value)}
            placeholder="New or existing group"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <button
              type="button"
              onClick={() => onSaveGroup(groupDraft)}
              disabled={savingGroup}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={13} />
              Save
            </button>
            {manualGroup && (
              <button
                type="button"
                onClick={() => onSaveGroup('')}
                disabled={savingGroup}
                className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                title="Remove manual group"
                aria-label="Remove manual group"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={onCancelEditingGroup}
              disabled={savingGroup}
              className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function groupNotes(notes: SidebarNote[]): NoteGroup[] {
  const groups = new Map<string, NoteGroup>();

  for (const note of notes) {
    const label = inferGroupLabel(note);
    const key = label.toLowerCase();
    const group = groups.get(key) ?? { key, label, notes: [] };
    group.notes.push(note);
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.label === 'Other') return 1;
    if (b.label === 'Other') return -1;
    return a.label.localeCompare(b.label);
  });
}

function inferGroupLabel(note: SidebarNote): string {
  if (isEditableNote(note)) {
    const manualGroup = getManualGroup(note);
    if (manualGroup) return manualGroup;
  }

  const noteTags = 'tags' in note && Array.isArray(note.tags) ? note.tags : [];
  const sourceTag = noteTags.find((tag) => isKnownSourceTag(tag));
  if (sourceTag) return formatGroupLabel(sourceTag);

  const tagGroup = noteTags.find((tag) => isCollectionTag(tag));
  if (tagGroup) return formatGroupLabel(tagGroup);

  const title = note.title.trim();
  const knownSource = [
    { pattern: /^PortSwigger\b/i, label: 'PortSwigger' },
    { pattern: /^ired\.?team\b/i, label: 'ired.team' },
    { pattern: /^Atomic Red Team\b/i, label: 'Atomic Red Team' },
  ].find((source) => source.pattern.test(title));

  if (knownSource) return knownSource.label;

  const separatorMatch = title.match(/^(.+?)(?:\s+-\s+|\s+--\s+|:\s+)/);
  if (separatorMatch?.[1] && separatorMatch[1].length <= 42) {
    return separatorMatch[1].trim();
  }

  return 'Other';
}

function isEditableNote(note: SidebarNote): note is Note {
  return 'metadata' in note || 'tags' in note;
}

function getManualGroup(note: Note): string {
  try {
    const metadata = note.metadata ? JSON.parse(note.metadata) : {};
    return typeof metadata.noteGroup === 'string' ? metadata.noteGroup.trim() : '';
  } catch {
    return '';
  }
}

function setNoteGroupMetadata(metadata: string | undefined, groupName: string | null): string {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = metadata ? JSON.parse(metadata) : {};
  } catch {
    parsed = {};
  }

  if (groupName) {
    parsed.noteGroup = groupName;
  } else {
    delete parsed.noteGroup;
  }

  return JSON.stringify(parsed);
}

function isKnownSourceTag(tag: string): boolean {
  return ['ired-team', 'portswigger', 'web-security-academy', 'atomic-red-team'].includes(tag.toLowerCase());
}

function isCollectionTag(tag: string): boolean {
  const normalized = tag.toLowerCase();
  const genericTags = new Set([
    'index',
    'example-code',
    'web-security',
    'security-testing',
    'security-research',
    'offensive-security',
    'mitre-attack',
    'red-team-notes',
    'adversary-emulation',
  ]);

  return !genericTags.has(normalized);
}

function formatGroupLabel(value: string): string {
  const knownLabels: Record<string, string> = {
    'ired-team': 'ired.team',
    portswigger: 'PortSwigger',
    'web-security-academy': 'PortSwigger',
    'atomic-red-team': 'Atomic Red Team',
  };
  const normalized = value.toLowerCase();
  if (knownLabels[normalized]) return knownLabels[normalized];

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
