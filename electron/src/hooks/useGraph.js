import { useState, useEffect, useCallback } from 'react';
import { graphAPI } from '../api.js';
import { handleAPIError } from '../utils/toast.js';
import { useSocket } from '../contexts/SocketContext.js';
export function useGraph() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket } = useSocket();
    const fetchGraph = useCallback(async () => {
        try {
            setLoading(true);
            const data = await graphAPI.getData();
            setGraphData(data);
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
        fetchGraph();
    }, [fetchGraph]);
    useEffect(() => {
        if (!socket)
            return;
        const handleNoteCreated = (note) => {
            setGraphData(prev => ({
                ...prev,
                nodes: [...prev.nodes, {
                        id: note.id,
                        title: note.title,
                        tags: note.tags || []
                    }]
            }));
        };
        socket.on('note:created', handleNoteCreated);
        return () => {
            socket.off('note:created', handleNoteCreated);
        };
    }, [socket]);
    return { graphData, loading, error, refetch: fetchGraph };
}
