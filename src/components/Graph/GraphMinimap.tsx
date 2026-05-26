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
  return (
    <div className="absolute bottom-4 right-4 w-48 h-48 bg-background/80 border border-border rounded shadow z-10">
      <div className="text-xs text-muted-foreground px-2 py-1">Minimap</div>
      <ForceGraph2D
        graphData={graphData}
        width={192}
        height={192}
        nodeRelSize={2}
        nodeColor={() => '#888'}
        linkColor={() => '#444'}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        onNodeClick={(node: any) => onLocationClick(node.x, node.y)}
        backgroundColor="transparent"
      />
    </div>
  );
}
