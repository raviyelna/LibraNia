import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearch } from '../src/hooks/useSearch';

const mockApi = {
  search: {
    quickNav: vi.fn(),
    fullText: vi.fn(),
    fuzzy: vi.fn(),
    semantic: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('useSearch - Quick Nav Mode', () => {
  it('should call quickNav API for quickNav mode', async () => {
    const mockResults = [
      { id: '1', title: 'Test Note', updated_at: Date.now(), rank: 1 },
    ];
    mockApi.search.quickNav.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('test', 'quickNav');

    await waitFor(() => {
      expect(mockApi.search.quickNav).toHaveBeenCalledWith('test');
      expect(result.current.results).toEqual(mockResults);
    });
  });

  it('should return empty array for empty query', async () => {
    const { result } = renderHook(() => useSearch());

    await result.current.search('', 'quickNav');

    expect(result.current.results).toEqual([]);
    expect(mockApi.search.quickNav).not.toHaveBeenCalled();
  });
});

describe('useSearch - Full Text Mode', () => {
  it('should call fullText API for fullText mode', async () => {
    const mockResults = [
      { id: '1', title: 'Test Note', snippet: 'test snippet', updated_at: Date.now(), score: 0.9 },
    ];
    mockApi.search.fullText.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('test', 'fullText');

    await waitFor(() => {
      expect(mockApi.search.fullText).toHaveBeenCalledWith('test');
      expect(result.current.results).toEqual(mockResults);
    });
  });
});

describe('useSearch - Fuzzy Mode', () => {
  it('should call fuzzy API for fuzzy mode', async () => {
    const mockResults = [
      { id: '1', title: 'Test Note', updated_at: Date.now(), rank: 1 },
    ];
    mockApi.search.fuzzy.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('test', 'fuzzy');

    await waitFor(() => {
      expect(mockApi.search.fuzzy).toHaveBeenCalledWith('test');
      expect(result.current.results).toEqual(mockResults);
    });
  });
});

describe('useSearch - Semantic Search Mode', () => {
  it('should support semantic mode in addition to quickNav/fullText/fuzzy', async () => {
    const mockResults = [
      { id: '1', title: 'Test Note', updated_at: Date.now(), similarity: 0.85 },
    ];
    mockApi.search.semantic.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('test query', 'semantic');

    await waitFor(() => {
      expect(mockApi.search.semantic).toHaveBeenCalledWith('test query');
      expect(result.current.results).toEqual(mockResults);
    });
  });

  it('should include similarity field in semantic search results', async () => {
    const mockResults = [
      { id: '1', title: 'Note 1', updated_at: Date.now(), similarity: 0.92 },
      { id: '2', title: 'Note 2', updated_at: Date.now(), similarity: 0.78 },
    ];
    mockApi.search.semantic.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch());

    await result.current.search('semantic query', 'semantic');

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults);
      expect((result.current.results[0] as any).similarity).toBe(0.92);
      expect((result.current.results[1] as any).similarity).toBe(0.78);
    });
  });

  it('should return empty array for empty query in semantic mode', async () => {
    const { result } = renderHook(() => useSearch());

    await result.current.search('', 'semantic');

    expect(result.current.results).toEqual([]);
    expect(mockApi.search.semantic).not.toHaveBeenCalled();
  });

  it('should manage loading state correctly during semantic search', async () => {
    mockApi.search.semantic.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));

    const { result } = renderHook(() => useSearch());

    expect(result.current.loading).toBe(false);

    result.current.search('test', 'semantic');

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 200 });
  });

  it('should catch and log errors in semantic search', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.search.semantic.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(() => useSearch());

    await result.current.search('test', 'semantic');

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
      expect(result.current.results).toEqual([]);
    });

    consoleErrorSpy.mockRestore();
  });
});
