import { useState, useEffect, useCallback } from 'react';
import { conversationsAPI, Conversation } from '../api';
import { handleAPIError } from '../utils/toast';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  provider_id?: string;
  model?: string;
  created_at: Date;
}

interface Citation {
  id: string;
  message_id: string;
  title: string;
  url: string;
  snippet?: string;
  position: number;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await conversationsAPI.getAll();
      // Sort by updated_at DESC (most recent first) per D-10
      const sorted = [...data].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setConversations(sorted);
      setError(null);
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations };
}

export function useConversation(id: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true);
      const data = await conversationsAPI.getById(id);
      setConversation(data);
      setError(null);
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  return { conversation, loading, error, refetch: fetchConversation };
}

export function useDeleteConversation() {
  const [loading, setLoading] = useState(false);

  const deleteConversation = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await conversationsAPI.delete(id);
    } catch (err) {
      handleAPIError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteConversation, loading };
}
