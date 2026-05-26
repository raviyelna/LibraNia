import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphView } from './GraphView';

// Mock useGraph hook
const mockUseGraph = vi.fn();
vi.mock('../../hooks/useGraph', () => ({
  useGraph: () => mockUseGraph(),
}));

// Mock ForceGraph3D component
vi.mock('react-force-graph-3d', () => ({
  default: ({ graphData, onNodeClick, nodeLabel, nodeAutoColorBy, enableNodeDrag, enableNavigationControls, linkDirectionalParticles }: any) => (
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
  ),
}));

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
});
