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

// Add chat API to mock
const mockChatApi = {
  send: vi.fn(),
  summarizeNote: vi.fn(),
  onToken: vi.fn(),
  offToken: vi.fn(),
};

beforeEach(() => {
  if (typeof window !== 'undefined') {
    (window as any).api = {
      ...mockApi,
      chat: mockChatApi,
    };
  }
});

describe('useSendMessage', () => {
  it('should send message and return response', async () => {
    const mockResponse = {
      conversationId: 'conv-1',
      messageId: 'msg-1',
      response: 'Hello! How can I help you?',
    };

    mockChatApi.send.mockResolvedValue(mockResponse);
    mockChatApi.onToken.mockReturnValue(() => {});

    const { useSendMessage } = await import('../../src/hooks/useChat');
    const { result } = renderHook(() => useSendMessage('conv-1'));

    expect(result.current.loading).toBe(false);

    const response = await result.current.sendMessage('Hello', 'claude', 'sonnet-4', false);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(response).toEqual(mockResponse);
    expect(mockChatApi.send).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      message: 'Hello',
      providerId: 'claude',
      model: 'sonnet-4',
      useWebSearch: false,
    });
  });

  it('should handle streaming tokens via onToken callback', async () => {
    const mockResponse = {
      conversationId: 'conv-1',
      messageId: 'msg-1',
      response: 'Hello World',
    };

    let tokenCallback: ((data: { conversationId: string; token: string }) => void) | null = null;

    mockChatApi.send.mockImplementation(async () => {
      // Simulate streaming tokens
      if (tokenCallback) {
        tokenCallback({ conversationId: 'conv-1', token: 'Hello' });
        tokenCallback({ conversationId: 'conv-1', token: ' ' });
        tokenCallback({ conversationId: 'conv-1', token: 'World' });
      }
      return mockResponse;
    });

    mockChatApi.onToken.mockImplementation((callback) => {
      tokenCallback = callback;
      return () => {};
    });

    const { useSendMessage } = await import('../../src/hooks/useChat');
    const { result } = renderHook(() => useSendMessage('conv-1'));

    await result.current.sendMessage('Test', 'claude', 'sonnet-4', false);

    await waitFor(() => {
      expect(result.current.streamingContent).toBe('Hello World');
    });
  });

  it('should accumulate tokens into full response', async () => {
    const mockResponse = {
      conversationId: 'conv-1',
      messageId: 'msg-1',
      response: 'Token1Token2Token3',
    };

    let tokenCallback: ((data: { conversationId: string; token: string }) => void) | null = null;

    mockChatApi.send.mockImplementation(async () => {
      if (tokenCallback) {
        tokenCallback({ conversationId: 'conv-1', token: 'Token1' });
        tokenCallback({ conversationId: 'conv-1', token: 'Token2' });
        tokenCallback({ conversationId: 'conv-1', token: 'Token3' });
      }
      return mockResponse;
    });

    mockChatApi.onToken.mockImplementation((callback) => {
      tokenCallback = callback;
      return () => {};
    });

    const { useSendMessage } = await import('../../src/hooks/useChat');
    const { result } = renderHook(() => useSendMessage('conv-1'));

    await result.current.sendMessage('Test', 'claude', 'sonnet-4', false);

    await waitFor(() => {
      expect(result.current.streamingContent).toBe('Token1Token2Token3');
    });
  });

  it('should clean up token listener on unmount', async () => {
    const mockCleanup = vi.fn();
    mockChatApi.onToken.mockReturnValue(mockCleanup);
    mockChatApi.send.mockResolvedValue({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      response: 'Test',
    });

    const { useSendMessage } = await import('../../src/hooks/useChat');
    const { result, unmount } = renderHook(() => useSendMessage('conv-1'));

    await result.current.sendMessage('Test', 'claude', 'sonnet-4', false);

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should handle errors during send', async () => {
    const mockError = new Error('Failed to send message');
    mockChatApi.send.mockRejectedValue(mockError);
    mockChatApi.onToken.mockReturnValue(() => {});

    const { useSendMessage } = await import('../../src/hooks/useChat');
    const { result } = renderHook(() => useSendMessage('conv-1'));

    await expect(
      result.current.sendMessage('Test', 'claude', 'sonnet-4', false)
    ).rejects.toThrow('Failed to send message');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useSummarizeNote', () => {
  it('should call chat.summarizeNote with noteId', async () => {
    const mockSummary = { summary: 'This is a summary of the note.' };
    mockChatApi.summarizeNote.mockResolvedValue(mockSummary);

    const { useSummarizeNote } = await import('../../src/hooks/useChat');
    const { result } = renderHook(() => useSummarizeNote('note-1'));

    expect(result.current.loading).toBe(false);

    const summary = await result.current.summarize('claude', 'sonnet-4');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(summary).toEqual(mockSummary);
    expect(mockChatApi.summarizeNote).toHaveBeenCalledWith('note-1');
  });
});

describe('useChat', () => {
  it('should provide both send and summarize operations', async () => {
    mockChatApi.send.mockResolvedValue({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      response: 'Response',
    });
    mockChatApi.summarizeNote.mockResolvedValue({ summary: 'Summary' });
    mockChatApi.onToken.mockReturnValue(() => {});

    const { useChat } = await import('../../src/hooks/useChat');
    const { result } = renderHook(() => useChat('conv-1'));

    expect(result.current.sendMessage).toBeDefined();
    expect(result.current.summarize).toBeDefined();
    expect(result.current.loading).toBe(false);
  });
});
