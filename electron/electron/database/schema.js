import { sqliteTable, text, integer, blob, real } from 'drizzle-orm/sqlite-core';
export const notes = sqliteTable('notes', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    metadata: text('metadata'),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deleted_at: integer('deleted_at', { mode: 'timestamp' }),
});
export const tags = sqliteTable('tags', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
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
export const links = sqliteTable('links', {
    id: text('id').primaryKey(),
    source_note_id: text('source_note_id')
        .notNull()
        .references(() => notes.id, { onDelete: 'cascade' }),
    target_note_id: text('target_note_id')
        .notNull()
        .references(() => notes.id, { onDelete: 'set null' }),
    link_type: text('link_type').notNull().default('manual'),
    similarity_score: real('similarity_score'),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
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
export const conversations = sqliteTable('conversations', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
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
export const content = sqliteTable('content', {
    id: text('id').primaryKey(),
    file_path: text('file_path').notNull(),
    thumbnail_path: text('thumbnail_path'),
    mime_type: text('mime_type').notNull(),
    original_filename: text('original_filename').notNull(),
    file_size: integer('file_size').notNull(),
    extracted_text: text('extracted_text'),
    source: text('source').notNull(),
    confidence_score: integer('confidence_score', { mode: 'number' }),
    metadata: text('metadata'),
    note_id: text('note_id').references(() => notes.id, { onDelete: 'set null' }),
    message_id: text('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
export const contentTags = sqliteTable('content_tags', {
    content_id: text('content_id')
        .notNull()
        .references(() => content.id, { onDelete: 'cascade' }),
    tag_id: text('tag_id')
        .notNull()
        .references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: { columns: [table.content_id, table.tag_id] },
}));
export const embeddings = sqliteTable('embeddings', {
    id: text('id').primaryKey(),
    note_id: text('note_id')
        .notNull()
        .unique()
        .references(() => notes.id, { onDelete: 'cascade' }),
    vector: blob('vector', { mode: 'buffer' }).notNull(),
    model: text('model').notNull().default('all-MiniLM-L6-v2'),
    dimensions: integer('dimensions').notNull().default(384),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
