import { getAllNotes } from './file-storage.service';
import type { GraphData, GraphNode, GraphLink } from '../../src/types/graph';

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
 * Get graph data for 3D visualization from file storage
 * Builds graph by parsing wiki-links in note bodies
 * @returns GraphData with nodes (id, title, tags) and links (source, target, type)
 */
export function getGraphData(): GraphData {
  const notes = getAllNotes();

  // Create title-to-id map for link resolution
  const titleToId = new Map<string, string>();
  notes.forEach(note => {
    titleToId.set(note.title.toLowerCase(), note.id);
  });

  // Build nodes array
  const graphNodes: GraphNode[] = notes.map(note => ({
    id: note.id,
    title: note.title,
    tags: note.tags,
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
    nodes: graphNodes,
    links: graphLinks,
  };
}
