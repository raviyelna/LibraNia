import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from '../../src/components/Chat/MessageBubble';
import { CitationList } from '../../src/components/Chat/CitationList';
import { ProviderBadge } from '../../src/components/Chat/ProviderBadge';
import { MessageInput } from '../../src/components/Chat/MessageInput';
import { MessageList } from '../../src/components/Chat/MessageList';
import { ChatInterface } from '../../src/components/Chat/ChatInterface';

describe('MessageBubble', () => {
  it('renders user messages with right-aligned styling', () => {
    render(
      <MessageBubble
        role="user"
        content="Hello AI"
        created_at={new Date('2026-05-25T10:00:00Z')}
      />
    );

    const bubble = screen.getByTestId('message-bubble-container');
    expect(bubble).toHaveClass('justify-end');
  });

  it('renders assistant messages with left-aligned styling', () => {
    render(
      <MessageBubble
        role="assistant"
        content="Hello human"
        created_at={new Date('2026-05-25T10:00:00Z')}
      />
    );

    const bubble = screen.getByTestId('message-bubble-container');
    expect(bubble).toHaveClass('justify-start');
  });

  it('displays ProviderBadge for assistant messages only', () => {
    const { rerender } = render(
      <MessageBubble
        role="assistant"
        content="AI response"
        provider_id="claude"
        model="sonnet-4"
        created_at={new Date('2026-05-25T10:00:00Z')}
      />
    );

    expect(screen.getByText(/Claude/i)).toBeInTheDocument();

    rerender(
      <MessageBubble
        role="user"
        content="User message"
        created_at={new Date('2026-05-25T10:00:00Z')}
      />
    );

    expect(screen.queryByText(/Claude/i)).not.toBeInTheDocument();
  });
});

describe('CitationList', () => {
  const mockCitations = [
    { position: 1, url: 'https://react.dev/learn', title: 'React Documentation', snippet: 'Learn React' },
    { position: 2, url: 'https://vitejs.dev/guide/', title: 'Vite Guide', snippet: 'Getting started' },
    { position: 3, url: 'https://example.com/article', title: 'Example Article', snippet: 'Sample text' },
  ];

  it('renders footnote links [1], [2], [3] per D-16', () => {
    render(<CitationList citations={mockCitations} />);

    expect(screen.getByText(/\[1\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[2\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[3\]/)).toBeInTheDocument();
  });

  it('links are clickable and open in external browser per D-17', () => {
    window.api = { openExternal: vi.fn() };

    render(<CitationList citations={mockCitations} />);

    const firstLink = screen.getByText(/\[1\].*React Documentation/);
    firstLink.click();

    expect(window.api.openExternal).toHaveBeenCalledWith('https://react.dev/learn');
  });

  it('shows title + domain per D-18', () => {
    render(<CitationList citations={mockCitations} />);

    expect(screen.getByText(/React Documentation - react.dev/)).toBeInTheDocument();
    expect(screen.getByText(/Vite Guide - vitejs.dev/)).toBeInTheDocument();
    expect(screen.getByText(/Example Article - example.com/)).toBeInTheDocument();
  });
});

describe('ProviderBadge', () => {
  it('displays provider name and model per D-06, D-23', () => {
    const { rerender } = render(<ProviderBadge provider_id="claude" model="sonnet-4" />);
    expect(screen.getByText(/Claude.*sonnet-4/i)).toBeInTheDocument();

    rerender(<ProviderBadge provider_id="openai" model="gpt-4o" />);
    expect(screen.getByText(/GPT.*gpt-4o/i)).toBeInTheDocument();

    rerender(<ProviderBadge provider_id="deepseek" model="chat" />);
    expect(screen.getByText(/DeepSeek.*chat/i)).toBeInTheDocument();
  });
});

describe('MessageInput', () => {
  it('renders textarea with send button', () => {
    const mockOnSend = vi.fn();
    render(<MessageInput onSend={mockOnSend} />);

    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('calls onSend callback with message text on submit', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    render(<MessageInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    await userEvent.type(textarea, 'Test message');
    await userEvent.click(sendButton);

    expect(mockOnSend).toHaveBeenCalledWith('Test message');
  });

  it('clears textarea after successful send', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    render(<MessageInput onSend={mockOnSend} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i) as HTMLTextAreaElement;
    await userEvent.type(textarea, 'Test message');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('disables send button when text is empty or sending', () => {
    const mockOnSend = vi.fn();
    const { rerender } = render(<MessageInput onSend={mockOnSend} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();

    rerender(<MessageInput onSend={mockOnSend} isSending={true} />);
    expect(sendButton).toBeDisabled();
  });

  it('shows progress indicator when sending per D-15', () => {
    const mockOnSend = vi.fn();
    render(<MessageInput onSend={mockOnSend} isSending={true} />);

    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });
});

describe('MessageList', () => {
  const mockMessages = [
    {
      id: '1',
      role: 'user' as const,
      content: 'Hello',
      created_at: new Date('2026-05-25T10:00:00Z'),
    },
    {
      id: '2',
      role: 'assistant' as const,
      content: 'Hi there',
      provider_id: 'claude',
      model: 'sonnet-4',
      created_at: new Date('2026-05-25T10:01:00Z'),
    },
  ];

  it('renders array of messages using MessageBubble', () => {
    render(<MessageList messages={mockMessages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('auto-scrolls to bottom when new message arrives', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(<MessageList messages={mockMessages} />);

    const newMessages = [
      ...mockMessages,
      {
        id: '3',
        role: 'user' as const,
        content: 'New message',
        created_at: new Date('2026-05-25T10:02:00Z'),
      },
    ];

    rerender(<MessageList messages={newMessages} />);

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('shows generation status during AI response per D-15', () => {
    render(<MessageList messages={mockMessages} isGenerating={true} generationStatus="Searching web..." />);

    expect(screen.getByText(/searching web/i)).toBeInTheDocument();
  });
});

describe('ChatInterface', () => {
  it('renders MessageList and MessageInput', () => {
    render(<ChatInterface conversationId="test-conv-1" />);

    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('accepts conversationId prop and displays that conversation', () => {
    render(<ChatInterface conversationId="test-conv-1" />);

    // Component should render with conversationId prop
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
  });

  it('shows empty state when no conversationId provided', () => {
    render(<ChatInterface />);

    expect(screen.getByText(/select a conversation or start a new one/i)).toBeInTheDocument();
  });

  it('fills parent container height per D-08', () => {
    const { container } = render(<ChatInterface conversationId="test-conv-1" />);

    const chatInterface = container.firstChild as HTMLElement;
    expect(chatInterface).toHaveClass('h-full');
  });

  it('handles message send from MessageInput', async () => {
    render(<ChatInterface conversationId="test-conv-1" />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    await userEvent.type(textarea, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });
});
