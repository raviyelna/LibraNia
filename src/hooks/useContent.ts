import { useState, useEffect, useCallback } from 'react';
import { contentAPI, uploadContent } from '../api/content';
import { handleAPIError } from '../utils/toast';

export interface Content {
  id: string;
  file_path: string;
  thumbnail_path: string | null;
  mime_type: string;
  original_filename: string;
  file_size: number;
  extracted_text: string | null;
  source: 'manual' | 'ai-generated';
  confidence_score: number | null;
  metadata: string | null;
  note_id: string | null;
  message_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export function useContent() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contentAPI.getAll();
      setContent(data);
      setError(null);
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

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
        const content = await uploadContent(file, source, (percent) => setProgress(percent));
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
