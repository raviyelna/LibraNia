import { useState, useEffect, useRef } from 'react';
import { NoteEditor } from '../Notes/NoteEditor';
import { BookOpen, X } from 'lucide-react';

interface GraphSidePanelProps {
  noteId: string;
  onClose: () => void;
}

export function GraphSidePanel({ noteId, onClose }: GraphSidePanelProps) {
  const [width, setWidth] = useState(384); // 384px = w-96 default
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      // Calculate new width: panel right edge - mouse X position
      const panelRect = panelRef.current.getBoundingClientRect();
      const newWidth = panelRect.right - e.clientX;

      // Clamp width between 256px (min) and 768px (max)
      const clampedWidth = Math.max(256, Math.min(768, newWidth));
      setWidth(clampedWidth);

      // Prevent text selection during resize
      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  return (
    <div
      ref={panelRef}
      className={`fixed right-0 top-0 z-50 flex h-full max-w-full flex-col overflow-hidden border-l border-border bg-background shadow-lg ${
        isResizing ? 'transition-none' : 'transition-all duration-150'
      }`}
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:border-l-2 hover:border-primary z-10"
        onMouseDown={handleResizeStart}
        aria-label="Resize panel"
        role="separator"
        aria-orientation="vertical"
      />

      <div className="flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Note</h2>
            <p className="text-xs text-secondary">Reader panel · explore without leaving the graph</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="cursor-pointer rounded-md p-2 text-secondary transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <NoteEditor noteId={noteId} defaultViewMode="preview" compact />
      </div>
    </div>
  );
}
