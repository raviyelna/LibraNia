import { afterEach, describe, expect, it, vi } from 'vitest';
import { callDeepSeek } from './ai-chat.service';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe('callDeepSeek', () => {
  const originalDataDir = process.env.LIBRANIA_DATA_DIR;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalDataDir === undefined) {
      delete process.env.LIBRANIA_DATA_DIR;
    } else {
      process.env.LIBRANIA_DATA_DIR = originalDataDir;
    }
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

  it('forces a final answer after three web searches', async () => {
    process.env.LIBRANIA_DATA_DIR = 'Z:\\missing-librania-test-data';
    const toolCall = (id: string, query: string) => ({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            id,
            function: {
              name: 'web_search',
              arguments: JSON.stringify({ query }),
            },
          }],
        },
      }],
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(toolCall('call-1', 'query one')))
      .mockResolvedValueOnce(jsonResponse(toolCall('call-2', 'query two')))
      .mockResolvedValueOnce(jsonResponse(toolCall('call-3', 'query three')))
      .mockResolvedValueOnce(jsonResponse({
        choices: [{ message: { content: 'Synthesized answer' } }],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await callDeepSeek(
      [{ role: 'user', content: 'Research this topic' }],
      'test-key',
      'custom-model',
      undefined,
      [{
        name: 'web_search',
        description: 'Search the web',
        input_schema: { type: 'object', properties: {}, required: [] },
      }]
    );

    expect(response).toBe('Synthesized answer');
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const finalRequest = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(finalRequest.tools).toBeUndefined();
    expect(finalRequest.messages.at(-1).content).toContain('Tool use is complete');
  });
});
