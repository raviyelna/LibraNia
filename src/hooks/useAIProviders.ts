import { useState, useEffect, useCallback } from 'react';
import { aiAPI, AIProvider, ProviderConfig, ValidationResult } from '../api';
import { handleAPIError } from '../utils/toast';

/**
 * Hook for managing AI provider configurations
 * Follows useNotes.ts pattern from Phase 2
 */
export function useAIProviders() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[useAIProviders] Fetching providers...');
      const data = await aiAPI.getProviders();
      console.log('[useAIProviders] Received data:', data);
      console.log('[useAIProviders] Data type:', typeof data, 'Array:', Array.isArray(data));
      setProviders(data);
      setError(null);
    } catch (err) {
      console.error('[useAIProviders] Error:', err);
      handleAPIError(err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const setConfig = useCallback(async (config: ProviderConfig) => {
    try {
      console.log('[useAIProviders] Saving config:', {
        id: config.id,
        hasApiKey: !!config.apiKey,
        apiKeyLength: config.apiKey?.length,
        model: config.model
      });
      await aiAPI.setConfig(config);
      console.log('[useAIProviders] Config saved, refetching...');
      await fetchProviders(); // Refetch all configs
      console.log('[useAIProviders] Refetch complete');
    } catch (err) {
      console.error('[useAIProviders] setConfig error:', err);
      handleAPIError(err);
      setError(err as Error);
      throw err;
    }
  }, [fetchProviders]);

  const deleteConfig = useCallback(async (providerId: string) => {
    try {
      await aiAPI.deleteConfig(providerId);
      await fetchProviders(); // Refetch all configs
    } catch (err) {
      handleAPIError(err);
      setError(err as Error);
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

/**
 * Hook for validating AI provider API keys
 * Separate from useAIProviders to avoid unnecessary re-renders
 */
export function useProviderValidation() {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validate = useCallback(async (
    providerId: string,
    apiKey: string,
    baseURL?: string
  ) => {
    try {
      setValidating(true);
      const result = await aiAPI.validateKey(providerId, apiKey, baseURL);
      setValidationResult(result);
      return result;
    } catch (err) {
      const errorResult = { valid: false, error: (err as Error).message };
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setValidating(false);
    }
  }, []);

  return {
    validate,
    validating,
    validationResult,
  };
}
