import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotesList } from '../../src/components/Notes/NotesList';

const mockNotes = [
  { id: '1', title: 'Note 1', body: 'Body 1', created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-02'), deleted_at: null, metadata: null },
  { id: '2', title: 'Note 2', body: 'Body 2', created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-03'), deleted_at: null, metadata: null },
];

const mockApi = {
  notes: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('NotesList', () => {
  it('should render notes list', async () => {
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Note 2')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockApi.notes.getAll.mockImplementation(() => new Promise(() => {})); // Never resolves

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state when no notes', async () => {
    mockApi.notes.getAll.mockResolvedValue([]);

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    });
  });

  it('should call onSelectNote when note clicked', async () => {
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Note 1'));

    expect(onSelectNote).toHaveBeenCalledWith('1');
  });

  it('should highlight selected note', async () => {
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const onSelectNote = vi.fn();
    const { container } = render(<NotesList selectedNoteId="1" onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    const selectedNote = screen.getByText('Note 1').closest('div');
    expect(selectedNote).toHaveClass('selected');
  });

  it('should filter notes by search query', async () => {
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search notes/i);
    fireEvent.change(searchInput, { target: { value: 'Note 1' } });

    expect(screen.getByText('Note 1')).toBeInTheDocument();
    expect(screen.queryByText('Note 2')).not.toBeInTheDocument();
  });

  it('should create new note when button clicked', async () => {
    mockApi.notes.getAll.mockResolvedValue(mockNotes);
    mockApi.notes.create.mockResolvedValue({ id: '3', title: 'Untitled', body: '', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null });

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    const newNoteButton = screen.getByText(/new note/i);
    fireEvent.click(newNoteButton);

    await waitFor(() => {
      expect(mockApi.notes.create).toHaveBeenCalledWith({ title: 'Untitled', body: '' });
    });

    expect(onSelectNote).toHaveBeenCalledWith('3');
  });

  it('should display last updated timestamp', async () => {
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const onSelectNote = vi.fn();
    render(<NotesList selectedNoteId={undefined} onSelectNote={onSelectNote} />);

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    // Check that dates are displayed (format may vary)
    const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
