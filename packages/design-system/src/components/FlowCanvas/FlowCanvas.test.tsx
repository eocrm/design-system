import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

const getStage = (container: HTMLElement) =>
  container.querySelector('[data-flow-stage]') as HTMLDivElement;

describe('FlowCanvas viewport', () => {
  it('starts at identity transform in jsdom (zero-sized root skips fit)', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('zoom controls scale the stage and announce the level', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(getStage(container).style.transform).toContain('scale(1.2)');
    expect(screen.getByRole('status').textContent).toBe('Zoom 120%');
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(getStage(container).style.transform).toContain('scale(1)');
  });

  it('plain wheel pans, ctrl+wheel zooms', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    fireEvent.wheel(root, { deltaX: 10, deltaY: 20 });
    expect(getStage(container).style.transform).toContain('translate(-10px, -20px)');
    fireEvent.wheel(root, { deltaY: -100, ctrlKey: true });
    expect(getStage(container).style.transform).toContain('scale(1.2)');
  });

  it('dragging the background pans', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 110, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 130, clientY: 110, pointerId: 1 });
    expect(getStage(container).style.transform).toContain('translate(30px, 10px)');
  });

  it('+/-/0 keys zoom and fit', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: '+' });
    expect(getStage(container).style.transform).toContain('scale(1.2)');
    fireEvent.keyDown(root, { key: '-' });
    expect(getStage(container).style.transform).toContain('scale(1)');
    fireEvent.keyDown(root, { key: '0' }); // zero-sized root → fit is a no-op, must not throw
  });

  it('ctrl+arrows pan', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowRight', ctrlKey: true });
    expect(getStage(container).style.transform).toContain('translate(-40px, 0px)');
  });
});
