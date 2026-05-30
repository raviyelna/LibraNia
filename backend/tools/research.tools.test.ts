import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, initDatabase } from '../database/connection';
import { executeToolCall, type ResearchToolContext } from './research.tools';

const { mockImportRemoteImagesToNote } = vi.hoisted(() => ({
  mockImportRemoteImagesToNote: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/remote-image.service', () => ({
  importRemoteImagesToNote: mockImportRemoteImagesToNote,
}));

describe('executeToolCall research image fallback', () => {
  afterEach(() => {
    vi.clearAllMocks();
    closeDatabase();
  });

  it('imports accumulated Tavily images when create_note omits imageUrls', async () => {
    await initDatabase(':memory:');
    const context: ResearchToolContext = { pendingImageUrls: [] };

    await executeToolCall(
      'web_search',
      { query: 'AI security' },
      async () => ({
        results: [],
        images: [
          { url: 'https://images.example.com/diagram.png', description: 'Diagram' },
          { url: 'https://images.example.com/screenshot.png', description: 'Screenshot' },
        ],
      }),
      context
    );
    await executeToolCall(
      'create_note',
      { title: 'AI Security', body: 'Research notes' },
      undefined,
      context
    );

    expect(mockImportRemoteImagesToNote).toHaveBeenCalledWith(
      [
        'https://images.example.com/diagram.png',
        'https://images.example.com/screenshot.png',
      ],
      expect.any(String),
      expect.anything()
    );
  });
});
