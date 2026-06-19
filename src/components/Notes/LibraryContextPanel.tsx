import { useEffect, useState } from 'react';
import { BookOpenText, ChevronDown, ChevronUp, MessageCircleQuestion, StickyNote } from 'lucide-react';
import { RelatedPanel } from './RelatedPanel';

interface LibraryContextPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
  onAsk: () => void;
}

export function LibraryContextPanel({ noteId, onNavigate, onAsk }: LibraryContextPanelProps) {
  const [scratchpad, setScratchpad] = useState('');
  const [relatedOpen, setRelatedOpen] = useState(true);
  const [scratchpadOpen, setScratchpadOpen] = useState(true);
  const storageKey = `librania:reader-note:${noteId}`;

  useEffect(() => {
    setScratchpad(localStorage.getItem(storageKey) || '');
  }, [storageKey]);

  const handleScratchpadChange = (value: string) => {
    setScratchpad(value);
    localStorage.setItem(storageKey, value);
  };

  return (
    <div className="divide-y divide-border">
      <section>
        <button
          type="button"
          onClick={() => setRelatedOpen(open => !open)}
          aria-expanded={relatedOpen}
          className="flex w-full cursor-pointer items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
        >
          <span className="text-sm font-semibold text-foreground">Related notes</span>
          {relatedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {relatedOpen && <RelatedPanel noteId={noteId} onNavigate={onNavigate} hideHeading />}
      </section>
      <section>
        <button
          type="button"
          onClick={() => setScratchpadOpen(open => !open)}
          aria-expanded={scratchpadOpen}
          className="flex w-full cursor-pointer items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <StickyNote size={16} className="text-primary" />
            Note
          </span>
          {scratchpadOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {scratchpadOpen && (
          <div className="px-4 pb-4">
            <label htmlFor="reader-scratchpad" className="sr-only">Reader note</label>
            <textarea
              id="reader-scratchpad"
              value={scratchpad}
              onChange={event => handleScratchpadChange(event.target.value)}
              placeholder="Write anything you want to remember..."
              rows={6}
              className="w-full resize-y rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm leading-5 text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </section>
      <section className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <BookOpenText size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">LibraRian Ask</h3>
        </div>
        <p className="mb-3 text-xs leading-5 text-secondary">
          Ask about this note with linked notes, related notes, your Library, and web research available as context.
        </p>
        <button
          type="button"
          onClick={onAsk}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <MessageCircleQuestion size={16} />
          Open LibraRian Ask
        </button>
      </section>
    </div>
  );
}
