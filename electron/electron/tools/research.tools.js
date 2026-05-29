import { getAllNotes, getNoteById, createNote } from '../services/file-storage.service';
import { getNoteTags, setNoteTags } from '../services/tags.service';
import { logger } from '../logger';
export const RESEARCH_TOOLS = [
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
export async function executeToolCall(toolName, toolInput, webSearchFn) {
    switch (toolName) {
        case 'search_notes': {
            const notes = getAllNotes();
            const query = toolInput.query.toLowerCase();
            const results = notes
                .filter(note => !note.deleted_at)
                .filter(note => note.title.toLowerCase().includes(query) ||
                note.body.toLowerCase().includes(query))
                .map(note => ({
                id: note.id,
                title: note.title,
                body: note.body.substring(0, 200) + '...',
            }));
            return results;
        }
        case 'get_note': {
            const note = getNoteById(toolInput.noteId, false);
            if (!note) {
                throw new Error(`Note not found: ${toolInput.noteId}`);
            }
            return {
                id: note.id,
                title: note.title,
                body: note.body,
                created_at: note.created_at,
                updated_at: note.updated_at,
            };
        }
        case 'get_backlinks': {
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
            const note = createNote({
                title: toolInput.title,
                body: toolInput.body,
                tags: [],
            });
            return {
                id: note.id,
                title: note.title,
                body: note.body,
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
