import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(panel).toHaveClass('h-full');
    expect(panel).toHaveClass('bg-background');
    expect(panel).toHaveClass('border-l');
    expect(panel).toHaveClass('shadow-lg');
    // Check default width is 384px
    expect(panel).toHaveStyle({ width: '384px' });
  });

  it('displays header with title', () => {
    const onClose = vi.fn();
    render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('has resize handle on left edge', () => {
    const onClose = vi.fn();
    render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const resizeHandle = screen.getByRole('separator', { name: /resize panel/i });
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveClass('cursor-col-resize');
  });

  it('starts resize on mousedown on handle', () => {
    const onClose = vi.fn();
    const { container } = render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const resizeHandle = screen.getByRole('separator', { name: /resize panel/i });
    const panel = container.firstChild as HTMLElement;

    // Initial width
    expect(panel).toHaveStyle({ width: '384px' });

    // Start resize
    fireEvent.mouseDown(resizeHandle);

    // Panel should have transition-none class during resize
    expect(panel).toHaveClass('transition-none');
  });

  it('adjusts width on drag within min/max bounds', () => {
    const onClose = vi.fn();
    const { container } = render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const resizeHandle = screen.getByRole('separator', { name: /resize panel/i });
    const panel = container.firstChild as HTMLElement;

    // Mock getBoundingClientRect to return panel position
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      right: 1000,
      left: 616, // 1000 - 384 (default width)
      top: 0,
      bottom: 800,
      width: 384,
      height: 800,
      x: 616,
      y: 0,
      toJSON: () => ({}),
    });

    // Start resize
    fireEvent.mouseDown(resizeHandle);

    // Drag to make panel wider (move mouse left to x=500, new width = 1000 - 500 = 500px)
    fireEvent.mouseMove(document, { clientX: 500 });

    // Width should update to 500px
    expect(panel).toHaveStyle({ width: '500px' });

    // End resize
    fireEvent.mouseUp(document);

    // Panel should have transition class after resize
    expect(panel).toHaveClass('transition-all');
  });

  it('clamps width to minimum 256px', () => {
    const onClose = vi.fn();
    const { container } = render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const resizeHandle = screen.getByRole('separator', { name: /resize panel/i });
    const panel = container.firstChild as HTMLElement;

    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      right: 1000,
      left: 616,
      top: 0,
      bottom: 800,
      width: 384,
      height: 800,
      x: 616,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseDown(resizeHandle);

    // Try to drag to make panel too narrow (x=900, new width = 1000 - 900 = 100px)
    fireEvent.mouseMove(document, { clientX: 900 });

    // Width should be clamped to 256px minimum
    expect(panel).toHaveStyle({ width: '256px' });

    fireEvent.mouseUp(document);
  });

  it('clamps width to maximum 768px', () => {
    const onClose = vi.fn();
    const { container } = render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    const resizeHandle = screen.getByRole('separator', { name: /resize panel/i });
    const panel = container.firstChild as HTMLElement;

    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      right: 1000,
      left: 616,
      top: 0,
      bottom: 800,
      width: 384,
      height: 800,
      x: 616,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseDown(resizeHandle);

    // Try to drag to make panel too wide (x=100, new width = 1000 - 100 = 900px)
    fireEvent.mouseMove(document, { clientX: 100 });

    // Width should be clamped to 768px maximum
    expect(panel).toHaveStyle({ width: '768px' });

    fireEvent.mouseUp(document);
  });

  it('cleans up event listeners on unmount', () => {
    const onClose = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<GraphSidePanel noteId="test-note-123" onClose={onClose} />);

    unmount();

    // Should remove mousemove and mouseup listeners
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
});
