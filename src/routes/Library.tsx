import { useState } from 'react';
import { NotesList } from '../components/Notes/NotesList';
import { NoteEditor } from '../components/Notes/NoteEditor';
import { BacklinksPanel } from '../components/Notes/BacklinksPanel';
import { TagsInput } from '../components/Notes/TagsInput';
import { QuickNav } from '../components/Notes/QuickNav';

export function LibraryPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    <div className="library-layout flex h-screen">
      <aside className="notes-sidebar w-64 border-r border-border overflow-y-auto">
        <NotesList
          selectedNoteId={selectedNoteId || undefined}
          onSelectNote={setSelectedNoteId}
        />
      </aside>

      <main className="notes-main flex-1 flex flex-col overflow-hidden">
        {selectedNoteId ? (
          <>
            <TagsInput noteId={selectedNoteId} />
            <div className="flex-1 overflow-y-auto">
              <NoteEditor noteId={selectedNoteId} />
            </div>
          </>
        ) : (
          <div className="empty-state flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Your Library</h2>
              <p className="text-secondary">Select a note or create a new one to get started</p>
              <p className="text-secondary text-sm mt-4">Press <kbd className="px-2 py-1 bg-accent rounded">Cmd+K</kbd> for quick navigation</p>
            </div>
          </div>
        )}
      </main>

      <aside className="backlinks-sidebar w-64 border-l border-border overflow-y-auto">
        {selectedNoteId && (
          <BacklinksPanel
            noteId={selectedNoteId}
            onNavigate={setSelectedNoteId}
          />
        )}
      </aside>

      <QuickNav onNavigate={setSelectedNoteId} />
    </div>
  );
}
