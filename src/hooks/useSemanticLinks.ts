import { useState, useEffect, useCallback } from 'react';

interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

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
      const data: Backlink[] = await window.api.links.getSemanticLinks(noteId);
      // Convert Backlink to SemanticLink (linkCount → similarity)
      const semanticLinks: SemanticLink[] = data.map(link => ({
        id: link.id,
        title: link.title,
        similarity: link.linkCount / 10, // Normalize linkCount to similarity score
      }));
      setLinks(semanticLinks);
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
