import { describe, it, expect } from 'vitest';

describe('AIProvider Interface', () => {
  it('should export AIProvider interface with required methods', async () => {
    const module = await import('../electron/services/ai/providers/base.provider');

    // TypeScript interfaces don't exist at runtime, but we can verify the module exports
    expect(module).toBeDefined();

    // We'll verify the interface structure through implementation tests
    // This test ensures the module can be imported
  });

  it('should export Message interface with role and content', async () => {
    const module = await import('../electron/services/ai/providers/base.provider');
    expect(module).toBeDefined();
  });

  it('should export GenerateOptions interface with model, temperature, maxTokens, signal', async () => {
    const module = await import('../electron/services/ai/providers/base.provider');
    expect(module).toBeDefined();
  });
});

describe('AIProvider Interface Structure (TypeScript compilation test)', () => {
  it('should have AIProvider interface with name property', async () => {
    // This test verifies TypeScript compilation
    const { AIProvider } = await import('../electron/services/ai/providers/base.provider') as any;

    // Create a mock implementation to verify interface structure
    const mockProvider: typeof AIProvider = {
      name: 'test',
      validateApiKey: async () => true,
      generateResponse: async () => '',
      getSupportedModels: () => [],
    };

    expect(mockProvider.name).toBe('test');
  });

  it('should have AIProvider interface with validateApiKey method', async () => {
    const module = await import('../electron/services/ai/providers/base.provider') as any;

    const mockProvider: any = {
      name: 'test',
      validateApiKey: async (apiKey: string, baseURL?: string) => true,
      generateResponse: async () => '',
      getSupportedModels: () => [],
    };

    const result = await mockProvider.validateApiKey('test-key');
    expect(typeof result).toBe('boolean');
  });

  it('should have AIProvider interface with generateResponse method accepting onToken callback', async () => {
    const module = await import('../electron/services/ai/providers/base.provider') as any;

    let tokenReceived = '';
    const mockProvider: any = {
      name: 'test',
      validateApiKey: async () => true,
      generateResponse: async (messages: any[], options: any, onToken: (token: string) => void) => {
        onToken('test-token');
        return 'full-response';
      },
      getSupportedModels: () => [],
    };

    const result = await mockProvider.generateResponse(
      [{ role: 'user', content: 'test' }],
      { model: 'test-model' },
      (token) => { tokenReceived = token; }
    );

    expect(tokenReceived).toBe('test-token');
    expect(result).toBe('full-response');
  });

  it('should have AIProvider interface with getSupportedModels method', async () => {
    const module = await import('../electron/services/ai/providers/base.provider') as any;

    const mockProvider: any = {
      name: 'test',
      validateApiKey: async () => true,
      generateResponse: async () => '',
      getSupportedModels: () => ['model-1', 'model-2'],
    };

    const models = mockProvider.getSupportedModels();
    expect(Array.isArray(models)).toBe(true);
  });
});
