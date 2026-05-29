import { useState, useEffect, useCallback } from 'react';
import { contentAPI, uploadContent } from '../api/content.js';
import { handleAPIError } from '../utils/toast.js';
export function useContent() {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);
            const data = await contentAPI.getAll();
            setContent(data);
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
        fetchContent();
    }, [fetchContent]);
    return { content, loading, error, refetch: fetchContent };
}
export function useUploadContent() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const upload = useCallback(async (file, source, options) => {
        setUploading(true);
        setProgress(0);
        setError(null);
        try {
            const content = await uploadContent(file, source, (percent) => setProgress(percent));
            return content;
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
            throw err;
        }
        finally {
            setUploading(false);
        }
    }, []);
    return { upload, uploading, progress, error };
}
export function useDeleteContent() {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    const deleteContent = useCallback(async (id) => {
        setDeleting(true);
        setError(null);
        try {
            await contentAPI.delete(id);
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
            throw err;
        }
        finally {
            setDeleting(false);
        }
    }, []);
    return { deleteContent, deleting, error };
}
export function useContentById(id) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            }
            catch (err) {
                handleAPIError(err);
                setError(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [id]);
    return { content, loading, error };
}
