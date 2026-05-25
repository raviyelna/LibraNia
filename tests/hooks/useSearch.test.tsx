import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearch } from '../../src/hooks/useSearch';

const mockApi = {
  search: {
    quickNav: vi.fn(),
    fullText: vi.fn(),
    fuzzy: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('useSearch', () => {
  it('should return empty results initially', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should search using quickNav', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', updated_at: Date.now(), rank: -1.5 },
      { id: '2', title: 'React Hooks', updated_at: Date.now(), rank: -2.0 },
    ];
    mockApi.search.quickNav.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('react', 'quickNav');

    await waitFor(() => {
      expect(result.current.results).toHaveLength(2);
    });

    expect(result.current.results).toEqual(mockResults);
    expect(mockApi.search.quickNav).toHaveBeenCalledWith('react');
  });

  it('should search using fullText', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', snippet: 'Learn <mark>React</mark>...', updated_at: Date.now(), score: -1.5 },
    ];
    mockApi.search.fullText.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('react', 'fullText');

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults);
    });

    expect(mockApi.search.fullText).toHaveBeenCalledWith('react');
  });

  it('should search using fuzzy', async () => {
    const mockResults = [
      { id: '1', title: 'React Basics', updated_at: Date.now(), rank: -1.5 },
    ];
    mockApi.search.fuzzy.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('reakt', 'fuzzy');

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults);
    });

    expect(mockApi.search.fuzzy).toHaveBeenCalledWith('reakt');
  });

  it('should handle search error', async () => {
    mockApi.search.quickNav.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => useSearch());

    await result.current.search('test', 'quickNav');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.results).toEqual([]);
  });
});
