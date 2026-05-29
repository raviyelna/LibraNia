/**
 * TypeScript interfaces for graph data structures
 * Used by 3D visualization component
 */

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'manual' | 'semantic' | 'citation';
  similarity?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
