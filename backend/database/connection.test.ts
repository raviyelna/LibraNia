import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { closeDatabase, getDatabase, initDatabase } from './connection';

describe('initDatabase timestamp repair', () => {
  let dbPath = '';

  afterEach(() => {
    closeDatabase();
    if (dbPath) rmSync(dbPath, { force: true });
  });

  it('repairs legacy note timestamps stored as milliseconds', async () => {
    dbPath = join(tmpdir(), `librania-${randomUUID()}.db`);
    await initDatabase(dbPath);

    const seconds = Math.floor(Date.now() / 1000);
    getDatabase().prepare(`
      INSERT INTO notes (id, title, body, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('legacy-note', 'Legacy', '', seconds, seconds * 1000, seconds * 1000);

    closeDatabase();
    await initDatabase(dbPath);

    const note = getDatabase()
      .prepare('SELECT created_at, updated_at, deleted_at FROM notes WHERE id = ?')
      .get('legacy-note') as { created_at: number; updated_at: number; deleted_at: number };

    expect(note).toEqual({
      created_at: seconds,
      updated_at: seconds,
      deleted_at: seconds,
    });
  });
});
