import { useState, useEffect, useCallback } from 'react';
import { contentAPI, uploadContent, Content } from '../api/content';
import { handleAPIError } from '../utils/toast';

export type { Content };

export function useContent(noteId?: string | null) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contentAPI.getAll(noteId || undefined);
      setContent(data);
      setError(null);
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, loading, error, refetch: fetchContent };
}

export function useUploadContent() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (
      file: File,
      source: 'manual' | 'ai-generated',
      options?: { confidence_score?: number; note_id?: string; message_id?: string }
    ): Promise<Content> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const content = await uploadContent(file, source, options, (percent) => setProgress(percent));
        return content;
      } catch (err) {
        handleAPIError(err);
        setError(err as Error);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading, progress, error };
}

export function useDeleteContent() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteContent = useCallback(async (id: string): Promise<void> => {
    setDeleting(true);
    setError(null);

    try {
      await contentAPI.delete(id);
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  return { deleteContent, deleting, error };
}

export function useContentById(id: string | null) {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setContent(null);
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await contentAPI.getById(id);
        setContent(data);
        setError(null);
      } catch (err) {
        handleAPIError(err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  return { content, loading, error };
}
