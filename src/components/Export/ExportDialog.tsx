import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { exportAPI, notesAPI, tagsAPI } from '../../api';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNoteId?: string;
}

type ExportFormat = 'markdown' | 'json';
type ExportScope = 'current' | 'all' | 'tag' | 'selected';

interface Tag {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
}

export function ExportDialog({ open, onOpenChange, currentNoteId }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [scope, setScope] = useState<ExportScope>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Load tags and notes when dialog opens
  useEffect(() => {
    if (open) {
      loadTags();
      loadNotes();
      setResult(null);
    }
  }, [open]);

  const loadTags = async () => {
    try {
      const allTags = await tagsAPI.getAll();
      setTags(allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const allNotes = await notesAPI.getAll();
      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setResult(null);

    try {
      // Determine note IDs based on scope
      let noteIds: string[] = [];

      if (scope === 'current' && currentNoteId) {
        noteIds = [currentNoteId];
      } else if (scope === 'all') {
        const allNotes = await notesAPI.getAll();
        noteIds = allNotes.map((n) => n.id);
      } else if (scope === 'tag' && selectedTag) {
        const tagNotes = await tagsAPI.getNotesByTag(selectedTag);
        noteIds = tagNotes.map((n) => n.id);
      } else if (scope === 'selected') {
        noteIds = selectedNotes;
      }

      if (noteIds.length === 0) {
        setResult('No notes to export');
        return;
      }

      const count = await exportAPI.download(format, noteIds);
      setResult(`Downloaded ${count} note${count !== 1 ? 's' : ''} as ${format === 'markdown' ? 'Markdown' : 'JSON'}`);
    } catch (error: any) {
      setResult(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Notes</DialogTitle>
          <DialogDescription>
            Choose format and scope for exporting your notes
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Format Selection */}
          <div className="grid gap-2">
            <label htmlFor="format" className="text-sm font-medium text-foreground">
              Format
            </label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="markdown">Markdown (.md file)</option>
              <option value="json">JSON (single file)</option>
            </select>
          </div>

          {/* Scope Selection */}
          <div className="grid gap-2">
            <label htmlFor="scope" className="text-sm font-medium text-foreground">
              Scope
            </label>
            <select
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as ExportScope)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="current" disabled={!currentNoteId}>
                Current note {!currentNoteId && '(no note selected)'}
              </option>
              <option value="all">All notes</option>
              <option value="tag">By tag</option>
              <option value="selected">Selected notes</option>
            </select>
          </div>

          {/* Tag Selection (conditional) */}
          {scope === 'tag' && (
            <div className="grid gap-2">
              <label htmlFor="tag" className="text-sm font-medium text-foreground">
                Tag
              </label>
              <select
                id="tag"
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select tag...</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note Selection (conditional) */}
          {scope === 'selected' && (
            <div className="grid gap-2">
              <label htmlFor="notes" className="text-sm font-medium text-foreground">
                Notes
              </label>
              <select
                id="notes"
                multiple
                value={selectedNotes}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedNotes(selected);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[120px]"
              >
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-secondary">Hold Ctrl/Cmd to select multiple notes</p>
            </div>
          )}

          {/* Result Message */}
          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.includes('failed') || result.includes('cancelled')
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : result.includes('No notes')
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'bg-green-500/10 text-green-500 border border-green-500/20'
              }`}
            >
              {result}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
