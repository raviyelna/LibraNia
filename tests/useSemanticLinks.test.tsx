import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSemanticLinks } from '../src/hooks/useSemanticLinks';

const mockApi = {
  links: {
    getSemanticLinks: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('useSemanticLinks', () => {
  it('should fetch semantic links for given noteId', async () => {
    const mockLinks = [
      { id: '1', title: 'Related Note 1', similarity: 0.85 },
      { id: '2', title: 'Related Note 2', similarity: 0.72 },
    ];
    mockApi.links.getSemanticLinks.mockResolvedValue(mockLinks);

    const { result } = renderHook(() => useSemanticLinks('note-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.links.getSemanticLinks).toHaveBeenCalledWith('note-123');
    expect(result.current.links).toEqual(mockLinks);
    expect(result.current.error).toBeNull();
  });

  it('should return array of objects with id, title, similarity', async () => {
    const mockLinks = [
      { id: 'abc', title: 'Semantic Link', similarity: 0.92 },
    ];
    mockApi.links.getSemanticLinks.mockResolvedValue(mockLinks);

    const { result } = renderHook(() => useSemanticLinks('note-456'));

    await waitFor(() => {
      expect(result.current.links.length).toBe(1);
    });

    const link = result.current.links[0];
    expect(link).toHaveProperty('id');
    expect(link).toHaveProperty('title');
    expect(link).toHaveProperty('similarity');
    expect(link.id).toBe('abc');
    expect(link.title).toBe('Semantic Link');
    expect(link.similarity).toBe(0.92);
  });

  it('should have loading state true during fetch, false after', async () => {
    mockApi.links.getSemanticLinks.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    const { result } = renderHook(() => useSemanticLinks('note-789'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 200 });
  });

  it('should populate error state on fetch failure', async () => {
    const testError = new Error('Failed to fetch semantic links');
    mockApi.links.getSemanticLinks.mockRejectedValue(testError);

    const { result } = renderHook(() => useSemanticLinks('note-error'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.links).toEqual([]);
  });

  it('should provide refetch function for manual refresh', async () => {
    const mockLinks1 = [{ id: '1', title: 'Link 1', similarity: 0.8 }];
    const mockLinks2 = [{ id: '2', title: 'Link 2', similarity: 0.9 }];

    mockApi.links.getSemanticLinks
      .mockResolvedValueOnce(mockLinks1)
      .mockResolvedValueOnce(mockLinks2);

    const { result } = renderHook(() => useSemanticLinks('note-refetch'));

    await waitFor(() => {
      expect(result.current.links).toEqual(mockLinks1);
    });

    // Call refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.links).toEqual(mockLinks2);
    });

    expect(mockApi.links.getSemanticLinks).toHaveBeenCalledTimes(2);
  });

  it('should re-fetch when noteId changes', async () => {
    const mockLinks1 = [{ id: '1', title: 'Links for note A', similarity: 0.8 }];
    const mockLinks2 = [{ id: '2', title: 'Links for note B', similarity: 0.9 }];

    mockApi.links.getSemanticLinks
      .mockResolvedValueOnce(mockLinks1)
      .mockResolvedValueOnce(mockLinks2);

    const { result, rerender } = renderHook(
      ({ noteId }) => useSemanticLinks(noteId),
      { initialProps: { noteId: 'note-A' } }
    );

    await waitFor(() => {
      expect(result.current.links).toEqual(mockLinks1);
    });

    expect(mockApi.links.getSemanticLinks).toHaveBeenCalledWith('note-A');

    // Change noteId
    rerender({ noteId: 'note-B' });

    await waitFor(() => {
      expect(result.current.links).toEqual(mockLinks2);
    });

    expect(mockApi.links.getSemanticLinks).toHaveBeenCalledWith('note-B');
    expect(mockApi.links.getSemanticLinks).toHaveBeenCalledTimes(2);
  });
});
