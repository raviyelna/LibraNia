import { eq, isNull } from 'drizzle-orm';
import { notes, links, tags, noteTags } from '../database/schema';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';
import type { GraphData, GraphNode, GraphLink } from '../../src/types/graph';

/**
 * Get graph data for 3D visualization
 * Queries notes and links tables to build graph structure
 * @param db Drizzle ORM instance
 * @returns GraphData with nodes (id, title, tags) and links (source, target, type, similarity)
 */
export async function getGraphData(
  db: BetterSQLite3Database<typeof schema>
): Promise<GraphData> {
  // Query all non-deleted notes
  const allNotes = await db
    .select({
      id: notes.id,
      title: notes.title,
    })
    .from(notes)
    .where(isNull(notes.deleted_at));

  // Build nodes array with tags
  const graphNodes: GraphNode[] = [];

  for (const note of allNotes) {
    // Query tags for this note via note_tags junction
    const noteTags_result = await db
      .select({
        tagName: tags.name,
      })
      .from(noteTags)
      .innerJoin(tags, eq(noteTags.tag_id, tags.id))
      .where(eq(noteTags.note_id, note.id));

    graphNodes.push({
      id: note.id,
      title: note.title,
      tags: noteTags_result.map((row) => row.tagName),
    });
  }

  // Query all links where both source and target are non-deleted
  const allLinks = await db
    .select({
      source_note_id: links.source_note_id,
      target_note_id: links.target_note_id,
      link_type: links.link_type,
      similarity_score: links.similarity_score,
    })
    .from(links)
    .innerJoin(notes, eq(links.target_note_id, notes.id))
    .where(isNull(notes.deleted_at));

  // Build links array
  const graphLinks: GraphLink[] = allLinks.map((link) => {
    const graphLink: GraphLink = {
      source: link.source_note_id,
      target: link.target_note_id,
      type: link.link_type as 'manual' | 'semantic',
    };

    // Only include similarity for semantic links
    if (link.link_type === 'semantic' && link.similarity_score !== null) {
      graphLink.similarity = link.similarity_score;
    }

    return graphLink;
  });

  return {
    nodes: graphNodes,
    links: graphLinks,
  };
}
