import { getAllNotes } from './notes.service.js';
import { getORM } from '../database/connection.js';
import type { GraphData, GraphNode, GraphLink } from '../../src/types/graph.js';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * Extract wiki-links from note body
 * Matches [[note-title]] pattern
 */
function extractWikiLinks(body: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = regex.exec(body)) !== null) {
    links.push(match[1].trim());
  }

  return links;
}

/**
 * Get graph data for 3D visualization from database
 * Builds graph by parsing wiki-links in note bodies
 * @returns GraphData with nodes (id, title, tags) and links (source, target, type)
 */
export async function getGraphData(): Promise<GraphData> {
  const db = getORM();
  const notes = await getAllNotes(db);

  // Create title-to-id map for link resolution
  const titleToId = new Map<string, string>();
  notes.forEach(note => {
    titleToId.set(note.title.toLowerCase(), note.id);
  });

  // Build nodes array - notes from DB don't have tags field yet
  const graphNodes: GraphNode[] = notes.map(note => ({
    id: note.id,
    title: note.title,
    tags: [], // TODO: add tags support to notes table
  }));

  // Extract links from note bodies
  const graphLinks: GraphLink[] = [];
  notes.forEach(note => {
    const wikiLinks = extractWikiLinks(note.body);

    wikiLinks.forEach(linkTitle => {
      const targetId = titleToId.get(linkTitle.toLowerCase());

      // Only create link if target note exists
      if (targetId) {
        graphLinks.push({
          source: note.id,
          target: targetId,
          type: 'manual',
        });
      }
    });
  });

  return {
    nodes: graphNodes || [],
    links: graphLinks || [],
  };
}

/**
 * Create a new graph node
 */
export async function createNode(
  data: { title: string; tags: string[] },
  db: BetterSQLite3Database
): Promise<GraphNode> {
  // For now, return mock data since we're using file-based storage
  // In future, this will integrate with database
  const id = `node-${Date.now()}`;
  return {
    id,
    title: data.title,
    tags: data.tags,
  };
}

/**
 * Update an existing graph node
 */
export async function updateNode(
  id: string,
  data: { title: string; tags: string[] },
  db: BetterSQLite3Database
): Promise<GraphNode> {
  // For now, return mock data since we're using file-based storage
  return {
    id,
    title: data.title,
    tags: data.tags,
  };
}

/**
 * Delete a graph node
 */
export async function deleteNode(
  id: string,
  db: BetterSQLite3Database
): Promise<boolean> {
  // For now, return success since we're using file-based storage
  return true;
}

/**
 * Create a new graph edge
 */
export async function createEdge(
  data: { source: string; target: string; type: string },
  db: BetterSQLite3Database
): Promise<GraphLink & { id: string }> {
  // For now, return mock data since we're using file-based storage
  const id = `edge-${Date.now()}`;
  return {
    id,
    source: data.source,
    target: data.target,
    type: data.type,
  };
}

/**
 * Delete a graph edge
 */
export async function deleteEdge(
  id: string,
  db: BetterSQLite3Database
): Promise<boolean> {
  // For now, return success since we're using file-based storage
  return true;
}
