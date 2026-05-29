import { useState, useEffect, useCallback } from 'react';
export function useSemanticLinks(noteId) {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchSemanticLinks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await window.api.links.getSemanticLinks(noteId);
            const semanticLinks = data.map(link => ({
                id: link.id,
                title: link.title,
                similarity: link.linkCount / 10,
            }));
            setLinks(semanticLinks);
            setError(null);
        }
        catch (err) {
            setError(err);
            setLinks([]);
        }
        finally {
            setLoading(false);
        }
    }, [noteId]);
    useEffect(() => {
        fetchSemanticLinks();
    }, [fetchSemanticLinks]);
    return { links, loading, error, refetch: fetchSemanticLinks };
}
