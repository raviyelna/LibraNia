import { useState, useEffect, useCallback } from 'react';

interface SemanticLink {
  id: string;
  title: string;
  similarity: number;
}

export function useSemanticLinks(noteId: string) {
  const [links, setLinks] = useState<SemanticLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSemanticLinks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.links.getSemanticLinks(noteId);
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

  return { links, loading, error, refetch: fetchSemanticLinks };
}
