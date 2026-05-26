import { useState, useEffect, useRef } from 'react';
import { NoteEditor } from '../Notes/NoteEditor';

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
      className={`fixed right-0 top-0 h-full bg-background border-l border-border shadow-lg z-50 overflow-y-auto ${
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

      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Note</h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="p-2 hover:bg-secondary rounded-md transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="p-4">
        <NoteEditor noteId={noteId} />
      </div>
    </div>
  );
}
