import { useState, useEffect, useCallback } from 'react';

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
      const data = await window.api.content.getAll();
      setContent(data);
      setError(null);
    } catch (err) {
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
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (
      source: 'manual' | 'ai-generated',
      options?: { confidence_score?: number; note_id?: string; message_id?: string }
    ): Promise<Content | null> => {
      setUploading(true);
      setError(null);

      try {
        // Show file picker
        const uploadResult = await window.api.content.upload();

        // User canceled
        if (uploadResult.canceled) {
          return null;
        }

        // Create content record
        const content = await window.api.content.create({
          filePath: uploadResult.filePath,
          source,
          ...options,
        });

        return content;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading, error };
}

export function useDeleteContent() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteContent = useCallback(async (id: string): Promise<boolean> => {
    setDeleting(true);
    setError(null);

    try {
      const success = await window.api.content.delete(id);
      return success;
    } catch (err) {
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
        const data = await window.api.content.getById(id);
        setContent(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  return { content, loading, error };
}
