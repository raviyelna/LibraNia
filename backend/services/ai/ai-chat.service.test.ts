import { afterEach, describe, expect, it, vi } from 'vitest';
import { callDeepSeek } from './ai-chat.service';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe('callDeepSeek', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the configured OpenAI-compatible base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'Configured endpoint response' } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await callDeepSeek(
      [{ role: 'user', content: 'Hello' }],
      'test-key',
      'custom-model',
      'https://gateway.example.com/v1'
    );

    expect(response).toBe('Configured endpoint response');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gateway.example.com/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('rejects a completion that contains no final answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: null,
          reasoning_content: 'Internal reasoning without a final answer',
        },
      }],
    })));

    await expect(callDeepSeek(
      [{ role: 'user', content: 'Hello' }],
      'test-key',
      'custom-model'
    )).rejects.toThrow(
      'DeepSeek API returned an empty final answer (finish_reason: stop). The model returned reasoning but no final content.'
    );
  });
});
