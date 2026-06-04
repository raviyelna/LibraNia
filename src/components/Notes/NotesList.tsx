import { useRef, useState, useEffect } from 'react';
import { useNotes, useCreateNote } from '../../hooks/useNotes';
import { contentAPI, searchAPI } from '../../api';
import { FileUp } from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
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
        {importing && <p className="mt-2 text-xs text-secondary">Importing and linking note...</p>}
      </div>

      <div className="notes-list-items flex-1 overflow-y-auto">
        {searching ? (
          <div className="p-4 text-center text-secondary">Searching...</div>
        ) : displayNotes.length === 0 ? (
          <div className="p-4 text-center text-secondary">
            {searchQuery ? 'No matching notes' : 'No notes yet'}
          </div>
        ) : (
          displayNotes.map(note => (
            <div
              key={note.id}
              className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                selectedNoteId === note.id ? 'selected bg-accent' : ''
              }`}
              onClick={() => onSelectNote(note.id)}
            >
              <h3 className="font-medium text-foreground mb-1 truncate">{note.title}</h3>
              <span className="text-sm text-secondary">
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
