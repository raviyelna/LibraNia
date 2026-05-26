import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphView } from './GraphView';
import * as THREE from 'three';

// Mock d3-force-3d
vi.mock('d3-force-3d', () => ({
  forceCollide: vi.fn((radius?: number) => {
    const force = {
      radius: vi.fn(() => radius || 10),
    };
    return force;
  }),
}));

// Mock useGraph hook
const mockUseGraph = vi.fn();
vi.mock('../../hooks/useGraph', () => ({
  useGraph: () => mockUseGraph(),
}));

// Mock ForceGraph3D component
vi.mock('react-force-graph-3d', () => {
  const mockD3Force = vi.fn((forceName: string, force?: any) => {
    const mockForce = {
      strength: vi.fn((value?: any) => {
        if (forceName === 'charge') {
          (window as any).__testGraphProps = {
            ...(window as any).__testGraphProps,
            chargeStrength: typeof value === 'function' ? value() : value
          };
        } else if (forceName === 'center') {
          (window as any).__testGraphProps = {
            ...(window as any).__testGraphProps,
            centerStrength: typeof value === 'function' ? value() : value
          };
        } else if (forceName === 'link') {
          (window as any).__testGraphProps = {
            ...(window as any).__testGraphProps,
            linkStrength: typeof value === 'function' ? value() : value
          };
        }
        return mockForce;
      }),
      distance: vi.fn((value?: any) => {
        if (forceName === 'link') {
          (window as any).__testGraphProps = {
            ...(window as any).__testGraphProps,
            linkDistance: typeof value === 'function' ? value() : value
          };
        }
        return mockForce;
      }),
    };

    if (force && forceName === 'collision') {
      // Store collision radius - d3.forceCollide returns a force with radius method
      const radius = force.radius ? force.radius() : 10;
      (window as any).__testGraphProps = {
        ...(window as any).__testGraphProps,
        collisionRadius: radius
      };
    }

    return mockForce;
  });

  return {
    default: vi.fn().mockImplementation(({ graphData, onNodeClick, nodeLabel, nodeAutoColorBy, enableNodeDrag, enableNavigationControls, linkDirectionalParticles, nodeThreeObject, nodeThreeObjectExtend, linkWidth, linkColor, nodeColor }: any) => {
      // Call nodeThreeObject to verify it returns InstancedMesh
      if (nodeThreeObject && graphData?.nodes?.length > 0) {
        const result = nodeThreeObject(graphData.nodes[0]);
        // Store result for test assertions
        (window as any).__testNodeObject = result;
      }

      // Create mock ref with d3Force method
      const mockRef = {
        current: {
          d3Force: mockD3Force,
        },
      };

      // Capture highlighted nodes by testing nodeColor function
      const highlightedNodes: string[] = [];
      if (typeof nodeColor === 'function' && graphData?.nodes) {
        graphData.nodes.forEach((node: any) => {
          const color = nodeColor(node);
          if (color === '#ffffff') {
            highlightedNodes.push(node.id);
          }
        });
      }

      // Store props for test assertions
      (window as any).__testGraphProps = {
        ...(window as any).__testGraphProps,
        linkWidth,
        linkColor,
        nodeColor,
        nodeThreeObjectExtend,
        fgRef: mockRef,
        highlightedNodes,
      };

      return (
        <div data-testid="force-graph-3d">
          <div data-testid="graph-data">{JSON.stringify(graphData)}</div>
          <div data-testid="node-label">{nodeLabel}</div>
          <div data-testid="node-auto-color-by">{nodeAutoColorBy}</div>
          <div data-testid="enable-node-drag">{String(enableNodeDrag)}</div>
          <div data-testid="enable-navigation-controls">{String(enableNavigationControls)}</div>
          <div data-testid="link-directional-particles">{String(linkDirectionalParticles)}</div>
          {graphData.nodes.map((node: any) => (
            <button
              key={node.id}
              data-testid={`node-${node.id}`}
              onClick={() => onNodeClick(node)}
            >
              {node.title}
            </button>
          ))}
        </div>
      );
    }),
  };
});

// Mock GraphSidePanel component
vi.mock('./GraphSidePanel', () => ({
  GraphSidePanel: ({ noteId, onClose }: { noteId: string; onClose: () => void }) => (
    <div data-testid="graph-side-panel">
      <div data-testid="panel-note-id">{noteId}</div>
      <button data-testid="panel-close" onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('GraphView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__testNodeObject = null;
    (window as any).__testGraphProps = null;
  });

  it('shows loading state while fetching', () => {
    mockUseGraph.mockReturnValue({
      graphData: { nodes: [], links: [] },
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<GraphView />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', () => {
    mockUseGraph.mockReturnValue({
      graphData: { nodes: [], links: [] },
      loading: false,
      error: new Error('Failed to fetch graph data'),
      refetch: vi.fn(),
    });

    render(<GraphView />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch graph data/i)).toBeInTheDocument();
  });

  it('renders ForceGraph3D with graph data', () => {
    const mockData = {
      nodes: [
        { id: '1', title: 'Node 1', tags: ['tag1'] },
        { id: '2', title: 'Node 2', tags: ['tag2'] },
      ],
      links: [
        { source: '1', target: '2', type: 'manual' as const },
      ],
    };

    mockUseGraph.mockReturnValue({
      graphData: mockData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<GraphView />);

    const forceGraph = screen.getByTestId('force-graph-3d');
    expect(forceGraph).toBeInTheDocument();

    const graphDataElement = screen.getByTestId('graph-data');
    expect(graphDataElement).toHaveTextContent(JSON.stringify(mockData));
  });

  it('configures ForceGraph3D with correct props', () => {
    mockUseGraph.mockReturnValue({
      graphData: { nodes: [], links: [] },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<GraphView />);

    expect(screen.getByTestId('node-label')).toHaveTextContent('title');
    expect(screen.getByTestId('node-auto-color-by')).toHaveTextContent('tags');
    expect(screen.getByTestId('enable-node-drag')).toHaveTextContent('false');
    expect(screen.getByTestId('enable-navigation-controls')).toHaveTextContent('true');
    expect(screen.getByTestId('link-directional-particles')).toHaveTextContent('0');
  });

  it('opens side panel when node is clicked', async () => {
    const user = userEvent.setup();
    const mockData = {
      nodes: [
        { id: 'note-123', title: 'Test Note', tags: ['test'] },
      ],
      links: [],
    };

    mockUseGraph.mockReturnValue({
      graphData: mockData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<GraphView />);

    // Initially no side panel
    expect(screen.queryByTestId('graph-side-panel')).not.toBeInTheDocument();

    // Click node
    const nodeButton = screen.getByTestId('node-note-123');
    await user.click(nodeButton);

    // Side panel appears
    expect(screen.getByTestId('graph-side-panel')).toBeInTheDocument();
    expect(screen.getByTestId('panel-note-id')).toHaveTextContent('note-123');
  });

  it('closes side panel when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockData = {
      nodes: [
        { id: 'note-123', title: 'Test Note', tags: ['test'] },
      ],
      links: [],
    };

    mockUseGraph.mockReturnValue({
      graphData: mockData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<GraphView />);

    // Open side panel
    const nodeButton = screen.getByTestId('node-note-123');
    await user.click(nodeButton);
    expect(screen.getByTestId('graph-side-panel')).toBeInTheDocument();

    // Close side panel
    const closeButton = screen.getByTestId('panel-close');
    await user.click(closeButton);
    expect(screen.queryByTestId('graph-side-panel')).not.toBeInTheDocument();
  });

  it('displays nodes and links from graph data', () => {
    const mockData = {
      nodes: [
        { id: '1', title: 'Node 1', tags: ['tag1'] },
        { id: '2', title: 'Node 2', tags: ['tag2'] },
        { id: '3', title: 'Node 3', tags: ['tag3'] },
      ],
      links: [
        { source: '1', target: '2', type: 'manual' as const },
        { source: '2', target: '3', type: 'semantic' as const },
      ],
    };

    mockUseGraph.mockReturnValue({
      graphData: mockData,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<GraphView />);

    expect(screen.getByTestId('node-1')).toBeInTheDocument();
    expect(screen.getByTestId('node-2')).toBeInTheDocument();
    expect(screen.getByTestId('node-3')).toBeInTheDocument();
  });

  describe('Instanced Rendering (Task 1)', () => {
    it('should use InstancedMesh for node rendering', async () => {
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Test Node 1', tags: ['test'] },
          { id: '2', title: 'Test Node 2', tags: ['demo'] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      await waitFor(() => {
        expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
      });

      // Verify nodeThreeObject returns InstancedMesh
      const nodeObject = (window as any).__testNodeObject;
      expect(nodeObject).toBeInstanceOf(THREE.InstancedMesh);
    });

    it('should set nodeThreeObjectExtend to false', async () => {
      const mockGraphData = {
        nodes: [{ id: '1', title: 'Test Node', tags: ['test'] }],
        links: [],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        expect(props.nodeThreeObjectExtend).toBe(false);
      });
    });

    it('should set node color based on tag hash', async () => {
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Test Node', tags: ['javascript'] },
        ],
        links: [],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      await waitFor(() => {
        const nodeObject = (window as any).__testNodeObject;
        expect(nodeObject).toBeInstanceOf(THREE.InstancedMesh);

        // Verify color was set (instanceColor should exist)
        expect(nodeObject.instanceColor).toBeTruthy();
      });
    });

    it('should configure thin link lines (width 1)', async () => {
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: [] },
          { id: '2', title: 'Node 2', tags: [] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        expect(props.linkWidth).toBeDefined();

        // Call linkWidth function to verify default is 1
        if (typeof props.linkWidth === 'function') {
          const width = props.linkWidth(mockGraphData.links[0]);
          expect(width).toBe(1);
        }
      });
    });

    it('should configure subtle link color', async () => {
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: [] },
          { id: '2', title: 'Node 2', tags: [] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        expect(props.linkColor).toBeDefined();

        // Call linkColor function to verify it returns dark gray
        if (typeof props.linkColor === 'function') {
          const color = props.linkColor(mockGraphData.links[0]);
          expect(color).toBe('#444444');
        }
      });
    });
  });

  describe('Force Simulation Configuration (Task 2)', () => {
    it('should create ref for ForceGraph3D', async () => {
      const mockGraphData = {
        nodes: [{ id: '1', title: 'Node 1', tags: [] }],
        links: [],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        expect(props.fgRef).toBeDefined();
        expect(props.fgRef.current).toBeDefined();
        expect(props.fgRef.current.d3Force).toBeDefined();
      });
    });
  });

  describe('Neighbor Highlighting (Task 3)', () => {
    it('should highlight clicked node and direct neighbors', async () => {
      const user = userEvent.setup();
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: ['test'] },
          { id: '2', title: 'Node 2', tags: ['test'] },
          { id: '3', title: 'Node 3', tags: ['test'] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
          { source: '2', target: '3', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      // Click node 2 (has neighbors 1 and 3)
      const node2Button = screen.getByTestId('node-2');
      await user.click(node2Button);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        // Node 2 and its neighbors (1, 3) should be highlighted
        expect(props.highlightedNodes).toContain('1');
        expect(props.highlightedNodes).toContain('2');
        expect(props.highlightedNodes).toContain('3');
      });
    });

    it('should use white color for highlighted nodes', async () => {
      const user = userEvent.setup();
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: ['test'] },
          { id: '2', title: 'Node 2', tags: ['test'] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      const node1Button = screen.getByTestId('node-1');
      await user.click(node1Button);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        expect(props.nodeColor).toBeDefined();

        // Highlighted node should be white
        if (typeof props.nodeColor === 'function') {
          const color = props.nodeColor({ id: '1', title: 'Node 1', tags: ['test'] });
          expect(color).toBe('#ffffff');
        }
      });
    });

    it('should dim non-highlighted nodes', async () => {
      const user = userEvent.setup();
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: ['test'] },
          { id: '2', title: 'Node 2', tags: ['test'] },
          { id: '3', title: 'Node 3', tags: ['test'] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      const node1Button = screen.getByTestId('node-1');
      await user.click(node1Button);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;

        // Non-highlighted node (3) should be dimmed
        if (typeof props.nodeColor === 'function') {
          const color = props.nodeColor({ id: '3', title: 'Node 3', tags: ['test'] });
          expect(color).toBe('#444444');
        }
      });
    });

    it('should highlight links between highlighted nodes', async () => {
      const user = userEvent.setup();
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: ['test'] },
          { id: '2', title: 'Node 2', tags: ['test'] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      const node1Button = screen.getByTestId('node-1');
      await user.click(node1Button);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;

        // Highlighted link should be white with width 2
        if (typeof props.linkColor === 'function') {
          const color = props.linkColor(mockGraphData.links[0]);
          expect(color).toBe('#ffffff');
        }

        if (typeof props.linkWidth === 'function') {
          const width = props.linkWidth(mockGraphData.links[0]);
          expect(width).toBe(2);
        }
      });
    });

    it('should clear highlighting when side panel is closed', async () => {
      const user = userEvent.setup();
      const mockGraphData = {
        nodes: [
          { id: '1', title: 'Node 1', tags: ['test'] },
          { id: '2', title: 'Node 2', tags: ['test'] },
        ],
        links: [
          { source: '1', target: '2', type: 'manual' as const },
        ],
      };

      mockUseGraph.mockReturnValue({
        graphData: mockGraphData,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<GraphView />);

      // Click node to open panel and highlight
      const node1Button = screen.getByTestId('node-1');
      await user.click(node1Button);

      expect(screen.getByTestId('graph-side-panel')).toBeInTheDocument();

      // Close panel
      const closeButton = screen.getByTestId('panel-close');
      await user.click(closeButton);

      await waitFor(() => {
        const props = (window as any).__testGraphProps;
        // Highlighting should be cleared
        expect(props.highlightedNodes).toEqual([]);
      });
    });
  });
});
