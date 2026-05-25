import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTags, useNoteTags } from '../../src/hooks/useTags';

const mockApi = {
  tags: {
    getAll: vi.fn(),
    getForNote: vi.fn(),
    addToNote: vi.fn(),
    removeFromNote: vi.fn(),
    setForNote: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('useTags', () => {
  it('should fetch all tags on mount', async () => {
    const mockTags = [
      { id: '1', name: 'javascript', created_at: new Date() },
      { id: '2', name: 'react', created_at: new Date() },
    ];
    mockApi.tags.getAll.mockResolvedValue(mockTags);

    const { result } = renderHook(() => useTags());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tags).toEqual(mockTags);
    expect(mockApi.tags.getAll).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch error', async () => {
    mockApi.tags.getAll.mockRejectedValue(new Error('Failed to fetch tags'));

    const { result } = renderHook(() => useTags());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tags).toEqual([]);
  });
});

describe('useNoteTags', () => {
  it('should fetch tags for note', async () => {
    const mockTags = [
      { id: '1', name: 'javascript', created_at: new Date() },
    ];
    mockApi.tags.getForNote.mockResolvedValue(mockTags);

    const { result } = renderHook(() => useNoteTags('note-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tags).toEqual(mockTags);
    expect(mockApi.tags.getForNote).toHaveBeenCalledWith('note-1');
  });

  it('should add tag to note', async () => {
    const mockTags = [
      { id: '1', name: 'javascript', created_at: new Date() },
    ];
    mockApi.tags.getForNote.mockResolvedValue(mockTags);
    mockApi.tags.addToNote.mockResolvedValue(['1']);

    const { result } = renderHook(() => useNoteTags('note-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.addTag('typescript');

    expect(mockApi.tags.addToNote).toHaveBeenCalledWith('note-1', ['typescript']);
    expect(mockApi.tags.getForNote).toHaveBeenCalledTimes(2); // Initial + after add
  });

  it('should remove tag from note', async () => {
    const mockTags = [
      { id: '1', name: 'javascript', created_at: new Date() },
    ];
    mockApi.tags.getForNote.mockResolvedValue(mockTags);
    mockApi.tags.removeFromNote.mockResolvedValue(true);

    const { result } = renderHook(() => useNoteTags('note-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.removeTag('1');

    expect(mockApi.tags.removeFromNote).toHaveBeenCalledWith('note-1', '1');
    expect(mockApi.tags.getForNote).toHaveBeenCalledTimes(2); // Initial + after remove
  });
});
