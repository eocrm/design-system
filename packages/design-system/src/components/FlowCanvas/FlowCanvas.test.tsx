import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { FlowCanvas } from './FlowCanvas';
import type { FlowCanvasEdge, FlowCanvasNode } from './types';

const NODES: FlowCanvasNode[] = [
  { id: 'open', label: 'Open', color: '#0052cc', position: { x: 0, y: 0 } },
  { id: 'done', label: 'Done', position: { x: 300, y: 0 }, adornment: <em>badge</em> },
];
const EDGES: FlowCanvasEdge[] = [{ id: 't1', from: 'open', to: 'done', label: <i>Guard</i> }];

describe('FlowCanvas rendering', () => {
  it('renders one element per node and per edge', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(screen.getByLabelText('Open')).toBeInTheDocument();
    expect(screen.getByLabelText('Done')).toBeInTheDocument();
    expect(screen.getByLabelText('From Open to Done')).toBeInTheDocument();
  });

  it('renders adornment and edge label slots', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(screen.getByText('badge')).toBeInTheDocument();
    expect(screen.getByText('Guard')).toBeInTheDocument();
  });

  it('positions explicitly-placed nodes and applies the color custom property', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const open = screen.getByLabelText('Open');
    expect(open.style.left).toBe('0px');
    expect(open.style.getPropertyValue('--flow-node-color')).toBe('#0052cc');
  });

  it('auto-lays-out nodes without positions', () => {
    render(
      <FlowCanvas
        nodes={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
        edges={[{ id: 'e', from: 'a', to: 'b' }]}
      />,
    );
    const a = screen.getByLabelText('A');
    const b = screen.getByLabelText('B');
    expect(parseFloat(b.style.left)).toBeGreaterThan(parseFloat(a.style.left));
  });

  it('forwards ref to the root element and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <FlowCanvas nodes={[]} edges={[]} ref={ref} className="custom" data-testid="fc" />,
    );
    expect(ref.current).toBe(container.firstChild);
    expect(ref.current!.className).toContain('custom');
    expect(screen.getByTestId('fc')).toBe(ref.current);
  });

  it('has application role, default aria-label, and keyboard instructions', () => {
    render(<FlowCanvas nodes={[]} edges={[]} />);
    const root = screen.getByRole('application');
    expect(root).toHaveAttribute('aria-label', 'Flow canvas');
    expect(root).toHaveAttribute('tabindex', '0');
    const describedby = root.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedby.split(' ')[0])!.textContent).toMatch(/arrow keys/i);
  });

  it('skips edges referencing missing nodes with a one-time console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(
      <FlowCanvas nodes={NODES} edges={[{ id: 'bad', from: 'open', to: 'ghost' }]} />,
    );
    expect(screen.queryByLabelText(/ghost/i)).not.toBeInTheDocument();
    const count = warn.mock.calls.length;
    expect(count).toBeGreaterThan(0);
    rerender(<FlowCanvas nodes={NODES} edges={[{ id: 'bad', from: 'open', to: 'ghost' }]} />);
    expect(warn.mock.calls.length).toBe(count); // not re-warned
    warn.mockRestore();
  });

  it('renders zoom controls with localized labels', () => {
    render(<FlowCanvas nodes={[]} edges={[]} />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom to fit')).toBeInTheDocument();
  });
});

// Interaction-driven selection changes (click/focus/Escape firing
// `onSelectionChange`) are covered by the interaction tasks; this slice pins
// the prop-driven rendering that already ships.
describe('FlowCanvas selection and read-only rendering', () => {
  it('marks the controlled-selected node and follows the prop across rerenders', () => {
    const { rerender } = render(
      <FlowCanvas nodes={NODES} edges={EDGES} selection={{ type: 'node', id: 'open' }} />,
    );
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
    expect(screen.getByLabelText('Done')).not.toHaveAttribute('data-selected');

    rerender(<FlowCanvas nodes={NODES} edges={EDGES} selection={{ type: 'node', id: 'done' }} />);
    expect(screen.getByLabelText('Open')).not.toHaveAttribute('data-selected');
    expect(screen.getByLabelText('Done')).toHaveAttribute('data-selected');

    rerender(<FlowCanvas nodes={NODES} edges={EDGES} selection={null} />);
    expect(screen.getByLabelText('Open')).not.toHaveAttribute('data-selected');
    expect(screen.getByLabelText('Done')).not.toHaveAttribute('data-selected');
  });

  it('renders the controlled-selected edge with the active stroke and arrowhead', () => {
    const { container, rerender } = render(
      <FlowCanvas nodes={NODES} edges={EDGES} selection={{ type: 'edge', id: 't1' }} />,
    );
    const active = container.querySelector('path[data-active]');
    expect(active).not.toBeNull();
    expect(active!.getAttribute('marker-end')).toContain('flow-arrow-active');

    rerender(<FlowCanvas nodes={NODES} edges={EDGES} selection={null} />);
    expect(container.querySelector('path[data-active]')).toBeNull();
    const visible = container.querySelector('path[marker-end]')!;
    expect(visible.getAttribute('marker-end')).not.toContain('flow-arrow-active');
  });

  it('applies defaultSelection when uncontrolled', () => {
    render(
      <FlowCanvas nodes={NODES} edges={EDGES} defaultSelection={{ type: 'node', id: 'open' }} />,
    );
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
    expect(screen.getByLabelText('Done')).not.toHaveAttribute('data-selected');
  });

  it('shows a connect handle per node normally and none in readOnly mode', () => {
    const { container, rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(container.querySelectorAll('[data-flow-handle]')).toHaveLength(NODES.length);

    rerender(<FlowCanvas nodes={NODES} edges={EDGES} readOnly />);
    expect(container.querySelectorAll('[data-flow-handle]')).toHaveLength(0);
  });
});
