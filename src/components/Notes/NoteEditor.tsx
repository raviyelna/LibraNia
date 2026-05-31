import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { useNote, useUpdateNote, useDeleteNote } from '../../hooks/useNotes';
import { Eye, Edit, Columns, Save, Trash2 } from 'lucide-react';
import { contentAPI } from '../../api/content';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface NoteEditorProps {
  noteId: string;
  defaultViewMode?: ViewMode;
  compact?: boolean;
}

type ViewMode = 'edit' | 'preview' | 'split';

export function NoteEditor({ noteId, defaultViewMode = 'split', compact = false }: NoteEditorProps) {
  const { note, loading } = useNote(noteId);
  const { updateNote, loading: saving } = useUpdateNote();
  const { deleteNote } = useDeleteNote();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [savedContent, setSavedContent] = useState({ title: '', body: '' });
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setSavedContent({ title: note.title, body: note.body });
    }
  }, [note]);

  // Initialize CodeMirror (wait for note to load)
  useEffect(() => {
    console.log('[NoteEditor] Init effect:', {
      hasEditorRef: !!editorRef.current,
      hasNote: !!note,
      hasEditorView: !!editorViewRef.current,
      noteId
    });

    if (!editorRef.current || !note) return;

    // Skip if editor already exists for this note
    if (editorViewRef.current) return;

    console.log('[NoteEditor] Creating CodeMirror editor');

    try {
      // Handle paste events for images
      const handlePaste = (event: ClipboardEvent): boolean => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        let hasImage = false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            hasImage = true;
            event.preventDefault();
            event.stopPropagation();

            const file = item.getAsFile();
            if (!file) continue;

            try {
              const reader = new FileReader();
              reader.onload = async (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;

                try {
                  // Save image to disk
                  const result = await contentAPI.saveImage({
                    buffer: arrayBuffer,
                    filename: file.name || 'image.png',
                    noteId: noteId,
                  });

                  // Insert markdown with file path
                  const view = editorViewRef.current;
                  if (view) {
                    const pos = view.state.selection.main.head;
                    const imageMarkdown = `![${file.name}](${result.filePath})\n`;
                    view.dispatch({
                      changes: { from: pos, insert: imageMarkdown }
                    });
                  }
                } catch (error) {
                  console.error('Failed to save pasted image:', error);
                  toast.error('Failed to save image. Please try again.');
                }
              };
              reader.readAsArrayBuffer(file);
            } catch (error) {
              console.error('Failed to handle pasted image:', error);
            }
          }
        }

        return hasImage; // Return true to prevent default if image found
      };

      const startState = EditorState.create({
        doc: note.body,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setBody(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            paste: (event) => {
              const handled = handlePaste(event);
              return handled; // Return true to prevent default
            }
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      editorViewRef.current = view;
      console.log('[NoteEditor] CodeMirror created successfully');

      return () => {
        console.log('[NoteEditor] Destroying CodeMirror');
        view.destroy();
        editorViewRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize CodeMirror:', error);
    }
  }, [noteId, note]); // Recreate when noteId changes OR when note loads

  // Update editor content when body changes externally
  useEffect(() => {
    if (editorViewRef.current && note) {
      const currentDoc = editorViewRef.current.state.doc.toString();
      if (currentDoc !== note.body) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: note.body,
          },
        });
      }
    }
  }, [note]);

  const hasPendingChanges = title !== savedContent.title || body !== savedContent.body;

  const handleSave = async () => {
    if (!hasPendingChanges || saving) return;

    try {
      const updatedNote = await updateNote({ id: noteId, title, body });
      setSavedContent({ title: updatedNote.title, body: updatedNote.body });
    } catch {
      // useUpdateNote already reports API errors to the user.
    }
  };

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!note || !hasPendingChanges || saving) return;

    const timer = setTimeout(() => {
      void handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, body, note, hasPendingChanges, saving]);

  const handleDelete = async () => {
    await deleteNote(noteId); // Soft delete
    setDeleteDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="note-editor p-4">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="note-editor p-4">
        <div className="text-secondary">Note not found</div>
      </div>
    );
  }

  return (
    <div className="note-editor flex h-full">
      <div className="editor-main flex-1 flex flex-col">
        <div className="editor-header sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            aria-label="Note title"
            className={`w-full bg-transparent px-1 py-1 font-bold tracking-tight text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              compact ? 'mb-2 text-xl' : 'mb-3 text-2xl md:text-3xl'
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="group" aria-label="Note view mode">
              <button
                onClick={() => setViewMode('edit')}
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  viewMode === 'edit' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:bg-background/70 hover:text-foreground'
                }`}
                title="Edit mode"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  viewMode === 'split' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:bg-background/70 hover:text-foreground'
                }`}
                title="Split mode"
              >
                <Columns size={14} />
                Split
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  viewMode === 'preview' ? 'bg-background text-primary shadow-sm' : 'text-secondary hover:bg-background/70 hover:text-foreground'
                }`}
                title="Preview mode"
              >
                <Eye size={14} />
                Preview
              </button>
            </div>
            <button
              onClick={() => void handleSave()}
              disabled={!hasPendingChanges || saving}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              title="Save note"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive"
              title="Delete note"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <div className="editor-body flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Editor pane - always mounted but hidden when not needed */}
          <div
            className={`editor-pane ${viewMode === 'split' ? 'md:w-1/2 md:border-r border-border' : 'w-full'} overflow-y-auto bg-muted/20 p-4`}
            style={{ display: viewMode === 'preview' ? 'none' : 'block' }}
          >
            <div ref={editorRef} className="editor-container" />
          </div>

          {/* Preview pane */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`preview-pane ${viewMode === 'split' ? 'md:w-1/2' : 'w-full'} overflow-y-auto bg-muted/20 p-4 md:p-6`}>
              <article className={`note-reading-surface mx-auto rounded-xl border border-border bg-background shadow-sm ${
                compact ? 'max-w-3xl px-5 py-6' : 'max-w-4xl px-5 py-7 md:px-10 md:py-10'
              }`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    img: ({ node, src, ...props }) => {
                      // Convert absolute file paths to librania:// protocol
                      let imgSrc = src;
                      if (src && (src.startsWith('C:\\') || src.startsWith('/') || src.includes('AppData'))) {
                        imgSrc = `librania://${src.replace(/\\/g, '/')}`;
                      }
                      return (
                        <img {...props} src={imgSrc} className="h-auto max-w-full rounded-lg border border-border shadow-sm" loading="lazy" />
                      );
                    },
                    code: ({ node, className, children, ...props }) => {
                      const inline = !className;
                      return inline ? (
                        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-muted p-2 rounded text-sm overflow-x-auto" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {body}
                </ReactMarkdown>
              </article>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete note?"
        description={`Delete "${title}"? You can restore it from the archive if needed.`}
        confirmLabel="Delete note"
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
