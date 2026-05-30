import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';

interface Citation {
  position: number;
  url: string;
  title: string;
  snippet?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id?: string;
  model?: string;
  citations?: Citation[];
  created_at: Date;
}

interface MessageListProps {
  messages: Message[];
  isGenerating?: boolean;
  generationStatus?: string;
}

export function MessageList({ messages, isGenerating = false, generationStatus }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current && bottomRef.current.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  if (messages.length === 0 && !isGenerating) {
    return (
      <div className="message-list flex-1 overflow-y-auto scrollable p-4 flex items-center justify-center">
        <div className="text-center text-secondary">
          Start a conversation by asking a question below
        </div>
      </div>
    );
  }

  return (
    <div className="message-list flex-1 overflow-y-auto scrollable p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
          provider_id={message.provider_id}
          model={message.model}
          citations={message.citations}
          created_at={message.created_at}
        />
      ))}

      {isGenerating && generationStatus && (
        <div className="flex justify-start">
          <div className="bg-muted text-foreground rounded-lg p-4 text-sm">
            {generationStatus}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
