import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { chatAPI } from '../api';
import { handleAPIError } from '../utils/toast';

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
  const { socket } = useSocket();

  // Listen for streaming tokens via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleToken = (data: { conversationId: string; token: string }) => {
      if (data.conversationId === conversationId || !conversationId) {
        setStreamingContent((prev) => prev + data.token);
      }
    };

    socket.on('ai:token', handleToken);

    return () => {
      socket.off('ai:token', handleToken);
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback(
    async (message: string, providerId: string, model: string, useWebSearch: boolean) => {
      if (!socket) {
        const error = new Error('Socket not connected');
        setError(error);
        handleAPIError(error);
        throw error;
      }

      setLoading(true);
      setError(null);
      setStreamingContent('');

      try {
        socket.emit('ai:chat', {
          conversationId: conversationId || null,
          messages: [{ role: 'user', content: message }],
          providerId,
          model,
          useWebSearch,
        });

        // Note: Response will come via 'ai:token' events handled in useEffect
        // Return a placeholder response structure
        return {
          conversationId: conversationId || 'new',
          messageId: 'streaming',
          response: 'streaming',
        } as SendMessageResponse;
      } catch (err) {
        handleAPIError(err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [socket, conversationId]
  );

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
        const summary = await chatAPI.summarizeNote(noteId);
        setSummary(summary);
        return { summary };
      } catch (err) {
        handleAPIError(err);
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
