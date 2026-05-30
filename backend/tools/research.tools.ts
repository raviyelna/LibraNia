/**
 * Tool definitions for AI research workflow
 */

import { getDatabase } from '../database/connection.js';
import { getORM } from '../database/connection.js';
import { updateNoteLinks } from '../services/links.service.js';
import { getBacklinks } from '../services/links.service.js';
import { getNoteTags, setNoteTags } from '../services/tags.service.js';
import { logger } from '../logger.js';
import { randomUUID } from 'crypto';
import { importRemoteImagesToNote } from '../services/remote-image.service.js';

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const RESEARCH_TOOLS: Tool[] = [
  {
    name: 'search_notes',
    description: 'Search existing notes by keyword. Searches both titles and body content.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant notes',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_note',
    description: 'Get full content of a specific note by ID',
    input_schema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'ID of the note to retrieve',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'get_backlinks',
    description: 'Get all notes that link to a specific note',
    input_schema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'ID of the note to get backlinks for',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'get_note_tags',
    description: 'Get tags associated with a note',
    input_schema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'ID of the note to get tags for',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for information. Use when existing notes lack sufficient information.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for web search',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_note',
    description: 'Create a new note with title and body content. Body supports Markdown formatting.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the note',
        },
        body: {
          type: 'string',
          description: 'Body content in Markdown format',
        },
        imageUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional public HTTP(S) image URLs from web research to import locally into the note. Use up to 3 relevant images.',
        },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'add_tags',
    description: 'Add tags to a note for categorization',
    input_schema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'ID of the note to add tags to',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tag names to add',
        },
      },
      required: ['noteId', 'tags'],
    },
  },
];

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(
  toolName: string,
  toolInput: any,
  webSearchFn?: (query: string) => Promise<any>
): Promise<any> {
  const db = getDatabase();

  switch (toolName) {
    case 'search_notes': {
      const query = toolInput.query.toLowerCase();
      const results = db.prepare(`
        SELECT id, title, body, created_at, updated_at
        FROM notes
        WHERE deleted_at IS NULL
          AND (title LIKE ? OR body LIKE ?)
        ORDER BY updated_at DESC
        LIMIT 10
      `).all(`%${query}%`, `%${query}%`);

      return results.map((note: any) => ({
        id: note.id,
        title: note.title,
        body: note.body.substring(0, 200) + '...',
      }));
    }

    case 'get_note': {
      const note = db.prepare(`
        SELECT id, title, body, created_at, updated_at
        FROM notes
        WHERE id = ? AND deleted_at IS NULL
      `).get(toolInput.noteId);

      if (!note) {
        throw new Error(`Note not found: ${toolInput.noteId}`);
      }
      return note;
    }

    case 'get_backlinks': {
      // TODO: Implement when links service is ready
      return [];
    }

    case 'get_note_tags': {
      const tags = await getNoteTags(toolInput.noteId);
      return tags.map(tag => ({ id: tag.id, name: tag.name }));
    }

    case 'web_search': {
      if (!webSearchFn) {
        throw new Error('Web search not configured');
      }
      return await webSearchFn(toolInput.query);
    }

    case 'create_note': {
      const noteId = randomUUID();
      const now = Date.now();

      // Extract keywords from title for better matching
      // Remove common words and use significant terms
      const stopWords = ['how', 'what', 'why', 'when', 'where', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'against', 'vs', 'versus'];
      const keywords = toolInput.title
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word))
        .slice(0, 3); // Top 3 keywords

      // Search for related notes using keywords
      const relatedNotesMap = new Map();
      for (const keyword of keywords) {
        const matches = db.prepare(`
          SELECT id, title
          FROM notes
          WHERE deleted_at IS NULL
            AND id != ?
            AND (title LIKE ? OR body LIKE ?)
          LIMIT 5
        `).all(noteId, `%${keyword}%`, `%${keyword}%`);

        matches.forEach((note: any) => {
          relatedNotesMap.set(note.id, note);
        });
      }

      const relatedNotes = Array.from(relatedNotesMap.values()).slice(0, 5);

      // Add wiki-links to related notes at end of body
      let bodyWithLinks = toolInput.body;
      if (relatedNotes.length > 0) {
        const linkSection = '\n\n## Related Notes\n' +
          relatedNotes.map((n: any) => `- [[${n.title}]]`).join('\n');
        bodyWithLinks += linkSection;
      }

      db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?)
      `).run(noteId, toolInput.title, bodyWithLinks, now, now);

      // Create link records from wiki-links
      const orm = getORM();
      await updateNoteLinks(noteId, bodyWithLinks, orm);
      const importedImages = Array.isArray(toolInput.imageUrls)
        ? await importRemoteImagesToNote(toolInput.imageUrls, noteId, orm)
        : [];

      logger.info(`Note created: ${noteId} - ${toolInput.title} with ${relatedNotes.length} auto-links and ${importedImages.length} images`);

      return {
        id: noteId,
        title: toolInput.title,
        body: importedImages.length > 0
          ? (db.prepare('SELECT body FROM notes WHERE id = ?').get(noteId) as { body: string }).body
          : bodyWithLinks,
        importedImages: importedImages.map(image => ({
          id: image.id,
          filePath: image.file_path,
          sourceUrl: JSON.parse(image.metadata || '{}').sourceUrl,
        })),
      };
    }

    case 'add_tags': {
      logger.info(`Adding tags to note ${toolInput.noteId}:`, toolInput.tags);
      await setNoteTags(toolInput.noteId, toolInput.tags);
      logger.info(`Tags added successfully to note ${toolInput.noteId}`);
      return { success: true };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
