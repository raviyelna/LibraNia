import { useState, useEffect, useCallback } from 'react';
import { conversationsAPI } from '../api';
import { handleAPIError } from '../utils/toast';
export function useConversations() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await conversationsAPI.getAll();
            const sorted = [...data].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            setConversations(sorted);
            setError(null);
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);
    return { conversations, loading, error, refetch: fetchConversations };
}
export function useConversation(id) {
    const [conversation, setConversation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchConversation = useCallback(async () => {
        try {
            setLoading(true);
            const data = await conversationsAPI.getById(id);
            setConversation(data);
            setError(null);
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
        }
        finally {
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
    const deleteConversation = useCallback(async (id) => {
        setLoading(true);
        try {
            await conversationsAPI.delete(id);
        }
        catch (err) {
            handleAPIError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { deleteConversation, loading };
}
