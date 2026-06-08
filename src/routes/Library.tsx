import { useEffect, useRef, useState } from 'react';
import { NotesList } from '../components/Notes/NotesList';
import { NoteEditor } from '../components/Notes/NoteEditor';
import { LibraryContextPanel } from '../components/Notes/LibraryContextPanel';
import { LibrarianAskPanel } from '../components/Notes/LibrarianAskPanel';
import { TagsInput } from '../components/Notes/TagsInput';
import { TagManagement } from '../components/Notes/TagManagement';
import { QuickNav } from '../components/Notes/QuickNav';
import { ExportDialog } from '../components/Export/ExportDialog';
import { ContentUpload } from '../components/ContentUpload';
import { ContentList } from '../components/ContentList';
import { useContent, useDeleteContent } from '../hooks/useContent';
import { ChevronDown, ChevronUp, Download, Menu, X, Brain, Tags, SlidersHorizontal } from 'lucide-react';

export function LibraryPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'content' | 'tags'>('notes');
  const [managementOpen, setManagementOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [librarianOpen, setLibrarianOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = Number(localStorage.getItem('librania:notes-sidebar-width'));
    return Number.isFinite(savedWidth) && savedWidth >= 220 && savedWidth <= 520 ? savedWidth : 288;
  });
  const resizingRef = useRef(false);

  const { content, loading: contentLoading, refetch: refetchContent } = useContent(selectedNoteId);
  const { deleteContent } = useDeleteContent();

  useEffect(() => {
    localStorage.setItem('librania:notes-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      setSidebarWidth(Math.min(520, Math.max(220, event.clientX)));
    };

    const stopResize = () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResize);
      stopResize();
    };
  }, []);

  const handleUploadComplete = async () => {
    await refetchContent();
  };

  const handleDeleteContent = async (id: string) => {
    await deleteContent(id);
    await refetchContent();
  };

  return (
    <div className="library-layout flex h-screen relative">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-md shadow-lg"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Left sidebar - notes list */}
      <aside
        style={{ width: sidebarWidth, maxWidth: '85vw' }}
        className={`notes-sidebar relative shrink-0 border-r border-border overflow-y-auto scrollable bg-background
        fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="border-b border-border p-4">
          <button
            onClick={() => setExportDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors duration-200"
          >
            <Download size={16} />
            Export Notes
          </button>
        </div>
        <NotesList
          selectedNoteId={selectedNoteId || undefined}
          onSelectNote={(id) => {
            setSelectedNoteId(id);
            setSidebarOpen(false); // Close sidebar on mobile after selection
          }}
        />
        <button
          type="button"
          aria-label="Resize notes sidebar"
          title="Resize notes sidebar"
          onMouseDown={() => {
            resizingRef.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute right-0 top-0 hidden h-full w-2 translate-x-1 cursor-col-resize items-center justify-center outline-none transition-colors hover:bg-primary/20 focus:bg-primary/20 lg:flex"
        >
          <span className="h-12 w-1 rounded-full bg-border" />
        </button>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="notes-main flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0">
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Library</p>
            <p className="text-sm text-foreground">{managementOpen ? 'Management tools' : 'Reading mode'}</p>
          </div>
          <button
            type="button"
            onClick={() => setManagementOpen(open => {
              if (open) setActiveTab('notes');
              return !open;
            })}
            aria-expanded={managementOpen}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <SlidersHorizontal size={15} />
            {managementOpen ? 'Hide tools' : 'Manage note'}
            {managementOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {/* Management tools stay out of the reading surface until requested. */}
        {managementOpen && (
          <div className="tabs border-b border-border bg-background">
            <div className="flex">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 md:px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 md:px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors md:px-6 ${
                activeTab === 'tags'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              <Tags size={15} />
              Tags
            </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'notes' ? (
          <>
            {selectedNoteId ? (
              <>
                {managementOpen && <TagsInput noteId={selectedNoteId} />}
                <div className="flex-1 overflow-y-auto scrollable">
                  <NoteEditor noteId={selectedNoteId} />
                </div>
              </>
            ) : (
              <div className="empty-state flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-md">
                  <div className="flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <Brain className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Welcome to Your Library</h2>
                  <p className="text-secondary">Select a note from the sidebar or create a new one to get started</p>
                  <p className="text-secondary text-sm mt-4">
                    Press <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono">Cmd+K</kbd> for quick navigation
                  </p>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'content' ? (
          <div className="content-tab flex-1 overflow-y-auto scrollable">
            {selectedNoteId ? (
              <>
                <ContentUpload noteId={selectedNoteId} onUploadComplete={handleUploadComplete} />
                {contentLoading ? (
                  <div className="p-8 text-center text-secondary">Loading content...</div>
                ) : (
                  <ContentList content={content || []} onDelete={handleDeleteContent} />
                )}
              </>
            ) : (
              <div className="p-8 text-center text-secondary">
                Select a note to manage its uploaded content.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <TagManagement selectedNoteId={selectedNoteId} />
          </div>
        )}
      </main>

      {/* Right sidebar - reading context */}
      <aside className={`context-sidebar w-72 border-l border-border overflow-y-auto scrollable bg-background
        fixed xl:static inset-y-0 right-0 z-40 transform transition-transform duration-200
        ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}`}>
        {selectedNoteId && (
          <LibraryContextPanel
            noteId={selectedNoteId}
            onNavigate={setSelectedNoteId}
            onAsk={() => setLibrarianOpen(true)}
          />
        )}
      </aside>

      {/* Mobile reading context toggle button */}
      {selectedNoteId && (
        <button
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="xl:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
          title="Toggle reading context"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Overlay for mobile right sidebar */}
      {rightSidebarOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setRightSidebarOpen(false)}
        />
      )}

      <QuickNav onNavigate={setSelectedNoteId} />
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        currentNoteId={selectedNoteId || undefined}
      />
      {selectedNoteId && (
        <LibrarianAskPanel
          open={librarianOpen}
          noteId={selectedNoteId}
          onClose={() => setLibrarianOpen(false)}
          onNavigate={setSelectedNoteId}
        />
      )}
    </div>
  );
}
