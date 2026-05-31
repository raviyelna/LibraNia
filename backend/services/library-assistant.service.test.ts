import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase, getDatabase, initDatabase } from '../database/connection';
import { buildLibraryAssistantContext } from './library-assistant.service';

describe('buildLibraryAssistantContext', () => {
  afterEach(() => closeDatabase());

  it('includes current note, tags, and bidirectional related notes', async () => {
    await initDatabase(':memory:');
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('current', 'Current Note', 'Reader context', now, now);
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('linked', 'Linked Note', '', now, now);
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('backlink', 'Backlink Note', '', now, now);
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('related', 'Related Note', '', now, now);
    db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)').run('tag', 'research', now);
    db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)').run('current', 'tag');
    db.prepare('INSERT INTO links (id, source_note_id, target_note_id, link_type, created_at) VALUES (?, ?, ?, ?, ?)').run('manual-out', 'current', 'linked', 'manual', now);
    db.prepare('INSERT INTO links (id, source_note_id, target_note_id, link_type, created_at) VALUES (?, ?, ?, ?, ?)').run('manual-in', 'backlink', 'current', 'manual', now);
    db.prepare('INSERT INTO links (id, source_note_id, target_note_id, link_type, similarity_score, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('semantic', 'current', 'related', 'semantic', 0.9, now);

    const context = await buildLibraryAssistantContext('current');

    expect(context).toContain('Title: Current Note');
    expect(context).toContain('Tags: research');
    expect(context).toContain('Linked Note');
    expect(context).toContain('Backlink Note');
    expect(context).toContain('Related Note (semantic, 90% similar)');
    expect(context).toContain('Do not call create_note or add_tags');
  });

  it('includes live wiki-links and identifies linked notes that have not been created yet', async () => {
    await initDatabase(':memory:');
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      'current',
      'Current Note',
      'See [[Linked Note]] and [[Missing Note]].',
      now,
      now
    );
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      'linked',
      'Linked Note',
      '',
      now,
      now
    );
    db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      'incoming',
      'Incoming Note',
      'Points to [[Current Note]].',
      now,
      now
    );

    const context = await buildLibraryAssistantContext('current');

    expect(context).toContain('Linked Note (linked)');
    expect(context).toContain('Incoming Note (linked)');
    expect(context).toContain('Missing Note (missing)');
  });
});
