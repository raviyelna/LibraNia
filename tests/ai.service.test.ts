import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock secure store before any imports
vi.mock('../electron/store/secure.store', () => ({
  getProviderConfig: vi.fn(),
}));

// Mock all provider classes
vi.mock('../electron/services/ai/providers/claude.provider', () => ({
  ClaudeProvider: class MockClaudeProvider {
    name = 'claude';
    async validateApiKey() { return true; }
    async generateResponse(messages: any[], options: any, onToken: any) {
      onToken('test');
      return 'response';
    }
    getSupportedModels() { return ['claude-3-5-sonnet-20241022']; }
  },
}));

vi.mock('../electron/services/ai/providers/openai.provider', () => ({
  OpenAIProvider: class MockOpenAIProvider {
    name = 'openai';
    async validateApiKey() { return true; }
    async generateResponse(messages: any[], options: any, onToken: any) {
      onToken('test');
      return 'response';
    }
    getSupportedModels() { return ['gpt-4']; }
  },
}));

vi.mock('../electron/services/ai/providers/deepseek.provider', () => ({
  DeepSeekProvider: class MockDeepSeekProvider {
    name = 'deepseek';
    async validateApiKey() { return true; }
    async generateResponse(messages: any[], options: any, onToken: any) {
      onToken('test');
      return 'response';
    }
    getSupportedModels() { return ['deepseek-chat']; }
  },
}));

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ClaudeProvider for "claude" providerId', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock provider config
    (getProviderConfig as any).mockReturnValue({
      id: 'claude',
      apiKey: 'test-key',
      model: 'claude-3-5-sonnet-20241022',
    });

    const service = getAIService();
    const provider = service.getProvider('claude');

    expect(provider.name).toBe('claude');
  });

  it('should return OpenAIProvider for "openai" providerId', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock provider config
    (getProviderConfig as any).mockReturnValue({
      id: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
    });

    const service = getAIService();
    const provider = service.getProvider('openai');

    expect(provider.name).toBe('openai');
  });

  it('should return DeepSeekProvider for "deepseek" providerId', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock provider config
    (getProviderConfig as any).mockReturnValue({
      id: 'deepseek',
      apiKey: 'test-key',
      model: 'deepseek-chat',
    });

    const service = getAIService();
    const provider = service.getProvider('deepseek');

    expect(provider.name).toBe('deepseek');
  });

  it('should throw error if provider not configured', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock no config found
    (getProviderConfig as any).mockReturnValue(undefined);

    const service = getAIService();

    expect(() => service.getProvider('claude')).toThrow();
  });

  it('should retry on transient errors with exponential backoff (1s, 2s, 4s per D-03)', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock provider config
    (getProviderConfig as any).mockReturnValue({
      id: 'claude',
      apiKey: 'test-key',
      model: 'claude-3-5-sonnet-20241022',
    });

    const service = getAIService();

    // Track retry attempts and delays
    let attempts = 0;
    const delays: number[] = [];
    let lastTime = Date.now();

    // Mock provider that fails twice then succeeds
    const mockProvider = {
      name: 'claude',
      async generateResponse(messages: any[], options: any, onToken: any) {
        attempts++;
        const now = Date.now();
        if (attempts > 1) {
          delays.push(now - lastTime);
        }
        lastTime = now;

        if (attempts < 3) {
          throw new Error('Transient error');
        }
        return 'success';
      },
    };

    // Override getProvider to return our mock
    service.getProvider = () => mockProvider as any;

    const result = await service.generateResponse(
      'claude',
      'claude-3-5-sonnet-20241022',
      [{ role: 'user', content: 'test' }],
      { onToken: () => {} }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
    // Verify exponential backoff delays (approximately 1s, 2s)
    expect(delays[0]).toBeGreaterThanOrEqual(900); // ~1s
    expect(delays[1]).toBeGreaterThanOrEqual(1900); // ~2s
  });

  it('should not retry on 401/403 authentication errors', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock provider config
    (getProviderConfig as any).mockReturnValue({
      id: 'claude',
      apiKey: 'invalid-key',
      model: 'claude-3-5-sonnet-20241022',
    });

    const service = getAIService();

    // Track retry attempts
    let attempts = 0;

    // Mock provider that always fails with 401
    const mockProvider = {
      name: 'claude',
      async generateResponse(messages: any[], options: any, onToken: any) {
        attempts++;
        const error: any = new Error('Unauthorized');
        error.status = 401;
        throw error;
      },
    };

    // Override getProvider to return our mock
    service.getProvider = () => mockProvider as any;

    await expect(
      service.generateResponse(
        'claude',
        'claude-3-5-sonnet-20241022',
        [{ role: 'user', content: 'test' }],
        { onToken: () => {} }
      )
    ).rejects.toThrow('Unauthorized');

    // Should only attempt once (no retries on auth errors)
    expect(attempts).toBe(1);
  });

  it('should pass onToken callback to provider', async () => {
    const { getProviderConfig } = await import('../electron/store/secure.store');

    // Re-import to get fresh instance (clear previous test's mock override)
    vi.resetModules();
    const { getAIService } = await import('../electron/services/ai/ai.service');

    // Mock provider config
    (getProviderConfig as any).mockReturnValue({
      id: 'claude',
      apiKey: 'test-key',
      model: 'claude-3-5-sonnet-20241022',
    });

    const service = getAIService();

    const tokens: string[] = [];

    await service.generateResponse(
      'claude',
      'claude-3-5-sonnet-20241022',
      [{ role: 'user', content: 'test' }],
      { onToken: (token) => tokens.push(token) }
    );

    expect(tokens.length).toBeGreaterThan(0);
  });
});
