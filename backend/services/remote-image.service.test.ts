import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, getDatabase, getORM, initDatabase } from '../database/connection';
import { importRemoteImagesToNote } from './remote-image.service';

describe('importRemoteImagesToNote', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    closeDatabase();
  });

  it('skips private-network URLs before downloading them', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const imported = await importRemoteImagesToNote(
      ['http://127.0.0.1/private.png'],
      'note-id',
      {} as any
    );

    expect(imported).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores a public image locally and appends its note reference', async () => {
    await initDatabase(':memory:');
    const db = getDatabase();
    const now = Date.now();
    db.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `).run('note-id', 'Image Note', 'Existing body', now, now);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'image/png',
        'content-length': String(png.length),
      }),
      arrayBuffer: async () => png,
    }));

    const [image] = await importRemoteImagesToNote(
      ['https://93.184.216.34/diagram.png'],
      'note-id',
      getORM()
    );

    expect(image.file_path).toMatch(/^content\/[0-9a-f-]+\.png$/);
    expect(db.prepare('SELECT body FROM notes WHERE id = ?').get('note-id')).toEqual({
      body: `Existing body\n\n![diagram.png](${image.file_path})\n`,
    });
    await import('fs/promises').then(fs => fs.unlink(image.file_path));
  });
});
