import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphMinimap } from './GraphMinimap';

// Mock ForceGraph2D component
vi.mock('react-force-graph-2d', () => ({
  default: vi.fn().mockImplementation(({ graphData, onNodeClick, width, height, nodeRelSize, nodeColor, linkColor, enableZoomInteraction, enablePanInteraction, backgroundColor, cooldownTicks, cooldownTime }: any) => {
    // Store props for test assertions
    (window as any).__testMinimapProps = {
      width,
      height,
      nodeRelSize,
      nodeColor,
      linkColor,
      enableZoomInteraction,
      enablePanInteraction,
      backgroundColor,
      cooldownTicks,
      cooldownTime,
    };

    return (
      <div data-testid="force-graph-2d">
        <div data-testid="minimap-data">{JSON.stringify(graphData)}</div>
        {graphData.nodes.map((node: any) => (
          <button
            key={node.id}
            data-testid={`minimap-node-${node.id}`}
            onClick={() => onNodeClick(node)}
          >
            {node.title}
          </button>
        ))}
      </div>
    );
  }),
}));

describe('GraphMinimap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__testMinimapProps = null;
  });

  it('renders minimap container with label', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    expect(screen.getByText('Minimap')).toBeInTheDocument();
  });

  it('renders ForceGraph2D with graph data', () => {
    const mockData = {
      nodes: [
        { id: '1', title: 'Node 1', tags: ['tag1'], x: 10, y: 20 },
        { id: '2', title: 'Node 2', tags: ['tag2'], x: 30, y: 40 },
      ],
      links: [
        { source: '1', target: '2', type: 'manual' as const },
      ],
    };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const forceGraph = screen.getByTestId('force-graph-2d');
    expect(forceGraph).toBeInTheDocument();

    const minimapData = screen.getByTestId('minimap-data');
    expect(minimapData).toHaveTextContent(JSON.stringify(mockData));
  });

  it('configures ForceGraph2D with correct dimensions', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const props = (window as any).__testMinimapProps;
    expect(props.width).toBe(192);
    expect(props.height).toBe(168); // 192 - 24px for header
  });

  it('configures small node size', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const props = (window as any).__testMinimapProps;
    expect(props.nodeRelSize).toBe(4); // Increased from 2 for better visibility
  });

  it('configures gray node color', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const props = (window as any).__testMinimapProps;
    expect(props.nodeColor).toBeDefined();

    // Call nodeColor function to verify it returns gray
    if (typeof props.nodeColor === 'function') {
      const color = props.nodeColor();
      expect(color).toBe('#888');
    }
  });

  it('configures dark gray link color', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const props = (window as any).__testMinimapProps;
    expect(props.linkColor).toBeDefined();

    // Call linkColor function to verify it returns dark gray
    if (typeof props.linkColor === 'function') {
      const color = props.linkColor();
      expect(color).toBe('#444');
    }
  });

  it('disables zoom and pan interactions', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const props = (window as any).__testMinimapProps;
    expect(props.enableZoomInteraction).toBe(false);
    expect(props.enablePanInteraction).toBe(false);
  });

  it('uses dark background for visibility', () => {
    const mockData = { nodes: [], links: [] };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const props = (window as any).__testMinimapProps;
    expect(props.backgroundColor).toBe('#1a1a1a'); // Dark background instead of transparent for node visibility
  });

  it('calls onLocationClick when node is clicked', async () => {
    const user = userEvent.setup();
    const mockData = {
      nodes: [
        { id: '1', title: 'Node 1', tags: [], x: 100, y: 200 },
      ],
      links: [],
    };
    const mockOnLocationClick = vi.fn();

    render(<GraphMinimap graphData={mockData} onLocationClick={mockOnLocationClick} />);

    const nodeButton = screen.getByTestId('minimap-node-1');
    await user.click(nodeButton);

    expect(mockOnLocationClick).toHaveBeenCalledTimes(1);
    expect(mockOnLocationClick).toHaveBeenCalledWith(100, 200);
  });

  it('updates when graph data changes', () => {
    const mockData1 = {
      nodes: [{ id: '1', title: 'Node 1', tags: [], x: 10, y: 20 }],
      links: [],
    };
    const mockData2 = {
      nodes: [
        { id: '1', title: 'Node 1', tags: [], x: 10, y: 20 },
        { id: '2', title: 'Node 2', tags: [], x: 30, y: 40 },
      ],
      links: [{ source: '1', target: '2', type: 'manual' as const }],
    };
    const mockOnLocationClick = vi.fn();

    const { rerender } = render(
      <GraphMinimap graphData={mockData1} onLocationClick={mockOnLocationClick} />
    );

    expect(screen.getByTestId('minimap-node-1')).toBeInTheDocument();
    expect(screen.queryByTestId('minimap-node-2')).not.toBeInTheDocument();

    rerender(<GraphMinimap graphData={mockData2} onLocationClick={mockOnLocationClick} />);

    expect(screen.getByTestId('minimap-node-1')).toBeInTheDocument();
    expect(screen.getByTestId('minimap-node-2')).toBeInTheDocument();
  });
});
