import { useState, useEffect, useCallback } from 'react';
import { notesAPI } from '../api';
import { handleAPIError } from '../utils/toast';
import { useSocket } from '../contexts/SocketContext';
export function useNotes() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchNotes = useCallback(async () => {
        try {
            setLoading(true);
            const data = await notesAPI.getAll();
            setNotes(data);
            setError(null);
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);
    return { notes, loading, error, refetch: fetchNotes };
}
export function useNote(id) {
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket } = useSocket();
    const fetchNote = useCallback(async () => {
        try {
            setLoading(true);
            const data = await notesAPI.getById(id);
            setNote(data);
            setError(null);
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [id]);
    useEffect(() => {
        fetchNote();
    }, [fetchNote]);
    useEffect(() => {
        if (!socket)
            return;
        const handleNoteUpdated = (updatedNote) => {
            if (updatedNote.id === id) {
                setNote(updatedNote);
            }
        };
        socket.on('note:updated', handleNoteUpdated);
        return () => {
            socket.off('note:updated', handleNoteUpdated);
        };
    }, [socket, id]);
    return { note, loading, error, refetch: fetchNote };
}
export function useCreateNote() {
    const [loading, setLoading] = useState(false);
    const createNote = useCallback(async (data) => {
        setLoading(true);
        try {
            const note = await notesAPI.create(data);
            return note;
        }
        catch (err) {
            handleAPIError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { createNote, loading };
}
export function useUpdateNote() {
    const [loading, setLoading] = useState(false);
    const updateNote = useCallback(async (data) => {
        setLoading(true);
        try {
            const { id, ...updateData } = data;
            const note = await notesAPI.update(id, updateData);
            return note;
        }
        catch (err) {
            handleAPIError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { updateNote, loading };
}
export function useDeleteNote() {
    const [loading, setLoading] = useState(false);
    const deleteNote = useCallback(async (id) => {
        setLoading(true);
        try {
            await notesAPI.delete(id);
        }
        catch (err) {
            handleAPIError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { deleteNote, loading };
}
