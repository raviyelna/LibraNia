import { describe, it, expect } from 'vitest';
import { notes, tags, noteTags, links, noteVersions } from '../electron/database/schema';

describe('Database Schema', () => {
  describe('notes table', () => {
    it('should export notes table', () => {
      expect(notes).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = notes;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('title');
      expect(columns).toHaveProperty('body');
      expect(columns).toHaveProperty('metadata');
      expect(columns).toHaveProperty('created_at');
      expect(columns).toHaveProperty('updated_at');
      expect(columns).toHaveProperty('deleted_at');
    });
  });

  describe('tags table', () => {
    it('should export tags table', () => {
      expect(tags).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = tags;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('created_at');
    });
  });

  describe('noteTags junction table', () => {
    it('should export noteTags table', () => {
      expect(noteTags).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = noteTags;
      expect(columns).toHaveProperty('note_id');
      expect(columns).toHaveProperty('tag_id');
    });
  });

  describe('links table', () => {
    it('should export links table', () => {
      expect(links).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = links;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('source_note_id');
      expect(columns).toHaveProperty('target_note_id');
      expect(columns).toHaveProperty('created_at');
    });
  });

  describe('noteVersions table', () => {
    it('should export noteVersions table', () => {
      expect(noteVersions).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = noteVersions;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('note_id');
      expect(columns).toHaveProperty('title');
      expect(columns).toHaveProperty('body');
      expect(columns).toHaveProperty('metadata');
      expect(columns).toHaveProperty('version_number');
      expect(columns).toHaveProperty('created_at');
    });
  });
});
