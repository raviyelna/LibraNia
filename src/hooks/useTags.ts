import { useState, useEffect, useCallback } from 'react';

interface Tag {
  id: string;
  name: string;
  created_at: Date;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.tags.getAll();
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, refetch: fetchTags };
}

export function useNoteTags(noteId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.tags.getForNote(noteId);
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch note tags:', err);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = useCallback(async (tagName: string) => {
    try {
      await window.api.tags.addToNote(noteId, [tagName]);
      await fetchTags();
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  }, [noteId, fetchTags]);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      await window.api.tags.removeFromNote(noteId, tagId);
      await fetchTags();
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  }, [noteId, fetchTags]);

  return { tags, loading, addTag, removeTag, refetch: fetchTags };
}
