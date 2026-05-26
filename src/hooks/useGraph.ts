import { useState, useEffect, useCallback } from 'react';
import { GraphData, GraphNode, GraphLink } from '../types/graph';

export function useGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.graph.getData();
      setGraphData(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graphData, loading, error, refetch: fetchGraph };
}
