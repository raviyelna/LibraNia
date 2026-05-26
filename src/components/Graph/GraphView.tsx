import { useState, useMemo, useRef, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import * as d3 from 'd3-force-3d';
import { useGraph } from '../../hooks/useGraph';
import { GraphSidePanel } from './GraphSidePanel';

// Helper function to generate consistent color from tag name
function getColorForTag(tag: string | undefined): string {
  if (!tag) return '#888888'; // Default gray for untagged nodes

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function GraphView() {
  const { graphData, loading, error } = useGraph();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
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
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="title"
        nodeAutoColorBy="tags"
        onNodeClick={(node: any) => setSelectedNoteId(node.id)}
        enableNodeDrag={false}
        enableNavigationControls={true}
        linkDirectionalParticles={0}
        // Instanced rendering for performance (VIZ-02)
        nodeThreeObject={(node: any) => {
          // Create instanced mesh for this node (single draw call)
          const mesh = new THREE.InstancedMesh(geometry, material, 1);

          // Set color based on tag (per D-07)
          const color = getColorForTag(node.tags?.[0]);
          mesh.setColorAt(0, new THREE.Color(color));
          mesh.instanceColor!.needsUpdate = true;

          return mesh;
        }}
        nodeThreeObjectExtend={false}
        // Thin link lines per D-13
        linkWidth={1}
        linkColor={() => '#444444'}
      />
      {selectedNoteId && (
        <GraphSidePanel
          noteId={selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
        />
      )}
    </div>
  );
}
