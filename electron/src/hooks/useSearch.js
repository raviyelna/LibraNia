import { useState, useCallback } from 'react';
import { searchAPI } from '../api';
import { handleAPIError } from '../utils/toast';
export function useSearch() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const search = useCallback(async (query, mode = 'quickNav') => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        try {
            setLoading(true);
            let data;
            switch (mode) {
                case 'semantic':
                    data = await searchAPI.semantic(query);
                    break;
                case 'quickNav':
                case 'fullText':
                case 'fuzzy':
                default:
                    data = await searchAPI.search(query, mode);
                    break;
            }
            setResults(data);
        }
        catch (err) {
            handleAPIError(err);
            setResults([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { search, results, loading };
}
