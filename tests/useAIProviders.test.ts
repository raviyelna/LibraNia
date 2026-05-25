import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIProviders, useProviderValidation } from '../src/hooks/useAIProviders';

// Mock window.api.providers
const mockProvidersAPI = {
  getAllConfigs: vi.fn(),
  setConfig: vi.fn(),
  deleteConfig: vi.fn(),
  validate: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    (window as any).api = {
      providers: mockProvidersAPI,
    };
  }
});

describe('useAIProviders', () => {
  it('Test 1: useAIProviders loads all provider configs on mount', async () => {
    const mockConfigs = [
      { id: 'claude' as const, apiKey: 'key1', model: 'claude-3-5-sonnet-20241022' },
      { id: 'openai' as const, apiKey: 'key2', model: 'gpt-4' },
    ];

    mockProvidersAPI.getAllConfigs.mockResolvedValue(mockConfigs);

    const { result } = renderHook(() => useAIProviders());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.providers).toEqual([]);

    // Wait for data to load
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockProvidersAPI.getAllConfigs).toHaveBeenCalled();
    expect(result.current.providers).toEqual(mockConfigs);
    expect(result.current.error).toBeNull();
  });

  it('Test 2: useAIProviders.setConfig saves provider config via IPC', async () => {
    mockProvidersAPI.getAllConfigs.mockResolvedValue([]);
    mockProvidersAPI.setConfig.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAIProviders());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newConfig = {
      id: 'claude' as const,
      apiKey: 'new-key',
      model: 'claude-3-5-sonnet-20241022',
    };

    await act(async () => {
      await result.current.setConfig(newConfig);
    });

    expect(mockProvidersAPI.setConfig).toHaveBeenCalledWith(newConfig);
    expect(mockProvidersAPI.getAllConfigs).toHaveBeenCalledTimes(2); // Initial load + refetch
  });

  it('Test 3: useAIProviders.deleteConfig removes provider config via IPC', async () => {
    const mockConfigs = [
      { id: 'claude' as const, apiKey: 'key1', model: 'claude-3-5-sonnet-20241022' },
    ];

    mockProvidersAPI.getAllConfigs.mockResolvedValue(mockConfigs);
    mockProvidersAPI.deleteConfig.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAIProviders());

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteConfig('claude');
    });

    expect(mockProvidersAPI.deleteConfig).toHaveBeenCalledWith('claude');
    expect(mockProvidersAPI.getAllConfigs).toHaveBeenCalledTimes(2); // Initial load + refetch
  });
});

describe('useProviderValidation', () => {
  it('Test 4: useProviderValidation validates API key and returns result', async () => {
    mockProvidersAPI.validate.mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useProviderValidation());

    expect(result.current.validating).toBe(false);
    expect(result.current.validationResult).toBeNull();

    await act(async () => {
      await result.current.validate('claude', 'test-key', 'https://api.anthropic.com');
    });

    expect(mockProvidersAPI.validate).toHaveBeenCalledWith('claude', 'test-key', 'https://api.anthropic.com');
    expect(result.current.validating).toBe(false);
    expect(result.current.validationResult).toEqual({ valid: true });
  });

  it('Test 5: useProviderValidation shows loading state during validation', async () => {
    let resolveValidation: (value: any) => void;
    const validationPromise = new Promise((resolve) => {
      resolveValidation = resolve;
    });

    mockProvidersAPI.validate.mockReturnValue(validationPromise);

    const { result } = renderHook(() => useProviderValidation());

    expect(result.current.validating).toBe(false);

    // Start validation
    act(() => {
      result.current.validate('openai', 'test-key');
    });

    // Should be validating
    await vi.waitFor(() => {
      expect(result.current.validating).toBe(true);
    });

    // Resolve validation
    act(() => {
      resolveValidation!({ valid: true });
    });

    // Should finish validating
    await vi.waitFor(() => {
      expect(result.current.validating).toBe(false);
    });

    expect(result.current.validationResult).toEqual({ valid: true });
  });
});
