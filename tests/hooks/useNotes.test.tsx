import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotes, useNote, useCreateNote, useUpdateNote, useDeleteNote } from '../../src/hooks/useNotes';

// Mock window.api
const mockApi = {
  notes: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('useNotes', () => {
  it('should fetch all notes on mount', async () => {
    const mockNotes = [
      { id: '1', title: 'Note 1', body: 'Body 1', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null },
      { id: '2', title: 'Note 2', body: 'Body 2', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null },
    ];
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const { result } = renderHook(() => useNotes());

    expect(result.current.loading).toBe(true);
    expect(result.current.notes).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notes).toEqual(mockNotes);
    expect(result.current.error).toBeNull();
    expect(mockApi.notes.getAll).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Failed to fetch notes');
    mockApi.notes.getAll.mockRejectedValue(mockError);

    const { result } = renderHook(() => useNotes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.notes).toEqual([]);
  });

  it('should refetch notes when refetch is called', async () => {
    const mockNotes = [{ id: '1', title: 'Note 1', body: 'Body 1', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null }];
    mockApi.notes.getAll.mockResolvedValue(mockNotes);

    const { result } = renderHook(() => useNotes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.notes.getAll).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await waitFor(() => {
      expect(mockApi.notes.getAll).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useNote', () => {
  it('should fetch single note by id', async () => {
    const mockNote = { id: '1', title: 'Note 1', body: 'Body 1', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null };
    mockApi.notes.getById.mockResolvedValue(mockNote);

    const { result } = renderHook(() => useNote('1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.note).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.note).toEqual(mockNote);
    expect(mockApi.notes.getById).toHaveBeenCalledWith('1', false);
  });

  it('should handle note not found', async () => {
    mockApi.notes.getById.mockResolvedValue(null);

    const { result } = renderHook(() => useNote('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.note).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useCreateNote', () => {
  it('should create note and return result', async () => {
    const mockNote = { id: '1', title: 'New Note', body: 'Body', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null };
    mockApi.notes.create.mockResolvedValue(mockNote);

    const { result } = renderHook(() => useCreateNote());

    expect(result.current.loading).toBe(false);

    const note = await result.current.createNote({ title: 'New Note', body: 'Body' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(note).toEqual(mockNote);
    expect(mockApi.notes.create).toHaveBeenCalledWith({ title: 'New Note', body: 'Body' });
  });

  it('should handle create error', async () => {
    mockApi.notes.create.mockRejectedValue(new Error('Create failed'));

    const { result } = renderHook(() => useCreateNote());

    await expect(result.current.createNote({ title: 'New Note', body: 'Body' })).rejects.toThrow('Create failed');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useUpdateNote', () => {
  it('should update note and return result', async () => {
    const mockNote = { id: '1', title: 'Updated', body: 'Body', created_at: new Date(), updated_at: new Date(), deleted_at: null, metadata: null };
    mockApi.notes.update.mockResolvedValue(mockNote);

    const { result } = renderHook(() => useUpdateNote());

    const note = await result.current.updateNote({ id: '1', title: 'Updated' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(note).toEqual(mockNote);
    expect(mockApi.notes.update).toHaveBeenCalledWith({ id: '1', title: 'Updated' });
  });
});

describe('useDeleteNote', () => {
  it('should delete note (soft delete by default)', async () => {
    mockApi.notes.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteNote());

    await result.current.deleteNote('1', false);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.notes.delete).toHaveBeenCalledWith('1', false);
  });

  it('should delete note (hard delete)', async () => {
    mockApi.notes.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteNote());

    await result.current.deleteNote('1', true);

    expect(mockApi.notes.delete).toHaveBeenCalledWith('1', true);
  });
});
