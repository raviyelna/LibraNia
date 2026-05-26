import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import * as d3 from 'd3-force-3d';
import { useGraph } from '../../hooks/useGraph';
import { GraphSidePanel } from './GraphSidePanel';
import { GraphControls } from './GraphControls';
import { GraphMinimap } from './GraphMinimap';

// Helper function to generate consistent color from tag name
function getColorForTag(tag: string | undefined): string {
  if (!tag) return '#888888'; // Default gray for untagged nodes

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function GraphView() {
  const location = useLocation();
  const { graphData, loading, error, refetch } = useGraph();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<any>>(new Set());
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string>>(new Set());
  const fgRef = useRef<any>();

  // Create shared geometry and material for instanced rendering (reused for all nodes)
  const { geometry, material } = useMemo(() => {
    // Low poly sphere for performance (8 segments per RESEARCH.md Pitfall 6)
    const geom = new THREE.SphereGeometry(5, 8, 8);
    // Simple material for performance
    const mat = new THREE.MeshLambertMaterial();
    return { geometry: geom, material: mat };
  }, []);

  // Configure force simulation per user decisions (D-01 through D-04)
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    // Per D-01, D-04: Moderate repulsion
    fg.d3Force('charge').strength(-40);

    // Per D-03: Short link distance
    fg.d3Force('link').distance(40).strength(1);

    // Per D-02: Strong center gravity
    fg.d3Force('center').strength(0.8);

    // Per D-04: Prevent overlap
    fg.d3Force('collision', d3.forceCollide(10));
  }, [fgRef.current]);

  // Handle node click with neighbor highlighting (D-14)
  const handleNodeClick = (node: any) => {
    setSelectedNoteId(node.id);

    // Find all neighbors of clicked node
    const neighbors = new Set<string>([node.id]); // Include clicked node
    const links = new Set<any>();

    graphData.links.forEach((link: any) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === node.id) {
        neighbors.add(targetId);
        links.add(link);
      }
      if (targetId === node.id) {
        neighbors.add(sourceId);
        links.add(link);
      }
    });

    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  };

  // Handle side panel close - clear highlighting
  const handlePanelClose = () => {
    setSelectedNoteId(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  };

  // Handle search results - highlight matching nodes
  const handleSearchResults = (nodeIds: string[]) => {
    setSearchMatchIds(new Set(nodeIds));
  };

  // Focus camera on first search result
  useEffect(() => {
    if (searchMatchIds.size > 0 && fgRef.current) {
      const firstId = Array.from(searchMatchIds)[0];
      const firstNode = graphData.nodes.find((n: any) => n.id === firstId);
      if (firstNode) {
        fgRef.current.cameraPosition(
          { x: firstNode.x, y: firstNode.y, z: (firstNode.z || 0) + 200 },
          firstNode,
          1000 // Animation duration
        );
      }
    }
  }, [searchMatchIds, graphData.nodes]);

  // Trigger re-render when search or highlight state changes
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.refresh();
    }
  }, [searchMatchIds, highlightNodes]);

  // Cleanup: pause animation on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fgRef.current) {
        fgRef.current.pauseAnimation();
      }
    };
  }, []);

  // Window resize handler - update ForceGraph3D dimensions
  useEffect(() => {
    const handleResize = () => {
      if (fgRef.current) {
        fgRef.current.width(window.innerWidth);
        fgRef.current.height(window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tab visibility handler - reload graph data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && fgRef.current) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  // Route change handler - reload graph data when navigating to /graph
  useEffect(() => {
    if (location.pathname === '/graph') {
      refetch();
    }
  }, [location.pathname, refetch]);

  // Handle minimap click - jump camera to location
  const handleMinimapClick = (x: number, y: number) => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x, y, z: 200 }, { x, y, z: 0 }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-secondary text-lg">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">
          <div className="text-lg font-semibold mb-2">Error loading graph</div>
          <div className="text-sm">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GraphControls onSearchResults={handleSearchResults} />
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="title"
        nodeAutoColorBy="tags"
        onNodeClick={handleNodeClick}
        enableNodeDrag={false}
        enableNavigationControls={true}
        linkDirectionalParticles={0}
        // Instanced rendering for performance (VIZ-02)
        nodeThreeObject={(node: any) => {
          // Create instanced mesh for this node (single draw call)
          const mesh = new THREE.InstancedMesh(geometry, material, 1);

          // Determine color based on search/highlight state (priority order)
          let color: string;
          if (searchMatchIds.size > 0 && searchMatchIds.has(node.id)) {
            // Priority 1: Search matches (yellow/gold)
            color = '#fbbf24';
          } else if (highlightNodes.size > 0) {
            // Priority 2: Neighbor highlighting (white/dimmed)
            color = highlightNodes.has(node.id) ? '#ffffff' : '#444444';
          } else {
            // Priority 3: Default tag-based colors (per D-07)
            color = getColorForTag(node.tags?.[0]);
          }

          mesh.setColorAt(0, new THREE.Color(color));
          mesh.instanceColor!.needsUpdate = true;

          return mesh;
        }}
        nodeThreeObjectExtend={false}
        // Node color with search and neighbor highlighting (priority order)
        nodeColor={(node: any) => {
          // Priority 1: Search matches (yellow/gold)
          if (searchMatchIds.size > 0 && searchMatchIds.has(node.id)) {
            return '#fbbf24';
          }
          // Priority 2: Neighbor highlighting (white/dimmed)
          if (highlightNodes.size > 0) {
            return highlightNodes.has(node.id) ? '#ffffff' : '#444444';
          }
          // Priority 3: Default tag-based colors
          return getColorForTag(node.tags?.[0]);
        }}
        // Link styling with highlighting (D-13, D-14)
        linkWidth={(link: any) => (highlightLinks.has(link) ? 2 : 1)}
        linkColor={(link: any) => (highlightLinks.has(link) ? '#ffffff' : '#444444')}
      />
      {selectedNoteId && (
        <GraphSidePanel
          noteId={selectedNoteId}
          onClose={handlePanelClose}
        />
      )}
      <GraphMinimap graphData={graphData} onLocationClick={handleMinimapClick} />
    </div>
  );
}
