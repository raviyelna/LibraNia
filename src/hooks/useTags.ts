import { useState, useEffect, useCallback } from 'react';
import { tagsAPI, Tag } from '../api';
import { handleAPIError } from '../utils/toast';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tagsAPI.getAll();
      setTags(data);
    } catch (err) {
      handleAPIError(err);
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
      const data = await tagsAPI.getByNote(noteId);
      setTags(data);
    } catch (err) {
      handleAPIError(err);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = useCallback(async (tagId: string) => {
    try {
      await tagsAPI.addToNote(noteId, tagId);
      await fetchTags();
    } catch (err) {
      handleAPIError(err);
    }
  }, [noteId, fetchTags]);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      await tagsAPI.removeFromNote(noteId, tagId);
      await fetchTags();
    } catch (err) {
      handleAPIError(err);
    }
  }, [noteId, fetchTags]);

  return { tags, loading, addTag, removeTag, refetch: fetchTags };
}
