import { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData } from '../../types/graph';

interface GraphMinimapProps {
  graphData: GraphData;
  onLocationClick: (x: number, y: number) => void;
}

/**
 * GraphMinimap Component
 *
 * Displays a 2D top-down view of the graph in the bottom-right corner.
 * Clicking a node in the minimap jumps the main camera to that location.
 */
export function GraphMinimap({ graphData, onLocationClick }: GraphMinimapProps) {
  const fgRef = useRef<any>(null);

  // Fit graph to view after mount and when data changes
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      // Small delay to ensure layout has started
      setTimeout(() => {
        // Check if zoomToFit exists before calling
        if (typeof fgRef.current.zoomToFit === 'function') {
          fgRef.current.zoomToFit(400, 20);
        }
      }, 100);
    }
  }, [graphData]);

  return (
    <div className="absolute bottom-4 right-4 w-48 h-48 bg-background/80 border border-border rounded shadow z-10">
      <div className="text-xs text-muted-foreground px-2 py-1">Minimap</div>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={192}
        height={168}
        nodeRelSize={4}
        nodeColor={() => '#888'}
        linkColor={() => '#444'}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        onNodeClick={(node: any) => onLocationClick(node.x, node.y)}
        backgroundColor="#1a1a1a"
        cooldownTicks={100}
        cooldownTime={3000}
      />
    </div>
  );
}
