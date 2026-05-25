import { CitationList } from './CitationList';
import { ProviderBadge } from './ProviderBadge';

interface Citation {
  position: number;
  url: string;
  title: string;
  snippet?: string;
}

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider_id?: string;
  model?: string;
  citations?: Citation[];
  created_at: Date;
}

export function MessageBubble({
  role,
  content,
  provider_id,
  model,
  citations = [],
  created_at,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`} data-testid="message-bubble-container">
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <div className="message-content whitespace-pre-wrap">{content}</div>

        {citations.length > 0 && <CitationList citations={citations} />}

        <div className="message-footer mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-secondary">
            {created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isAssistant && provider_id && model && (
            <ProviderBadge provider_id={provider_id} model={model} />
          )}
        </div>
      </div>
    </div>
  );
}
