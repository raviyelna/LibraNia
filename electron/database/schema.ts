import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Notes table - stores user's knowledge notes
 */
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: text('metadata'), // JSON blob for extensibility
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }), // Soft delete
});

/**
 * Tags table - stores unique tags
 */
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Note-Tags junction table - many-to-many relationship
 */
export const noteTags = sqliteTable('note_tags', {
  note_id: text('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: { columns: [table.note_id, table.tag_id] },
}));

/**
 * Links table - stores bidirectional links between notes
 */
export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  source_note_id: text('source_note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  target_note_id: text('target_note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'set null' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Note versions table - stores edit history for notes
 */
export const noteVersions = sqliteTable('note_versions', {
  id: text('id').primaryKey(),
  note_id: text('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  metadata: text('metadata'),
  version_number: integer('version_number').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Conversations table - stores AI chat conversations
 */
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Messages table - stores individual messages in conversations
 */
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  provider_id: text('provider_id'),
  model: text('model'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Citations table - stores source citations for AI responses
 */
export const citations = sqliteTable('citations', {
  id: text('id').primaryKey(),
  message_id: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  snippet: text('snippet'),
  position: integer('position').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
