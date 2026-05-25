import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { exportNotesToMarkdown, exportNotesToJSON } from '../electron/services/export.service';
import { createNote } from '../electron/services/notes.service';
import { addTagsToNote } from '../electron/services/tags.service';
import { initDatabase, getORM, closeDatabase } from '../electron/database/connection';
import matter from 'gray-matter';

describe('Export Service', () => {
  const testDbPath = path.join(__dirname, 'test-export.db');
  const testExportDir = path.join(__dirname, 'test-exports');

  beforeEach(async () => {
    // Clean up any existing database first
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(testDbPath + '-shm');
      await fs.unlink(testDbPath + '-wal');
    } catch (error) {
      // Ignore if files don't exist
    }

    // Initialize test database
    await initDatabase(testDbPath);

    // Create test export directory
    await fs.mkdir(testExportDir, { recursive: true });
  });

  afterEach(async () => {
    // Close database connection
    closeDatabase();

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(testDbPath + '-shm');
      await fs.unlink(testDbPath + '-wal');
    } catch (error) {
      // Ignore if files don't exist
    }

    // Clean up test export directory
    try {
      const files = await fs.readdir(testExportDir);
      for (const file of files) {
        await fs.unlink(path.join(testExportDir, file));
      }
      await fs.rmdir(testExportDir);
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  describe('Markdown Export', () => {
    it('should export single note to markdown file', async () => {
      const db = getORM();
      const note = await createNote({ title: 'Test Note', body: 'Test content' }, db);

      const count = await exportNotesToMarkdown([note.id], testExportDir, db);

      expect(count).toBe(1);
      const filePath = path.join(testExportDir, `${note.id}.md`);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should include YAML frontmatter with metadata', async () => {
      const db = getORM();
      const note = await createNote({ title: 'Test Note', body: 'Test content' }, db);
      await addTagsToNote(note.id, ['tag1', 'tag2']);

      await exportNotesToMarkdown([note.id], testExportDir, db);

      const filePath = path.join(testExportDir, `${note.id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.data.id).toBe(note.id);
      expect(parsed.data.title).toBe('Test Note');
      expect(parsed.data.tags).toEqual(['tag1', 'tag2']);
      expect(parsed.data.created).toBeDefined();
      expect(parsed.data.updated).toBeDefined();
    });

    it('should convert wiki-links to standard markdown links', async () => {
      const db = getORM();
      const targetNote = await createNote({ title: 'Target Note', body: 'Target content' }, db);
      const sourceNote = await createNote({
        title: 'Source Note',
        body: 'Link to [[Target Note]] here'
      }, db);

      await exportNotesToMarkdown([sourceNote.id], testExportDir, db);

      const filePath = path.join(testExportDir, `${sourceNote.id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.content).toContain(`[Target Note](${targetNote.id}.md)`);
      expect(parsed.content).not.toContain('[[Target Note]]');
    });

    it('should convert wiki-links with aliases', async () => {
      const db = getORM();
      const targetNote = await createNote({ title: 'Target Note', body: 'Target content' }, db);
      const sourceNote = await createNote({
        title: 'Source Note',
        body: 'Link to [[Target Note|custom alias]] here'
      }, db);

      await exportNotesToMarkdown([sourceNote.id], testExportDir, db);

      const filePath = path.join(testExportDir, `${sourceNote.id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.content).toContain(`[custom alias](${targetNote.id}.md)`);
      expect(parsed.content).not.toContain('[[Target Note|custom alias]]');
    });

    it('should preserve broken wiki-links as plain text', async () => {
      const db = getORM();
      const sourceNote = await createNote({
        title: 'Source Note',
        body: 'Link to [[Nonexistent Note]] here'
      }, db);

      await exportNotesToMarkdown([sourceNote.id], testExportDir, db);

      const filePath = path.join(testExportDir, `${sourceNote.id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.content).toContain('Nonexistent Note');
      expect(parsed.content).not.toContain('[[Nonexistent Note]]');
      expect(parsed.content).not.toContain('[Nonexistent Note]');
    });

    it('should export multiple notes', async () => {
      const db = getORM();
      const note1 = await createNote({ title: 'Note 1', body: 'Content 1' }, db);
      const note2 = await createNote({ title: 'Note 2', body: 'Content 2' }, db);

      const count = await exportNotesToMarkdown([note1.id, note2.id], testExportDir, db);

      expect(count).toBe(2);
      const file1Exists = await fs.access(path.join(testExportDir, `${note1.id}.md`)).then(() => true).catch(() => false);
      const file2Exists = await fs.access(path.join(testExportDir, `${note2.id}.md`)).then(() => true).catch(() => false);
      expect(file1Exists).toBe(true);
      expect(file2Exists).toBe(true);
    });
  });

  describe('JSON Export', () => {
    it('should export notes to JSON file', async () => {
      const db = getORM();
      const note = await createNote({ title: 'Test Note', body: 'Test content' }, db);

      const outputPath = path.join(testExportDir, 'export.json');
      const success = await exportNotesToJSON([note.id], outputPath, db);

      expect(success).toBe(true);
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should include all note fields in JSON', async () => {
      const db = getORM();
      const note = await createNote({ title: 'Test Note', body: 'Test content', metadata: '{"key":"value"}' }, db);

      const outputPath = path.join(testExportDir, 'export.json');
      await exportNotesToJSON([note.id], outputPath, db);

      const content = await fs.readFile(outputPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.notes).toHaveLength(1);
      expect(data.notes[0].id).toBe(note.id);
      expect(data.notes[0].title).toBe('Test Note');
      expect(data.notes[0].body).toBe('Test content');
      expect(data.notes[0].metadata).toEqual({ key: 'value' });
      expect(data.notes[0].created_at).toBeDefined();
      expect(data.notes[0].updated_at).toBeDefined();
    });

    it('should include tags array in JSON', async () => {
      const db = getORM();
      const note = await createNote({ title: 'Test Note', body: 'Test content' }, db);
      await addTagsToNote(note.id, ['tag1', 'tag2']);

      const outputPath = path.join(testExportDir, 'export.json');
      await exportNotesToJSON([note.id], outputPath, db);

      const content = await fs.readFile(outputPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.notes[0].tags).toEqual(['tag1', 'tag2']);
    });

    it('should include links and backlinks arrays in JSON', async () => {
      const db = getORM();
      const targetNote = await createNote({ title: 'Target Note', body: 'Target content' }, db);
      const sourceNote = await createNote({
        title: 'Source Note',
        body: 'Link to [[Target Note]] here'
      }, db);

      const outputPath = path.join(testExportDir, 'export.json');
      await exportNotesToJSON([sourceNote.id, targetNote.id], outputPath, db);

      const content = await fs.readFile(outputPath, 'utf-8');
      const data = JSON.parse(content);

      const sourceData = data.notes.find((n: any) => n.id === sourceNote.id);
      const targetData = data.notes.find((n: any) => n.id === targetNote.id);

      expect(sourceData.links).toContain(targetNote.id);
      expect(targetData.backlinks).toContain(sourceNote.id);
    });

    it('should export multiple notes to single JSON file', async () => {
      const db = getORM();
      const note1 = await createNote({ title: 'Note 1', body: 'Content 1' }, db);
      const note2 = await createNote({ title: 'Note 2', body: 'Content 2' }, db);

      const outputPath = path.join(testExportDir, 'export.json');
      await exportNotesToJSON([note1.id, note2.id], outputPath, db);

      const content = await fs.readFile(outputPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.notes).toHaveLength(2);
    });
  });
});
