import { useState } from 'react';
import { NotesList } from '../components/Notes/NotesList';
import { NoteEditor } from '../components/Notes/NoteEditor';
import { BacklinksPanel } from '../components/Notes/BacklinksPanel';
import { TagsInput } from '../components/Notes/TagsInput';
import { QuickNav } from '../components/Notes/QuickNav';
import { ExportDialog } from '../components/Export/ExportDialog';
import { ContentUpload } from '../components/ContentUpload';
import { ContentList } from '../components/ContentList';
import { useContent, useDeleteContent } from '../hooks/useContent';
import { Download } from 'lucide-react';

export function LibraryPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'content'>('notes');

  const { content, loading: contentLoading, refetch: refetchContent } = useContent();
  const { deleteContent } = useDeleteContent();

  const handleUploadComplete = async () => {
    await refetchContent();
  };

  const handleDeleteContent = async (id: string) => {
    await deleteContent(id);
    await refetchContent();
  };

  return (
    <div className="library-layout flex h-screen">
      <aside className="notes-sidebar w-64 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <button
            onClick={() => setExportDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-accent/10 hover:bg-accent/20 rounded-md transition-colors"
          >
            <Download size={16} />
            Export Notes
          </button>
        </div>
        <NotesList
          selectedNoteId={selectedNoteId || undefined}
          onSelectNote={setSelectedNoteId}
        />
      </aside>

      <main className="notes-main flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="tabs border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              Content
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'notes' ? (
          <>
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
          </>
        ) : (
          <div className="content-tab flex-1 overflow-y-auto">
            <ContentUpload onUploadComplete={handleUploadComplete} />
            {contentLoading ? (
              <div className="p-8 text-center text-secondary">Loading content...</div>
            ) : (
              <ContentList content={content} onDelete={handleDeleteContent} />
            )}
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
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        currentNoteId={selectedNoteId || undefined}
      />
    </div>
  );
}
