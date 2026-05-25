import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConversations, useConversation, useDeleteConversation } from '../../src/hooks/useConversations';

// Mock window.api
const mockApi = {
  conversation: {
    getAll: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = mockApi;
  }
});

describe('useConversations', () => {
  it('should load all conversations on mount', async () => {
    const mockConversations = [
      {
        id: '1',
        title: 'Test Conversation 1',
        created_at: new Date('2026-05-25T10:00:00Z'),
        updated_at: new Date('2026-05-25T11:00:00Z'),
      },
      {
        id: '2',
        title: 'Test Conversation 2',
        created_at: new Date('2026-05-25T09:00:00Z'),
        updated_at: new Date('2026-05-25T10:30:00Z'),
      },
    ];

    mockApi.conversation.getAll.mockResolvedValue(mockConversations);

    const { result } = renderHook(() => useConversations());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversations).toEqual(mockConversations);
    expect(result.current.error).toBeNull();
    expect(mockApi.conversation.getAll).toHaveBeenCalledTimes(1);
  });

  it('should return loading state during fetch', () => {
    mockApi.conversation.getAll.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useConversations());

    expect(result.current.loading).toBe(true);
    expect(result.current.conversations).toEqual([]);
  });

  it('should return error state on fetch failure', async () => {
    const mockError = new Error('Failed to fetch conversations');
    mockApi.conversation.getAll.mockRejectedValue(mockError);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.conversations).toEqual([]);
  });

  it('should provide refetch function', async () => {
    const mockConversations = [
      {
        id: '1',
        title: 'Test Conversation',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockApi.conversation.getAll.mockResolvedValue(mockConversations);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.conversation.getAll).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockApi.conversation.getAll).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useConversation', () => {
  it('should load single conversation with messages', async () => {
    const mockConversation = {
      id: '1',
      title: 'Test Conversation',
      created_at: new Date('2026-05-25T10:00:00Z'),
      updated_at: new Date('2026-05-25T11:00:00Z'),
      messages: [
        {
          id: 'm1',
          conversation_id: '1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date('2026-05-25T10:00:00Z'),
        },
        {
          id: 'm2',
          conversation_id: '1',
          role: 'assistant' as const,
          content: 'Hi there!',
          created_at: new Date('2026-05-25T10:00:05Z'),
        },
      ],
    };

    mockApi.conversation.get.mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversation('1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversation).toEqual(mockConversation);
    expect(result.current.error).toBeNull();
    expect(mockApi.conversation.get).toHaveBeenCalledWith('1');
  });

  it('should return null when conversation not found', async () => {
    mockApi.conversation.get.mockResolvedValue(null);

    const { result } = renderHook(() => useConversation('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversation).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useDeleteConversation', () => {
  it('should remove conversation and refetch list', async () => {
    mockApi.conversation.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteConversation());

    expect(result.current.loading).toBe(false);

    await result.current.deleteConversation('1');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.conversation.delete).toHaveBeenCalledWith('1');
  });
});
