import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BookPlus, GripHorizontal, MessageCircle, PlusCircle, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { libraryAssistantAPI, notesAPI, type LibraryAssistantMessage } from '../../api';
import { PROVIDER_MODELS } from '../../constants/models';
import { useAIProviders } from '../../hooks/useAIProviders';
import { DATA_EVENTS, emitDataUpdated } from '../../utils/data-events';
import { MessageBubble } from '../Chat/MessageBubble';

interface LibrarianAskPanelProps {
  open: boolean;
  noteId: string;
  onClose: () => void;
  onNavigate: (noteId: string) => void;
}

const GREETING = 'Libra is here to help, what do you seek for, reader?';
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 360;

function getInitialPanelRect() {
  const width = Math.min(400, Math.max(0, window.innerWidth - 32));
  const height = Math.min(520, Math.max(0, window.innerHeight - 32));

  return {
    left: Math.max(16, window.innerWidth - width - 16),
    top: Math.max(16, window.innerHeight - height - 16),
    width,
    height,
  };
}

export function LibrarianAskPanel({ open, noteId, onClose, onNavigate }: LibrarianAskPanelProps) {
  const { providers } = useAIProviders();
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<LibraryAssistantMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [latestQuestion, setLatestQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [panelRect, setPanelRect] = useState(getInitialPanelRect);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>();

  const configuredProviders = useMemo(
    () => providers.filter(provider => provider.configured !== false),
    [providers]
  );
  const latestAnswer = [...messages].reverse().find(message => message.role === 'assistant')?.content;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const provider = configuredProviders.find(item => item.id === selectedProvider) || configuredProviders[0];
    if (!provider) return;
    setSelectedProvider(provider.id);
    setSelectedModel(provider.model || PROVIDER_MODELS[provider.id as keyof typeof PROVIDER_MODELS]?.[0]?.id || '');
  }, [configuredProviders, selectedProvider]);

  useEffect(() => {
    setConversationId(undefined);
    setMessages([]);
    setQuestion('');
  }, [noteId]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.target.getBoundingClientRect();
      setPanelRect(current => (
        current.width === width && current.height === height
          ? current
          : { ...current, width, height }
      ));
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [open]);

  const startDragging = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    dragOffsetRef.current = {
      x: event.clientX - panelRect.left,
      y: event.clientY - panelRect.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const movePanel = (event: React.PointerEvent<HTMLElement>) => {
    const dragOffset = dragOffsetRef.current;
    if (!dragOffset) return;
    const maxLeft = Math.max(0, window.innerWidth - panelRect.width);
    const maxTop = Math.max(0, window.innerHeight - panelRect.height);
    setPanelRect(current => ({
      ...current,
      left: Math.min(maxLeft, Math.max(0, event.clientX - dragOffset.x)),
      top: Math.min(maxTop, Math.max(0, event.clientY - dragOffset.y)),
    }));
  };

  const stopDragging = (event: React.PointerEvent<HTMLElement>) => {
    dragOffsetRef.current = undefined;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleAsk = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || asking) return;

    setAsking(true);
    setQuestion('');
    try {
      const result = await libraryAssistantAPI.ask({
        noteId,
        question: trimmedQuestion,
        conversationId,
        messages,
        providerId: selectedProvider,
        model: selectedModel,
      });
      setConversationId(result.conversationId);
      setLatestQuestion(trimmedQuestion);
      setMessages(current => [
        ...current,
        { role: 'user', content: trimmedQuestion },
        { role: 'assistant', content: result.content },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'LibraRian Ask failed.');
    } finally {
      setAsking(false);
    }
  };

  const appendToCurrentNote = async () => {
    if (!latestAnswer) return;
    try {
      const note = await notesAPI.getById(noteId);
      await notesAPI.update(noteId, {
        body: `${note.body.trimEnd()}\n\n## LibraRian Ask\n\n${latestAnswer}\n`,
      });
      emitDataUpdated(DATA_EVENTS.notes);
      toast.success('Answer appended to the current note.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to append the answer.');
    }
  };

  const createNewNote = async () => {
    if (!latestAnswer) return;
    try {
      const note = await notesAPI.create({
        title: latestQuestion || 'LibraRian Ask follow-up',
        body: latestAnswer,
      });
      emitDataUpdated(DATA_EVENTS.notes);
      onNavigate(note.id);
      onClose();
      toast.success('Created a new note from the answer.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create a note.');
    }
  };

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" role="presentation">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="librarian-ask-title"
        style={{
          left: panelRect.left,
          top: panelRect.top,
          width: panelRect.width,
          height: panelRect.height,
          minWidth: Math.min(MIN_PANEL_WIDTH, window.innerWidth),
          minHeight: Math.min(MIN_PANEL_HEIGHT, window.innerHeight),
          maxWidth: window.innerWidth,
          maxHeight: window.innerHeight,
        }}
        className="librarian-window pointer-events-auto fixed flex resize flex-col overflow-hidden rounded-xl border border-border shadow-2xl"
      >
        <header
          onPointerDown={startDragging}
          onPointerMove={movePanel}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className="flex cursor-move touch-none select-none items-start justify-between gap-4 border-b border-border p-4"
          title="Drag to move LibraRian Ask"
        >
          <div className="flex gap-2">
            <GripHorizontal size={18} className="mt-1 shrink-0 text-secondary" aria-hidden="true" />
            <div>
            <h2 id="librarian-ask-title" className="text-lg font-bold text-foreground">LibraRian Ask</h2>
            <p className="mt-1 text-xs leading-5 text-secondary">
              Current note, linked notes, related notes, Library search, and web research are available as context.
            </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-2 text-secondary transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close LibraRian Ask"
          >
            <X size={18} />
          </button>
        </header>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <MessageBubble role="assistant" content={GREETING} created_at={new Date()} />
          {messages.map((message, index) => (
            <MessageBubble
              key={`${message.role}-${index}`}
              role={message.role}
              content={message.content}
              created_at={new Date()}
            />
          ))}
          {asking && <p className="text-sm text-secondary">Libra is reading and researching...</p>}
        </div>

        {latestAnswer && (
          <div className="border-t border-border bg-muted/25 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Use this answer</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void appendToCurrentNote()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary">
                <PlusCircle size={14} />
                Append to current note
              </button>
              <button type="button" onClick={() => void createNewNote()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary">
                <BookPlus size={14} />
                Write new note
              </button>
              <button type="button" onClick={() => { toast.success('Conversation saved in Chat.'); onClose(); }} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary">
                <MessageCircle size={14} />
                Keep as conversation
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleAsk} className="border-t border-border bg-background p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <label htmlFor="librarian-provider" className="sr-only">Provider</label>
            <select id="librarian-provider" value={selectedProvider} onChange={event => setSelectedProvider(event.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {configuredProviders.map(provider => <option key={provider.id} value={provider.id}>{provider.name || provider.id}</option>)}
            </select>
            <label htmlFor="librarian-model" className="sr-only">Model</label>
            <input id="librarian-model" value={selectedModel} onChange={event => setSelectedModel(event.target.value)} className="min-w-48 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-2">
            <label htmlFor="librarian-question" className="sr-only">Ask LibraRian about this note</label>
            <textarea
              ref={inputRef}
              id="librarian-question"
              value={question}
              onChange={event => setQuestion(event.target.value)}
              placeholder="Ask about this note..."
              rows={3}
              className="min-w-0 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="submit" disabled={!question.trim() || asking} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
              <Send size={16} />
              Ask
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
