import { useState, useEffect, useCallback } from 'react';

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

interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  messages?: Message[];
  citations?: Citation[];
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.conversation.getAll();
      // Sort by updated_at DESC (most recent first) per D-10
      const sorted = [...data].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setConversations(sorted);
      setError(null);
    } catch (err) {
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
      const data = await window.api.conversation.get(id);
      setConversation(data);
      setError(null);
    } catch (err) {
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
      await window.api.conversation.delete(id);
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteConversation, loading };
}
