import { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (message: string) => {
    setIsSending(true);
    try {
      // Placeholder: hooks will be added in Plan 10
      console.log('Sending message:', message, 'to conversation:', conversationId);

      // For now, just add the message to local state
      const newMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: message,
        created_at: new Date(),
      };
      setMessages([...messages, newMessage]);
    } finally {
      setIsSending(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="chat-interface flex flex-col h-full bg-background text-foreground">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-secondary">
            <p>Select a conversation or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface flex flex-col h-full bg-background text-foreground">
      <MessageList messages={messages} />
      <MessageInput onSend={handleSendMessage} isSending={isSending} />
    </div>
  );
}
