import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LibrarianAskPanel } from './LibrarianAskPanel';

const { mockAsk } = vi.hoisted(() => ({ mockAsk: vi.fn() }));

vi.mock('../../api', () => ({
  libraryAssistantAPI: { ask: mockAsk },
  notesAPI: { getById: vi.fn(), update: vi.fn(), create: vi.fn() },
}));

vi.mock('../../hooks/useAIProviders', () => ({
  useAIProviders: () => ({
    providers: [{ id: 'deepseek', name: 'DeepSeek', configured: true, model: 'deepseek-chat' }],
  }),
}));

vi.mock('../Chat/MessageBubble', () => ({
  MessageBubble: ({ content }: { content: string }) => <div>{content}</div>,
}));

describe('LibrarianAskPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAsk.mockResolvedValue({ conversationId: 'conversation-1', content: 'Contextual answer' });
  });

  it('shows the default greeting and offers three choices after an answer', async () => {
    render(<LibrarianAskPanel open noteId="note-1" onClose={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByText('Libra is here to help, what do you seek for, reader?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ask LibraRian about this note'), { target: { value: 'Explain this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(mockAsk).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'note-1',
      question: 'Explain this',
      providerId: 'deepseek',
      model: 'deepseek-chat',
    })));
    expect(await screen.findByText('Contextual answer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Append to current note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write new note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep as conversation' })).toBeInTheDocument();
  });

  it('renders as an opaque, resizable, always-on-top floating window', () => {
    render(<LibrarianAskPanel open noteId="note-1" onClose={vi.fn()} onNavigate={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'LibraRian Ask' });
    expect(dialog).toHaveClass('librarian-window');
    expect(dialog).toHaveClass('resize');
    expect(dialog).toHaveStyle({ width: '400px', height: '520px' });
    expect(dialog.parentElement).toHaveClass('z-[100]');
    expect(screen.getByTitle('Drag to move LibraRian Ask')).toHaveClass('cursor-move');
  });

  it('moves and releases the floating window without reading a cleared drag offset', () => {
    render(<LibrarianAskPanel open noteId="note-1" onClose={vi.fn()} onNavigate={vi.fn()} />);

    const header = screen.getByTitle('Drag to move LibraRian Ask');
    fireEvent.pointerDown(header, { pointerId: 1, clientX: 900, clientY: 40 });
    fireEvent.pointerMove(header, { pointerId: 1, clientX: 700, clientY: 120 });
    fireEvent.pointerUp(header, { pointerId: 1, clientX: 700, clientY: 120 });

    expect(screen.getByRole('dialog', { name: 'LibraRian Ask' })).toBeInTheDocument();
  });
});
