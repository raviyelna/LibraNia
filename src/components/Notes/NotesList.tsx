import { useState } from 'react';
import { useNotes, useCreateNote } from '../../hooks/useNotes';

interface NotesListProps {
  selectedNoteId?: string;
  onSelectNote: (noteId: string) => void;
}

export function NotesList({ selectedNoteId, onSelectNote }: NotesListProps) {
  const { notes, loading } = useNotes();
  const { createNote } = useCreateNote();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = (notes || []).filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNote = async () => {
    const note = await createNote({ title: 'Untitled', body: '' });
    onSelectNote(note.id);
  };

  if (loading) {
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
        <button
          onClick={handleCreateNote}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          New Note
        </button>
      </div>

      <div className="notes-list-items flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-secondary">
            {searchQuery ? 'No matching notes' : 'No notes yet'}
          </div>
        ) : (
          filteredNotes.map(note => (
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
