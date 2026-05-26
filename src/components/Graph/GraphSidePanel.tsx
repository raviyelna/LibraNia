import { NoteEditor } from '../Notes/NoteEditor';

interface GraphSidePanelProps {
  noteId: string;
  onClose: () => void;
}

export function GraphSidePanel({ noteId, onClose }: GraphSidePanelProps) {
  return (
    <div className="fixed right-0 top-0 w-96 h-full bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
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
