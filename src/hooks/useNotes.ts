import { useState, useEffect, useCallback } from 'react';

interface Note {
  id: string;
  title: string;
  body: string;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notes.getAll();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}

export function useNote(id: string, includeDeleted = false) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNote = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notes.getById(id, includeDeleted);
      setNote(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id, includeDeleted]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Listen for real-time note updates
  useEffect(() => {
    const unsubscribe = window.api.notes.onUpdated?.((updatedNote: Note) => {
      if (updatedNote.id === id) {
        setNote(updatedNote);
      }
    });

    return unsubscribe;
  }, [id]);

  return { note, loading, error, refetch: fetchNote };
}

export function useCreateNote() {
  const [loading, setLoading] = useState(false);

  const createNote = useCallback(async (data: { title: string; body: string; metadata?: string }) => {
    setLoading(true);
    try {
      const note = await window.api.notes.create(data);
      return note;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createNote, loading };
}

export function useUpdateNote() {
  const [loading, setLoading] = useState(false);

  const updateNote = useCallback(async (data: { id: string; title?: string; body?: string; metadata?: string }) => {
    setLoading(true);
    try {
      const note = await window.api.notes.update(data);
      return note;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateNote, loading };
}

export function useDeleteNote() {
  const [loading, setLoading] = useState(false);

  const deleteNote = useCallback(async (id: string, hard: boolean) => {
    setLoading(true);
    try {
      await window.api.notes.delete(id, hard);
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteNote, loading };
}
