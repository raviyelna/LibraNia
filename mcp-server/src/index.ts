#!/usr/bin/env node

/**
 * LibraNia MCP Server
 *
 * Exposes LibraNia knowledge base to Claude Desktop, Codex, and other MCP clients.
 *
 * Workflow:
 * 1. Check library (search_notes)
 * 2. If insufficient → web_search
 * 3. Create note with findings
 * 4. Link to related notes using [[Note Title]] syntax
 * 5. Return answer with sources
 *
 * Backlinks:
 * - LibraNia automatically creates bidirectional links from [[Note Title]] syntax
 * - When creating notes, link to related existing notes using [[Title]]
 * - Search for related notes first, then link in new note body
 * - Example: "See also [[Docker Compose]] and [[Container Security]]"
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((candidate) => path.resolve(candidate)))];
}

// Database path - match backend priority first, then fall back to common MCP launch directories.
function getDatabaseCandidates(): string[] {
  if (process.env.LIBRANIA_DB_PATH) {
    return [process.env.LIBRANIA_DB_PATH];
  }
  if (process.env.LIBRANIA_DATA_DIR) {
    return [path.join(process.env.LIBRANIA_DATA_DIR, 'librania.db')];
  }

  return uniquePaths([
    path.join(process.cwd(), 'data', 'librania.db'),
    path.join(process.cwd(), '..', 'data', 'librania.db'),
    path.join(SERVER_DIR, '..', 'data', 'librania.db'),
    path.join(SERVER_DIR, '..', '..', 'data', 'librania.db'),
  ]);
}

const DB_CANDIDATES = getDatabaseCandidates();
const DB_PATH = DB_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || DB_CANDIDATES[0];
const NOTES_DIR = path.join(path.dirname(DB_PATH), 'notes');

interface Note {
  id: string;
  title: string;
  body: string;
  metadata?: string | null;
  created_at: number | string;
  updated_at: number | string;
  deleted_at: number | string | null;
}

interface Tag {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  title: string;
  body: string;
  snippet: string;
  tags: string[];
  group: string | null;
  relevance: number;
}

const SEARCH_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'when',
  'where',
  'why',
  'with',
  'work',
  'works',
]);

function tokenizeSearchQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !SEARCH_STOPWORDS.has(token));

  return [...new Set(tokens)];
}

function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function timestampToIso(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return new Date().toISOString();
  }

  if (typeof value === 'number') {
    const millis = value > 100000000000 ? value : value * 1000;
    return new Date(millis).toISOString();
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const millis = numeric > 100000000000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }

  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

function createSnippet(body: string, title: string, phrase: string, tokens: string[]): string {
  const haystacks = [phrase.toLowerCase(), ...tokens];
  const bodyLower = body.toLowerCase();
  const titleLower = title.toLowerCase();
  const match = haystacks.find((term) => term && bodyLower.includes(term)) ||
    haystacks.find((term) => term && titleLower.includes(term));

  if (!match || !bodyLower.includes(match)) {
    return body.substring(0, 240) + (body.length > 240 ? '...' : '');
  }

  const index = bodyLower.indexOf(match);
  const start = Math.max(0, index - 120);
  const end = Math.min(body.length, index + 280);
  return `${start > 0 ? '...' : ''}${body.substring(start, end)}${end < body.length ? '...' : ''}`;
}

function getNoteGroupFromMetadata(metadata: string | null | undefined): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed.noteGroup === 'string' && parsed.noteGroup.trim()
      ? parsed.noteGroup.trim()
      : null;
  } catch {
    return null;
  }
}

class LibraniaMCPServer {
  private server: Server;
  private db: Database.Database | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'librania-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: `LibraNia Knowledge Base Integration

Mandatory research protocol:

1. **Search LibraNia first**: Before any web search or external research, call search_notes for the user's topic and adjacent terms.
2. **Read relevant notes**: If search_notes returns useful results, call get_note on the relevant note IDs before answering or researching externally.
3. **Evaluate sufficiency**: If existing LibraNia notes answer the request, use them as the primary source and do not browse just to appear thorough.
4. **Web search fallback**: Use web search only when the library is missing, incomplete, stale, or the user asks for current/latest information.
5. **Write back before using web findings**: If web search is used and produces useful durable knowledge, save that knowledge to LibraNia with create_note or update_note before presenting it as the answer.
6. **Connect the graph**: New or updated Markdown notes should include [[Exact Note Title]] links to related notes found with search_notes/get_note.
7. **Tag saved knowledge**: Add concise lowercase tags with add_tags.
8. **Report library actions**: In the final answer, mention which notes were used, created, or updated.

Do not finish a research answer based on web findings without first saving useful durable findings back to LibraNia, unless the user explicitly says not to save anything.

Example workflow:
- Query: "Docker security best practices"
- search_notes("Docker security") → found 2 notes
- Evaluate: partial info, need more on container isolation
- web_search("Docker container isolation security")
- create_note with findings, link to existing [[Docker Basics]] note before using those findings in the answer
- Return answer citing both LibraNia notes and web sources

This ensures knowledge accumulates in LibraNia over time.`,
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private connectDB(): Database.Database {
    if (!this.db) {
      if (!fs.existsSync(DB_PATH)) {
        throw new Error(`LibraNia database not found. Tried: ${DB_CANDIDATES.join(', ')}`);
      }
      this.db = new Database(DB_PATH, { readonly: false });
    }
    return this.db;
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      if (this.db) {
        this.db.close();
      }
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_notes',
            description: 'Search LibraNia knowledge base for relevant notes. Mandatory first step before web search or external research. Returns matching notes with snippets and tags. Use before creating new notes to find related content for linking.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (searches title and body)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results to return (default: 10)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_note',
            description: 'Get full content of a specific note by ID. Use after search_notes when a result is relevant so answers and new notes can build on existing library knowledge.',
            inputSchema: {
              type: 'object',
              properties: {
                noteId: {
                  type: 'string',
                  description: 'Note ID',
                },
              },
              required: ['noteId'],
            },
          },
          {
            name: 'create_note',
            description: 'Create a new note in LibraNia. Required after web research when useful durable knowledge was found, before using those web findings in the final answer. Link related notes using [[Note Title]] syntax in body to create bidirectional backlinks. Search for related notes first, then reference them.',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Note title',
                },
                body: {
                  type: 'string',
                  description: 'Note content in Markdown. Use [[Note Title]] to link to other notes (creates automatic backlinks).',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization',
                },
              },
              required: ['title', 'body'],
            },
          },
          {
            name: 'update_note',
            description: 'Update existing note content or add information. Prefer this over create_note when web research improves, corrects, or extends an existing note.',
            inputSchema: {
              type: 'object',
              properties: {
                noteId: {
                  type: 'string',
                  description: 'Note ID to update',
                },
                title: {
                  type: 'string',
                  description: 'New title (optional)',
                },
                body: {
                  type: 'string',
                  description: 'New body content (optional)',
                },
                appendBody: {
                  type: 'string',
                  description: 'Content to append to existing body (optional)',
                },
              },
              required: ['noteId'],
            },
          },
          {
            name: 'add_tags',
            description: 'Add tags to a note after creating or updating durable research knowledge.',
            inputSchema: {
              type: 'object',
              properties: {
                noteId: {
                  type: 'string',
                  description: 'Note ID',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tag names to add',
                },
              },
              required: ['noteId', 'tags'],
            },
          },
          {
            name: 'list_tags',
            description: 'List all tags in the knowledge base',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args) {
          throw new Error('Missing arguments');
        }

        switch (name) {
          case 'search_notes':
            return await this.searchNotes(args.query as string, (args.limit as number) || 10);

          case 'get_note':
            return await this.getNote(args.noteId as string);

          case 'create_note':
            return await this.createNote(
              args.title as string,
              args.body as string,
              (args.tags as string[]) || []
            );

          case 'update_note':
            return await this.updateNote(
              args.noteId as string,
              args.title as string | undefined,
              args.body as string | undefined,
              args.appendBody as string | undefined
            );

          case 'add_tags':
            return await this.addTags(args.noteId as string, args.tags as string[]);

          case 'list_tags':
            return await this.listTags();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private async searchNotes(query: string, limit: number): Promise<any> {
    const db = this.connectDB();
    const lowerQuery = query.toLowerCase().trim();
    const tokens = tokenizeSearchQuery(query);

    if (!lowerQuery || tokens.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ query, count: 0, results: [] }, null, 2),
          },
        ],
      };
    }

    const notes = db
      .prepare(
        `SELECT id, title, body, metadata, created_at, updated_at
         FROM notes
         WHERE deleted_at IS NULL
         ORDER BY updated_at DESC`
      )
      .all() as Note[];

    const tagRows = db
      .prepare(
        `SELECT nt.note_id, t.name
         FROM note_tags nt
         JOIN tags t ON t.id = nt.tag_id`
      )
      .all() as Array<{ note_id: string; name: string }>;

    const tagsByNote = new Map<string, string[]>();
    for (const row of tagRows) {
      const noteTags = tagsByNote.get(row.note_id) || [];
      noteTags.push(row.name);
      tagsByNote.set(row.note_id, noteTags);
    }

    const results: SearchResult[] = notes
      .map((note) => {
        const tags = tagsByNote.get(note.id) || [];
        const titleLower = note.title.toLowerCase();
        const bodyLower = note.body.toLowerCase();
        const tagsLower = tags.join(' ').toLowerCase();
        const group = getNoteGroupFromMetadata(note.metadata);
        const groupLower = (group || '').toLowerCase();

        let relevance = 0;
        if (titleLower.includes(lowerQuery)) relevance += 80;
        if (bodyLower.includes(lowerQuery)) relevance += 35;
        if (tagsLower.includes(lowerQuery)) relevance += 25;
        if (groupLower.includes(lowerQuery)) relevance += 30;

        for (const token of tokens) {
          if (titleLower.includes(token)) relevance += 20;
          if (bodyLower.includes(token)) relevance += 6;
          if (tagsLower.includes(token)) relevance += 10;
          if (groupLower.includes(token)) relevance += 12;
        }

        // Prefer notes that match multiple query concepts over one repeated term.
        const matchedTokenCount = tokens.filter((token) =>
          titleLower.includes(token) || bodyLower.includes(token) || tagsLower.includes(token) || groupLower.includes(token)
        ).length;
        relevance += matchedTokenCount * 5;

        return {
          id: note.id,
          title: note.title,
          body: note.body,
          snippet: createSnippet(note.body, note.title, lowerQuery, tokens),
          tags,
          group,
          relevance,
        };
      })
      .filter((result) => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    if (results.length < limit) {
      try {
        const ftsQuery = tokens.map((token) => `${token}*`).join(' OR ');
        const existingIds = new Set(results.map((result) => result.id));
        const ftsResults = db
          .prepare(
            `SELECT n.id, n.title, n.body, n.metadata, n.created_at, n.updated_at, notes_fts.rank
             FROM notes_fts
             JOIN notes n ON notes_fts.rowid = n.rowid
             WHERE notes_fts MATCH ?
               AND n.deleted_at IS NULL
             ORDER BY notes_fts.rank
             LIMIT ?`
          )
          .all(ftsQuery, limit) as Array<Note & { rank: number }>;

        for (const note of ftsResults) {
          if (existingIds.has(note.id) || results.length >= limit) continue;
          const tags = tagsByNote.get(note.id) || [];
          results.push({
            id: note.id,
            title: note.title,
            body: note.body,
            snippet: createSnippet(note.body, note.title, lowerQuery, tokens),
            tags,
            group: getNoteGroupFromMetadata(note.metadata),
            relevance: Math.max(1, 10 - Math.abs(note.rank || 0)),
          });
          existingIds.add(note.id);
        }
      } catch {
        // FTS tables may be unavailable in older databases; token scoring above is the primary path.
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              count: results.length,
              results: results.map((r) => ({
                id: r.id,
                title: r.title,
                snippet: r.snippet,
                tags: r.tags,
                group: r.group,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getNote(noteId: string): Promise<any> {
    const db = this.connectDB();

    const note = db
      .prepare(
        `SELECT id, title, body, metadata, created_at, updated_at
         FROM notes
         WHERE id = ? AND deleted_at IS NULL`
      )
      .get(noteId) as Note | undefined;

    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    const tags = db
      .prepare(
        `SELECT t.name
         FROM tags t
         JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?`
      )
      .all(noteId)
      .map((row: any) => row.name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              id: note.id,
              title: note.title,
              body: note.body,
              tags,
              group: getNoteGroupFromMetadata(note.metadata),
              created_at: timestampToIso(note.created_at),
              updated_at: timestampToIso(note.updated_at),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async createNote(title: string, body: string, tagNames: string[]): Promise<any> {
    const db = this.connectDB();
    const noteId = this.generateId();
    const now = nowUnixSeconds();
    const nowIso = timestampToIso(now);

    // Insert note
    db.prepare(
      `INSERT INTO notes (id, title, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(noteId, title, body, now, now);

    // Write markdown file with frontmatter
    fs.mkdirSync(NOTES_DIR, { recursive: true });
    const notePath = path.join(NOTES_DIR, `${noteId}.md`);
    const frontmatter = `---
title: ${title}
created_at: ${nowIso}
updated_at: ${nowIso}
tags: ${JSON.stringify(tagNames)}
---

${body}`;
    fs.writeFileSync(notePath, frontmatter, 'utf-8');

    // Add tags
    if (tagNames.length > 0) {
      await this.addTags(noteId, tagNames);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              noteId,
              title,
              message: 'Note created successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async updateNote(
    noteId: string,
    title?: string,
    body?: string,
    appendBody?: string
  ): Promise<any> {
    const db = this.connectDB();

    // Get existing note
    const note = db
      .prepare('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL')
      .get(noteId) as Note | undefined;

    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    const now = nowUnixSeconds();
    const nowIso = timestampToIso(now);
    const newTitle = title || note.title;
    let newBody = body || note.body;

    if (appendBody) {
      newBody = note.body + '\n\n' + appendBody;
    }

    // Update DB
    db.prepare(
      `UPDATE notes
       SET title = ?, body = ?, updated_at = ?
       WHERE id = ?`
    ).run(newTitle, newBody, now, noteId);

    // Update markdown file with frontmatter
    fs.mkdirSync(NOTES_DIR, { recursive: true });
    const notePath = path.join(NOTES_DIR, `${noteId}.md`);

    // Get tags for frontmatter
    const tags = db
      .prepare(
        `SELECT t.name
         FROM tags t
         JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?`
      )
      .all(noteId)
      .map((row: any) => row.name);

    const frontmatter = `---
title: ${newTitle}
created_at: ${timestampToIso(note.created_at)}
updated_at: ${nowIso}
tags: ${JSON.stringify(tags)}
---

${newBody}`;
    fs.writeFileSync(notePath, frontmatter, 'utf-8');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              noteId,
              title: newTitle,
              message: 'Note updated successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async addTags(noteId: string, tagNames: string[]): Promise<any> {
    const db = this.connectDB();

    for (const tagName of tagNames) {
      // Get or create tag
      let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as
        | { id: string }
        | undefined;

      if (!tag) {
        const tagId = this.generateId();
        const now = nowUnixSeconds();
        db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)').run(
          tagId,
          tagName,
          now
        );
        tag = { id: tagId };
      }

      // Link tag to note (ignore if exists)
      try {
        db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(
          noteId,
          tag.id
        );
      } catch (error: any) {
        // Ignore duplicate key errors
        if (!error.message.includes('UNIQUE constraint')) {
          throw error;
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              noteId,
              tags: tagNames,
              message: 'Tags added successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async listTags(): Promise<any> {
    const db = this.connectDB();

    const tags = db
      .prepare(
        `SELECT t.id, t.name, COUNT(nt.note_id) as count
         FROM tags t
         LEFT JOIN note_tags nt ON t.id = nt.tag_id
         GROUP BY t.id, t.name
         ORDER BY count DESC, t.name ASC`
      )
      .all();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tags }, null, 2),
        },
      ],
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LibraNia MCP server running on stdio');
  }
}

// Start server
const server = new LibraniaMCPServer();
server.run().catch(console.error);
