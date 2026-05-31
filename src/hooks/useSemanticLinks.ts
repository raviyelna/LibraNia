import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { DATA_EVENTS, subscribeDataUpdated } from '../utils/data-events';

interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

interface SemanticLink {
  id: string;
  title: string;
  relationship: 'linked' | 'semantic' | 'missing';
  similarity?: number;
}

export function useSemanticLinks(noteId: string) {
  const [links, setLinks] = useState<SemanticLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSemanticLinks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.links.getRelated(noteId);
      setLinks(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchSemanticLinks();
  }, [fetchSemanticLinks]);

  useEffect(
    () => subscribeDataUpdated(DATA_EVENTS.notes, fetchSemanticLinks),
    [fetchSemanticLinks]
  );

  return { links, loading, error, refetch: fetchSemanticLinks };
}
