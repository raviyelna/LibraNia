import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, getDatabase, initDatabase } from '../database/connection';
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
        { url: 'https://images.example.com/diagram.png', alt: 'Diagram' },
        { url: 'https://images.example.com/screenshot.png', alt: 'Screenshot' },
      ],
      expect.any(String),
      expect.anything()
    );
  });

  it('stores AI-created note timestamps as Unix seconds', async () => {
    await initDatabase(':memory:');

    const created = await executeToolCall(
      'create_note',
      { title: 'Timestamp Units', body: 'Research notes' }
    );
    const note = getDatabase()
      .prepare('SELECT created_at, updated_at FROM notes WHERE id = ?')
      .get(created.id) as { created_at: number; updated_at: number };

    expect(note.created_at).toBeLessThan(100000000000);
    expect(note.updated_at).toBeLessThan(100000000000);
  });

  it('passes section-aware image hints to the importer', async () => {
    await initDatabase(':memory:');
    const images = [
      { url: 'https://images.example.com/runtime.png', section: 'Runtime', alt: 'Runtime diagram' },
    ];

    await executeToolCall(
      'create_note',
      { title: 'AgentCore', body: '## Runtime\n\nRuntime details.', images }
    );

    expect(mockImportRemoteImagesToNote).toHaveBeenCalledWith(
      images,
      expect.any(String),
      expect.anything()
    );
  });
});
