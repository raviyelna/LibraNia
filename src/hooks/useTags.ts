import { useState, useEffect, useCallback } from 'react';
import { tagsAPI, Tag } from '../api';
import { handleAPIError } from '../utils/toast';
import { DATA_EVENTS, emitDataUpdated, subscribeDataUpdated } from '../utils/data-events';

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

  useEffect(() => subscribeDataUpdated(DATA_EVENTS.tags, fetchTags), [fetchTags]);

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

  useEffect(() => subscribeDataUpdated(DATA_EVENTS.tags, fetchTags), [fetchTags]);

  const addTag = useCallback(async (tagName: string) => {
    try {
      await tagsAPI.addToNote(noteId, tagName);
      await fetchTags();
      emitDataUpdated(DATA_EVENTS.tags);
    } catch (err) {
      handleAPIError(err);
    }
  }, [noteId, fetchTags]);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      await tagsAPI.removeFromNote(noteId, tagId);
      await fetchTags();
      emitDataUpdated(DATA_EVENTS.tags);
    } catch (err) {
      handleAPIError(err);
    }
  }, [noteId, fetchTags]);

  return { tags, loading, addTag, removeTag, refetch: fetchTags };
}
