import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

export interface Note {
  id: string;
  title: string;
  body: string;
  metadata: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateNoteInput {
  title: string;
  body: string;
  metadata?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  metadata?: string;
  tags?: string[];
}

let notesDir: string | null = null;

/**
 * Initialize file storage
 */
export function initFileStorage(baseDir: string): void {
  notesDir = path.join(baseDir, 'notes');

  // Create notes directory if not exists
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }

  console.log('[FileStorage] Initialized at:', notesDir);
}

/**
 * Get notes directory path
 */
function getNotesDir(): string {
  if (!notesDir) {
    throw new Error('File storage not initialized');
  }
  return notesDir;
}

/**
 * Get file path for note
 */
function getNoteFilePath(id: string): string {
  return path.join(getNotesDir(), `${id}.md`);
}

/**
 * Parse note from markdown file
 */
function parseNoteFile(id: string, filePath: string): Note {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  // Safe date parsing - handle missing/invalid dates
  const now = new Date();
  const parseDate = (value: any): Date => {
    if (!value) return now;
    const date = new Date(value);
    return isNaN(date.getTime()) ? now : date;
  };

  return {
    id,
    title: data.title || 'Untitled',
    body: body.trim(),
    metadata: data.metadata || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    created_at: parseDate(data.created_at),
    updated_at: parseDate(data.updated_at),
    deleted_at: data.deleted_at ? parseDate(data.deleted_at) : null,
  };
}

/**
 * Write note to markdown file
 */
function writeNoteFile(note: Note): void {
  const filePath = getNoteFilePath(note.id);

  // Safe date serialization
  const toISOStringOrNull = (date: Date | null): string | null => {
    if (!date) return null;
    try {
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const frontmatter = {
    title: note.title,
    metadata: note.metadata,
    tags: note.tags,
    created_at: toISOStringOrNull(note.created_at),
    updated_at: toISOStringOrNull(note.updated_at),
    deleted_at: toISOStringOrNull(note.deleted_at),
  };

  const content = matter.stringify(note.body, frontmatter);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Create new note
 */
export function createNote(data: CreateNoteInput): Note {
  const now = new Date();
  const id = crypto.randomUUID();

  const note: Note = {
    id,
    title: data.title,
    body: data.body,
    metadata: data.metadata || null,
    tags: data.tags || [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  writeNoteFile(note);
  console.log('[FileStorage] Created note:', id);

  return note;
}

/**
 * Update existing note
 */
export function updateNote(id: string, data: UpdateNoteInput): Note {
  const filePath = getNoteFilePath(id);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Note ${id} not found`);
  }

  const existing = parseNoteFile(id, filePath);

  if (existing.deleted_at) {
    throw new Error(`Note ${id} is deleted`);
  }

  const updated: Note = {
    ...existing,
    title: data.title ?? existing.title,
    body: data.body ?? existing.body,
    metadata: data.metadata ?? existing.metadata,
    tags: data.tags ?? existing.tags,
    updated_at: new Date(),
  };

  writeNoteFile(updated);
  console.log('[FileStorage] Updated note:', id);

  return updated;
}

/**
 * Get note by ID
 */
export function getNoteById(id: string, includeDeleted: boolean = false): Note | null {
  const filePath = getNoteFilePath(id);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const note = parseNoteFile(id, filePath);

  if (!includeDeleted && note.deleted_at) {
    return null;
  }

  return note;
}

/**
 * Get all notes
 */
export function getAllNotes(): Note[] {
  const dir = getNotesDir();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  const notes = files
    .map(file => {
      const id = path.basename(file, '.md');
      const filePath = path.join(dir, file);
      return parseNoteFile(id, filePath);
    })
    .filter(note => !note.deleted_at)
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

  return notes;
}

/**
 * Delete note (soft delete)
 */
export function deleteNote(id: string): boolean {
  const filePath = getNoteFilePath(id);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const note = parseNoteFile(id, filePath);
  note.deleted_at = new Date();

  writeNoteFile(note);
  console.log('[FileStorage] Deleted note:', id);

  return true;
}

/**
 * Restore deleted note
 */
export function restoreNote(id: string): Note {
  const filePath = getNoteFilePath(id);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Note ${id} not found`);
  }

  const note = parseNoteFile(id, filePath);
  note.deleted_at = null;

  writeNoteFile(note);
  console.log('[FileStorage] Restored note:', id);

  return note;
}

/**
 * Get all unique tags across all notes
 */
export function getAllTags(): string[] {
  const notes = getAllNotes();
  const tagSet = new Set<string>();

  notes.forEach(note => {
    note.tags.forEach(tag => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

/**
 * Get tags for specific note
 */
export function getNoteTags(noteId: string): string[] {
  const note = getNoteById(noteId);
  return note ? note.tags : [];
}

/**
 * Add tags to note
 */
export function addTagsToNote(noteId: string, tags: string[]): Note {
  const note = getNoteById(noteId);
  if (!note) {
    throw new Error(`Note ${noteId} not found`);
  }

  // Merge with existing tags, remove duplicates
  const updatedTags = Array.from(new Set([...note.tags, ...tags]));

  return updateNote(noteId, { tags: updatedTags });
}

/**
 * Remove tags from note
 */
export function removeTagsFromNote(noteId: string, tags: string[]): Note {
  const note = getNoteById(noteId);
  if (!note) {
    throw new Error(`Note ${noteId} not found`);
  }

  const tagsToRemove = new Set(tags);
  const updatedTags = note.tags.filter(tag => !tagsToRemove.has(tag));

  return updateNote(noteId, { tags: updatedTags });
}
