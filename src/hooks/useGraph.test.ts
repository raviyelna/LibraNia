import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useGraph } from './useGraph';

// Mock window.api.graph and window.api.notes
const mockGetData = vi.fn();
const mockOnCreated = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (global as any).window = {
    api: {
      graph: {
        getData: mockGetData,
      },
      notes: {
        onCreated: mockOnCreated,
      },
    },
  };
});

describe('useGraph', () => {
  it('fetches graph data on mount', async () => {
    const mockData = {
      nodes: [
        { id: '1', title: 'Node 1', tags: ['tag1'] },
        { id: '2', title: 'Node 2', tags: ['tag2'] },
      ],
      links: [
        { source: '1', target: '2', type: 'manual' as const },
      ],
    };
    mockGetData.mockResolvedValue(mockData);

    const { result } = renderHook(() => useGraph());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.graphData).toEqual({ nodes: [], links: [] });
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.graphData).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  it('returns graphData, loading, error, and refetch', async () => {
    mockGetData.mockResolvedValue({ nodes: [], links: [] });

    const { result } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current).toHaveProperty('graphData');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('manages loading state correctly', async () => {
    mockGetData.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ nodes: [], links: [] }), 100)));

    const { result } = renderHook(() => useGraph());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  it('populates error state on failure', async () => {
    const mockError = new Error('Failed to fetch graph data');
    mockGetData.mockRejectedValue(mockError);

    const { result } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.graphData).toEqual({ nodes: [], links: [] });
  });

  it('refetch function works', async () => {
    const mockData1 = {
      nodes: [{ id: '1', title: 'Node 1', tags: [] }],
      links: [],
    };
    const mockData2 = {
      nodes: [
        { id: '1', title: 'Node 1', tags: [] },
        { id: '2', title: 'Node 2', tags: [] },
      ],
      links: [{ source: '1', target: '2', type: 'manual' as const }],
    };

    mockGetData.mockResolvedValueOnce(mockData1);

    const { result } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.graphData).toEqual(mockData1);

    // Update mock and refetch
    mockGetData.mockResolvedValueOnce(mockData2);

    await act(async () => {
      result.current.refetch();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.graphData).toEqual(mockData2);
    expect(mockGetData).toHaveBeenCalledTimes(2);
  });

  // Real-time update tests
  it('subscribes to note creation events on mount', async () => {
    const unsubscribe = vi.fn();
    mockOnCreated.mockReturnValue(unsubscribe);
    mockGetData.mockResolvedValue({ nodes: [], links: [] });

    const { unmount } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockOnCreated).toHaveBeenCalledTimes(1);
    expect(mockOnCreated).toHaveBeenCalledWith(expect.any(Function));

    unmount();
  });

  it('adds new note to graph data when onCreated fires', async () => {
    let capturedCallback: ((note: any) => void) | null = null;
    const unsubscribe = vi.fn();

    mockOnCreated.mockImplementation((callback: (note: any) => void) => {
      capturedCallback = callback;
      return unsubscribe;
    });

    mockGetData.mockResolvedValue({
      nodes: [{ id: 'existing-1', title: 'Existing Note', tags: [] }],
      links: [],
    });

    const { result } = renderHook(() => useGraph());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);

    // Verify initial state
    expect(result.current.graphData.nodes).toHaveLength(1);

    // Simulate note creation event
    act(() => {
      if (capturedCallback) {
        capturedCallback({ id: 'new-1', title: 'New Note', tags: ['test'] });
      }
    });

    // Verify new node added
    expect(result.current.graphData.nodes).toHaveLength(2);
    expect(result.current.graphData.nodes.find((n: any) => n.id === 'new-1')).toEqual({
      id: 'new-1',
      title: 'New Note',
      tags: ['test'],
    });
  });

  it('unsubscribes from events on unmount', async () => {
    const unsubscribe = vi.fn();
    mockOnCreated.mockReturnValue(unsubscribe);
    mockGetData.mockResolvedValue({ nodes: [], links: [] });

    const { unmount } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockOnCreated).toHaveBeenCalledTimes(1);

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('handles note with tags correctly', async () => {
    let capturedCallback: ((note: any) => void) | null = null;
    const unsubscribe = vi.fn();

    mockOnCreated.mockImplementation((callback: (note: any) => void) => {
      capturedCallback = callback;
      return unsubscribe;
    });

    mockGetData.mockResolvedValue({ nodes: [], links: [] });

    const { result } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);

    // Simulate note creation with multiple tags
    act(() => {
      if (capturedCallback) {
        capturedCallback({ id: 'n1', title: 'Tagged', tags: ['work', 'project'] });
      }
    });

    const node = result.current.graphData.nodes.find((n: any) => n.id === 'n1');
    expect(node).toBeDefined();
    expect(node.tags).toEqual(['work', 'project']);
  });

  it('handles note without tags (empty array)', async () => {
    let capturedCallback: ((note: any) => void) | null = null;
    const unsubscribe = vi.fn();

    mockOnCreated.mockImplementation((callback: (note: any) => void) => {
      capturedCallback = callback;
      return unsubscribe;
    });

    mockGetData.mockResolvedValue({ nodes: [], links: [] });

    const { result } = renderHook(() => useGraph());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);

    // Simulate note creation without tags
    act(() => {
      if (capturedCallback) {
        capturedCallback({ id: 'n2', title: 'Untagged', tags: undefined });
      }
    });

    const node = result.current.graphData.nodes.find((n: any) => n.id === 'n2');
    expect(node).toBeDefined();
    expect(node.tags).toEqual([]);
  });
});
