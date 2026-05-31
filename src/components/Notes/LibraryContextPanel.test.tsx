import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LibraryContextPanel } from './LibraryContextPanel';

vi.mock('./RelatedPanel', () => ({ RelatedPanel: () => <div>Related notes section</div> }));

describe('LibraryContextPanel', () => {
  beforeEach(() => localStorage.clear());

  it('persists a reader scratchpad per note and opens LibraRian Ask', () => {
    const onAsk = vi.fn();
    render(<LibraryContextPanel noteId="note-1" onNavigate={vi.fn()} onAsk={onAsk} />);

    fireEvent.change(screen.getByLabelText('Reader note'), { target: { value: 'Remember this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open LibraRian Ask' }));

    expect(localStorage.getItem('librania:reader-note:note-1')).toBe('Remember this');
    expect(onAsk).toHaveBeenCalled();
  });

  it('collapses related notes and the reader scratchpad', () => {
    render(<LibraryContextPanel noteId="note-1" onNavigate={vi.fn()} onAsk={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Related notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Note' }));

    expect(screen.queryByText('Related notes section')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reader note')).not.toBeInTheDocument();
  });
});
