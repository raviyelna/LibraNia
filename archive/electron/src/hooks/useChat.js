import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext.js';
import { chatAPI } from '../api.js';
import { handleAPIError } from '../utils/toast.js';
export function useSendMessage(conversationId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [streamingContent, setStreamingContent] = useState('');
    const { socket } = useSocket();
    useEffect(() => {
        if (!socket)
            return;
        const handleToken = (data) => {
            if (data.conversationId === conversationId || !conversationId) {
                setStreamingContent((prev) => prev + data.token);
            }
        };
        socket.on('ai:token', handleToken);
        return () => {
            socket.off('ai:token', handleToken);
        };
    }, [socket, conversationId]);
    const sendMessage = useCallback(async (message, providerId, model, useWebSearch) => {
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
            return {
                conversationId: conversationId || 'new',
                messageId: 'streaming',
                response: 'streaming',
            };
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [socket, conversationId]);
    return { sendMessage, loading, error, streamingContent };
}
export function useSummarizeNote(noteId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);
    const summarize = useCallback(async (providerId, model) => {
        setLoading(true);
        setError(null);
        try {
            const summary = await chatAPI.summarizeNote(noteId);
            setSummary(summary);
            return { summary };
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [noteId]);
    return { summarize, loading, error, summary };
}
export function useChat(conversationId) {
    const sendMessageHook = useSendMessage(conversationId);
    const summarizeHook = useSummarizeNote('');
    return {
        sendMessage: sendMessageHook.sendMessage,
        summarize: summarizeHook.summarize,
        loading: sendMessageHook.loading || summarizeHook.loading,
        error: sendMessageHook.error || summarizeHook.error,
        streamingContent: sendMessageHook.streamingContent,
        summary: summarizeHook.summary,
    };
}
