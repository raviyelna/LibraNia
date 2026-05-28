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
 * 4. Return answer with sources
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
import * as os from 'os';
import * as fs from 'fs';

// Database path
const DB_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'librania.db');
const NOTES_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'notes');

interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  relevance: number;
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
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private connectDB(): Database.Database {
    if (!this.db) {
      if (!fs.existsSync(DB_PATH)) {
        throw new Error(`LibraNia database not found at ${DB_PATH}`);
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
            description: 'Search LibraNia knowledge base for relevant notes. Returns matching notes with snippets and tags.',
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
            description: 'Get full content of a specific note by ID',
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
            description: 'Create a new note in LibraNia. Use after web search to save findings.',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Note title',
                },
                body: {
                  type: 'string',
                  description: 'Note content in Markdown',
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
            description: 'Update existing note content or add information',
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
            description: 'Add tags to a note',
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
    const lowerQuery = query.toLowerCase();

    // Search in notes
    const notes = db
      .prepare(
        `SELECT id, title, body, created_at, updated_at
         FROM notes
         WHERE deleted_at IS NULL
         AND (LOWER(title) LIKE ? OR LOWER(body) LIKE ?)
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(`%${lowerQuery}%`, `%${lowerQuery}%`, limit) as Note[];

    // Get tags for each note
    const results: SearchResult[] = notes.map((note) => {
      const tags = db
        .prepare(
          `SELECT t.name
           FROM tags t
           JOIN note_tags nt ON t.id = nt.tag_id
           WHERE nt.note_id = ?`
        )
        .all(note.id)
        .map((row: any) => row.name);

      // Create snippet
      const bodyLower = note.body.toLowerCase();
      const queryIndex = bodyLower.indexOf(lowerQuery);
      let snippet = '';
      if (queryIndex !== -1) {
        const start = Math.max(0, queryIndex - 100);
        const end = Math.min(note.body.length, queryIndex + 200);
        snippet = '...' + note.body.substring(start, end) + '...';
      } else {
        snippet = note.body.substring(0, 200) + '...';
      }

      return {
        id: note.id,
        title: note.title,
        body: note.body,
        snippet,
        tags,
        relevance: 1.0,
      };
    });

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
        `SELECT id, title, body, created_at, updated_at
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
              created_at: note.created_at,
              updated_at: note.updated_at,
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
    const now = new Date().toISOString();

    // Insert note
    db.prepare(
      `INSERT INTO notes (id, title, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(noteId, title, body, now, now);

    // Write markdown file with frontmatter
    const notePath = path.join(NOTES_DIR, `${noteId}.md`);
    const frontmatter = `---
title: ${title}
created_at: ${now}
updated_at: ${now}
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

    const now = new Date().toISOString();
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
created_at: ${note.created_at}
updated_at: ${now}
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
        const now = new Date().toISOString();
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
