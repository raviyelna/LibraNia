import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Chat } from '../../src/routes/Chat';

// Mock the hooks
vi.mock('../../src/hooks/useConversations', () => ({
  useConversations: vi.fn(),
}));

// Mock the ChatInterface component
vi.mock('../../src/components/Chat/ChatInterface', () => ({
  ChatInterface: ({ conversationId }: { conversationId?: string }) => (
    <div data-testid="chat-interface">
      ChatInterface: {conversationId || 'none'}
    </div>
  ),
}));

// Mock window.api
const mockApi = {
  conversation: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
};

(global as any).window = {
  ...global.window,
  api: mockApi,
};

import { useConversations } from '../../src/hooks/useConversations';

const mockUseConversations = useConversations as any;

describe('Chat Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders conversation list sidebar', () => {
    mockUseConversations.mockReturnValue({
      conversations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    expect(screen.getByText('Conversations')).toBeInTheDocument();
  });

  it('renders ChatInterface in main content area', () => {
    mockUseConversations.mockReturnValue({
      conversations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
  });

  it('loads conversations using useConversations hook', () => {
    const mockConversations = [
      {
        id: '1',
        title: 'Test conversation',
        created_at: new Date('2026-05-25T10:00:00Z'),
        updated_at: new Date('2026-05-25T10:00:00Z'),
      },
    ];

    mockUseConversations.mockReturnValue({
      conversations: mockConversations,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    expect(mockUseConversations).toHaveBeenCalled();
    expect(screen.getByText('Test conversation')).toBeInTheDocument();
  });

  it('selecting conversation updates ChatInterface with conversationId', async () => {
    const mockConversations = [
      {
        id: 'conv-123',
        title: 'Test conversation',
        created_at: new Date('2026-05-25T10:00:00Z'),
        updated_at: new Date('2026-05-25T10:00:00Z'),
      },
    ];

    mockUseConversations.mockReturnValue({
      conversations: mockConversations,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    const conversationItem = screen.getByText('Test conversation');
    fireEvent.click(conversationItem);

    // After click, the ChatInterface should update with the conversation ID
    expect(screen.getByText(/ChatInterface: conv-123/)).toBeInTheDocument();
  });

  it('"New Conversation" button creates new conversation', async () => {
    const mockRefetch = vi.fn();
    const newConversationId = 'new-conv-456';

    mockUseConversations.mockReturnValue({
      conversations: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockApi.conversation.create.mockResolvedValue({
      id: newConversationId,
      title: 'New Conversation',
      created_at: new Date(),
      updated_at: new Date(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    const newButton = screen.getByText('New Conversation');
    fireEvent.click(newButton);

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockApi.conversation.create).toHaveBeenCalledWith({
      title: 'New Conversation',
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('empty state shows when no conversations exist', () => {
    mockUseConversations.mockReturnValue({
      conversations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    expect(screen.getByText(/No conversations yet/)).toBeInTheDocument();
  });

  it('conversation list shows auto-generated titles per D-11', () => {
    const mockConversations = [
      {
        id: '1',
        title: 'This is a very long conversation title that should be truncated to first 50 characters',
        created_at: new Date('2026-05-25T10:00:00Z'),
        updated_at: new Date('2026-05-25T10:00:00Z'),
      },
    ];

    mockUseConversations.mockReturnValue({
      conversations: mockConversations,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Chat />
      </BrowserRouter>
    );

    // Title should be displayed (truncation happens in the data layer, not UI)
    expect(screen.getByText(/This is a very long conversation title/)).toBeInTheDocument();
  });
});
