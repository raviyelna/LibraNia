import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphSidePanel } from './GraphSidePanel';

// Mock NoteEditor component
vi.mock('../Notes/NoteEditor', () => ({
  NoteEditor: ({ noteId }: { noteId: string }) => (
    <div data-testid="note-editor">NoteEditor for {noteId}</div>
  ),
}));

describe('GraphSidePanel', () => {
  it('renders NoteEditor with noteId', () => {
    const onClose = vi.fn();
    render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const editor = screen.getByTestId('note-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveTextContent('NoteEditor for test-note-123');
  });

  it('has close button', () => {
    const onClose = vi.fn();
    render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close panel/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close panel/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is styled consistently with fixed position overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('fixed');
    expect(panel).toHaveClass('w-96');
    expect(panel).toHaveClass('h-full');
    expect(panel).toHaveClass('bg-background');
    expect(panel).toHaveClass('border-l');
    expect(panel).toHaveClass('shadow-lg');
  });

  it('displays header with title', () => {
    const onClose = vi.fn();
    render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    expect(screen.getByText('Note')).toBeInTheDocument();
  });
});
