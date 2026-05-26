/**
 * TypeScript interfaces for graph data structures
 * Used by 3D visualization component
 */

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'manual' | 'semantic';
  similarity?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
