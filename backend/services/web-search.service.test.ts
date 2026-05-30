import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchWeb } from './web-search.service';

describe('searchWeb', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests and returns Tavily image candidates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        images: [{ url: 'https://images.example.com/diagram.png', description: 'Architecture diagram' }],
        results: [{
          title: 'Example',
          url: 'https://example.com/article',
          content: 'Article summary',
          score: 0.9,
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchWeb('agent architecture', 'test-key');

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.include_images).toBe(true);
    expect(request.include_image_descriptions).toBe(true);
    expect(result.images).toEqual([
      { url: 'https://images.example.com/diagram.png', description: 'Architecture diagram' },
    ]);
  });
});
