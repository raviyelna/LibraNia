import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
let notesDir = null;
export function initFileStorage(baseDir) {
    notesDir = path.join(baseDir, 'notes');
    if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir, { recursive: true });
    }
    console.log('[FileStorage] Initialized at:', notesDir);
}
function getNotesDir() {
    if (!notesDir) {
        throw new Error('File storage not initialized');
    }
    return notesDir;
}
function getNoteFilePath(id) {
    return path.join(getNotesDir(), `${id}.md`);
}
function parseNoteFile(id, filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const now = new Date();
    const parseDate = (value) => {
        if (!value)
            return now;
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
function writeNoteFile(note) {
    const filePath = getNoteFilePath(note.id);
    const toISOStringOrNull = (date) => {
        if (!date)
            return null;
        try {
            return date.toISOString();
        }
        catch {
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
export function createNote(data) {
    const now = new Date();
    const id = crypto.randomUUID();
    const note = {
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
export function updateNote(id, data) {
    const filePath = getNoteFilePath(id);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Note ${id} not found`);
    }
    const existing = parseNoteFile(id, filePath);
    if (existing.deleted_at) {
        throw new Error(`Note ${id} is deleted`);
    }
    const updated = {
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
export function getNoteById(id, includeDeleted = false) {
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
export function getAllNotes() {
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
export function deleteNote(id) {
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
export function restoreNote(id) {
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
export async function syncFilesystemToDb() {
    const Database = require('better-sqlite3');
    const os = require('os');
    const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'librania.db');
    const db = new Database(dbPath);
    const dir = getNotesDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const fileIds = new Set(files.map(f => path.basename(f, '.md')));
    const dbNoteIds = new Set(db.prepare('SELECT id FROM notes').all().map((row) => row.id));
    let synced = 0;
    let deleted = 0;
    let skipped = 0;
    for (const file of files) {
        const noteId = path.basename(file, '.md');
        if (dbNoteIds.has(noteId)) {
            skipped++;
            continue;
        }
        try {
            const filePath = path.join(dir, file);
            const note = parseNoteFile(noteId, filePath);
            db.prepare(`
        INSERT INTO notes (id, title, body, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(noteId, note.title, note.body, note.created_at.toISOString(), note.updated_at.toISOString(), note.deleted_at ? note.deleted_at.toISOString() : null);
            console.log('[Sync] Added to DB:', note.title);
            synced++;
        }
        catch (error) {
            console.error('[Sync] Error syncing', noteId, error);
        }
    }
    for (const noteId of dbNoteIds) {
        if (!fileIds.has(noteId)) {
            db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
            console.log('[Sync] Removed from DB:', noteId);
            deleted++;
        }
    }
    db.close();
    console.log('[Sync] Complete:', { synced, deleted, skipped });
    return { synced, deleted, skipped };
}
export function getAllTags() {
    const notes = getAllNotes();
    const tagSet = new Set();
    notes.forEach(note => {
        note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
}
export function getNoteTags(noteId) {
    const note = getNoteById(noteId);
    return note ? note.tags : [];
}
export function addTagsToNote(noteId, tags) {
    const note = getNoteById(noteId);
    if (!note) {
        throw new Error(`Note ${noteId} not found`);
    }
    const updatedTags = Array.from(new Set([...note.tags, ...tags]));
    return updateNote(noteId, { tags: updatedTags });
}
export function removeTagsFromNote(noteId, tags) {
    const note = getNoteById(noteId);
    if (!note) {
        throw new Error(`Note ${noteId} not found`);
    }
    const tagsToRemove = new Set(tags);
    const updatedTags = note.tags.filter(tag => !tagsToRemove.has(tag));
    return updateNote(noteId, { tags: updatedTags });
}
