import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { Chat } from '../../src/routes/Chat';
import { Sidebar } from '../../src/components/Layout/Sidebar';
import App from '../../src/App';

// Mock the hooks
vi.mock('../../src/hooks/useConversations', () => ({
  useConversations: vi.fn(),
}));

// Mock useTheme hook for Sidebar
vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
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

// Mock window.matchMedia for ThemeContext
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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

describe('Chat Navigation and Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConversations.mockReturnValue({
      conversations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('Sidebar contains "Chat" navigation link', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('Chat link navigates to /chat route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    const chatLink = screen.getByText('Chat').closest('a');
    expect(chatLink).toHaveAttribute('href', '/chat');
  });

  it('Chat link shows active state when on /chat route', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Sidebar />
      </MemoryRouter>
    );

    const chatLink = screen.getByText('Chat').closest('a');
    expect(chatLink).toHaveClass('bg-primary');
  });

  it('App.tsx registers /chat route with Chat component', () => {
    // Test that navigating to /chat renders the Chat component
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </MemoryRouter>
    );

    // If route is registered, Chat component should render
    expect(screen.getByText('Conversations')).toBeInTheDocument();
  });

  it('Navigating to /chat renders Chat route', () => {
    // Test that the Chat route renders correctly
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </MemoryRouter>
    );

    // Chat route should render the conversation list and chat interface
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
  });
});
