import { useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useGraph } from '../../hooks/useGraph';
import { GraphSidePanel } from './GraphSidePanel';

export function GraphView() {
  const { graphData, loading, error } = useGraph();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

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
        graphData={graphData}
        nodeLabel="title"
        nodeAutoColorBy="tags"
        onNodeClick={(node: any) => setSelectedNoteId(node.id)}
        enableNodeDrag={false}
        enableNavigationControls={true}
        linkDirectionalParticles={0}
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
