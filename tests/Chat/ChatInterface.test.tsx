import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../../src/components/Chat/MessageBubble';
import { CitationList } from '../../src/components/Chat/CitationList';
import { ProviderBadge } from '../../src/components/Chat/ProviderBadge';

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
