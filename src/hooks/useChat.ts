import { useState, useEffect, useCallback } from 'react';

interface SendMessageResponse {
  conversationId: string;
  messageId: string;
  response: string;
}

interface SummarizeResponse {
  summary: string;
}

export function useSendMessage(conversationId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  const sendMessage = useCallback(
    async (message: string, providerId: string, model: string, useWebSearch: boolean) => {
      setLoading(true);
      setError(null);
      setStreamingContent('');

      try {
        // Register token listener for streaming
        const cleanup = window.api.chat.onToken((data) => {
          if (data.conversationId === conversationId || !conversationId) {
            setStreamingContent((prev) => prev + data.token);
          }
        });

        const response = await window.api.chat.send({
          conversationId: conversationId || null,
          message,
          providerId,
          model,
          useWebSearch,
        });

        // Clean up token listener
        cleanup();

        return response;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Clean up token listener on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled per-request in sendMessage
    };
  }, []);

  return { sendMessage, loading, error, streamingContent };
}

export function useSummarizeNote(noteId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const summarize = useCallback(
    async (providerId: string, model: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await window.api.chat.summarizeNote(noteId);
        setSummary(response.summary);
        return response;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [noteId]
  );

  return { summarize, loading, error, summary };
}

export function useChat(conversationId?: string) {
  const sendMessageHook = useSendMessage(conversationId);
  const summarizeHook = useSummarizeNote(''); // noteId will be provided when calling summarize

  return {
    sendMessage: sendMessageHook.sendMessage,
    summarize: summarizeHook.summarize,
    loading: sendMessageHook.loading || summarizeHook.loading,
    error: sendMessageHook.error || summarizeHook.error,
    streamingContent: sendMessageHook.streamingContent,
    summary: summarizeHook.summary,
  };
}
