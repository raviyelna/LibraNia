import { useState, useEffect, useCallback } from 'react';
import { GraphData, GraphNode, GraphLink } from '../types/graph';
import { graphAPI, GraphData as APIGraphData } from '../api';
import { handleAPIError } from '../utils/toast';
import { useSocket } from '../contexts/SocketContext';

export function useGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { socket } = useSocket();

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const data = await graphAPI.getData();
      setGraphData(data);
      setError(null);
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Listen for real-time note creation events via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNoteCreated = (note: any) => {
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
