import { useState, KeyboardEvent } from 'react';
import { Button } from '../ui/Button';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  isSending?: boolean;
}

export function MessageInput({ onSend, disabled = false, isSending = false }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    try {
      await onSend(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input border-t border-border p-4 flex gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        disabled={disabled || isSending}
        className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        rows={3}
      />
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled}
          className="h-full"
        >
          {isSending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
