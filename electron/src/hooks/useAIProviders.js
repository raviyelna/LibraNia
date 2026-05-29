import { useState, useEffect, useCallback } from 'react';
import { aiAPI } from '../api';
import { handleAPIError } from '../utils/toast';
export function useAIProviders() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchProviders = useCallback(async () => {
        try {
            setLoading(true);
            console.log('[useAIProviders] Fetching providers...');
            const data = await aiAPI.getProviders();
            console.log('[useAIProviders] Received data:', data);
            console.log('[useAIProviders] Data type:', typeof data, 'Array:', Array.isArray(data));
            setProviders(data);
            setError(null);
        }
        catch (err) {
            console.error('[useAIProviders] Error:', err);
            handleAPIError(err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);
    const setConfig = useCallback(async (config) => {
        try {
            console.log('[useAIProviders] Saving config:', {
                id: config.id,
                hasApiKey: !!config.apiKey,
                apiKeyLength: config.apiKey?.length,
                model: config.model
            });
            await aiAPI.setConfig(config);
            console.log('[useAIProviders] Config saved, refetching...');
            await fetchProviders();
            console.log('[useAIProviders] Refetch complete');
        }
        catch (err) {
            console.error('[useAIProviders] setConfig error:', err);
            handleAPIError(err);
            setError(err);
            throw err;
        }
    }, [fetchProviders]);
    const deleteConfig = useCallback(async (providerId) => {
        try {
            await aiAPI.deleteConfig(providerId);
            await fetchProviders();
        }
        catch (err) {
            handleAPIError(err);
            setError(err);
            throw err;
        }
    }, [fetchProviders]);
    return {
        providers,
        loading,
        error,
        setConfig,
        deleteConfig,
        refetch: fetchProviders,
    };
}
export function useProviderValidation() {
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const validate = useCallback(async (providerId, apiKey, baseURL) => {
        try {
            setValidating(true);
            const result = await aiAPI.validateKey(providerId, apiKey, baseURL);
            setValidationResult(result);
            return result;
        }
        catch (err) {
            const errorResult = { valid: false, error: err.message };
            setValidationResult(errorResult);
            return errorResult;
        }
        finally {
            setValidating(false);
        }
    }, []);
    return {
        validate,
        validating,
        validationResult,
    };
}
