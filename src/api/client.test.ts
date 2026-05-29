import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiRequest, APIError } from './client';

describe('API Client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('apiRequest', () => {
    it('returns parsed JSON for successful 200 response', async () => {
      const mockData = { success: true, data: { id: 1, title: 'Test' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiRequest('/api/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws APIError with status 404 for not found', async () => {
      const errorData = { error: 'Not found' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorData,
      });

      await expect(apiRequest('/api/test')).rejects.toThrow(APIError);
      await expect(apiRequest('/api/test')).rejects.toMatchObject({
        status: 404,
        message: 'Not found',
      });
    });

    it('throws APIError with status 0 for network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(apiRequest('/api/test')).rejects.toThrow(APIError);
      await expect(apiRequest('/api/test')).rejects.toMatchObject({
        status: 0,
      });
    });

    it('APIError includes status code and error message', async () => {
      const errorData = { error: 'Validation failed' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorData,
      });

      try {
        await apiRequest('/api/test');
        expect.fail('Should have thrown APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).status).toBe(400);
        expect((error as APIError).message).toBe('Validation failed');
        expect((error as APIError).data).toEqual(errorData);
      }
    });

    it('Base URL uses VITE_API_URL env var with localhost:3000 fallback', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      // Test with default fallback (VITE_API_URL not set)
      await apiRequest('/api/test');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.any(Object)
      );
    });
  });
});
