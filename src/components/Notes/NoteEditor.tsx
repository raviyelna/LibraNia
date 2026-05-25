import { useState, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { useNote, useUpdateNote, useDeleteNote } from '../../hooks/useNotes';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { note, loading } = useNote(noteId);
  const { updateNote } = useUpdateNote();
  const { deleteNote } = useDeleteNote();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
    }
  }, [note]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;

    try {
      const startState = EditorState.create({
        doc: body,
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
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      editorViewRef.current = view;

      return () => {
        view.destroy();
        editorViewRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize CodeMirror:', error);
    }
  }, []);

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
      await deleteNote(noteId, false); // Soft delete
    }
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
    <div className="note-editor flex flex-col h-full">
      <div className="editor-header p-4 border-b border-border">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full px-3 py-2 mb-3 text-2xl font-bold bg-background border-none text-foreground placeholder-secondary focus:outline-none"
        />
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="editor-body flex-1 overflow-y-auto p-4">
        <div ref={editorRef} className="editor-container" />
      </div>
    </div>
  );
}
