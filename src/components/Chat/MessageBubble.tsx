import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
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
        {isAssistant ? (
          <div className="message-content prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={{
                img: ({ node, ...props }) => (
                  <img {...props} className="max-w-full h-auto rounded" loading="lazy" />
                ),
                code: ({ node, className, children, ...props }) => {
                  const inline = !className;
                  return inline ? (
                    <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-muted p-2 rounded text-sm overflow-x-auto" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="message-content whitespace-pre-wrap">{content}</div>
        )}

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
