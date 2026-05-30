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
import { BacklinksPanel } from './BacklinksPanel';
import { RelatedPanel } from './RelatedPanel';
import { Eye, Edit, Columns } from 'lucide-react';
import { contentAPI } from '../../api/content';

interface NoteEditorProps {
  noteId: string;
}

type ViewMode = 'edit' | 'preview' | 'split';

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { note, loading } = useNote(noteId);
  const { updateNote } = useUpdateNote();
  const { deleteNote } = useDeleteNote();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
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
                  alert('Failed to save image. Please try again.');
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

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!note) return;

    const timer = setTimeout(() => {
      if (title !== note.title || body !== note.body) {
        updateNote({ id: noteId, title, body });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, body, note, noteId, updateNote]);

  const handleDelete = async () => {
    if (confirm(`Delete note "${title}"?`)) {
      await deleteNote(noteId); // Soft delete
    }
  };

  const handleNavigate = (targetNoteId: string) => {
    // Navigation will be handled by parent component or router
    // For now, just log the navigation intent
    console.log('Navigate to note:', targetNoteId);
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
        <div className="editor-header p-4 border-b border-border">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="w-full px-3 py-2 mb-3 text-2xl font-bold bg-background border-none text-foreground placeholder-secondary focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border border-border rounded-md">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 rounded-l-md transition-colors ${
                  viewMode === 'edit' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
                title="Edit mode"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors ${
                  viewMode === 'split' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
                title="Split mode"
              >
                <Columns size={14} />
                Split
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 rounded-r-md transition-colors ${
                  viewMode === 'preview' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
                title="Preview mode"
              >
                <Eye size={14} />
                Preview
              </button>
            </div>
            <button
              onClick={handleDelete}
              className="ml-auto px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="editor-body flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Editor pane - always mounted but hidden when not needed */}
          <div
            className={`editor-pane ${viewMode === 'split' ? 'md:w-1/2 md:border-r border-border' : 'w-full'} overflow-y-auto p-4`}
            style={{ display: viewMode === 'preview' ? 'none' : 'block' }}
          >
            <div ref={editorRef} className="editor-container" />
          </div>

          {/* Preview pane */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`preview-pane ${viewMode === 'split' ? 'md:w-1/2' : 'w-full'} overflow-y-auto p-4`}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
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
                        <img {...props} src={imgSrc} className="max-w-full h-auto rounded" loading="lazy" />
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
