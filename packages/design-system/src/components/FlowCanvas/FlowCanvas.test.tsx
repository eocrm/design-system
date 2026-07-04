import { createRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('pointerdown on a node does NOT start a background pan', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    // The press lands on a node; it bubbles to the root, whose target check
    // must reject it — subsequent moves must not pan the stage.
    fireEvent.pointerDown(screen.getByLabelText('Open'), {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 160, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 160, clientY: 140, pointerId: 1 });
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('applies the panning cursor class only while dragging, not after release', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    expect(root.className).not.toMatch(/rootPanning/);
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 110, pointerId: 1 });
    expect(root.className).toMatch(/rootPanning/);
    fireEvent.pointerUp(root, { clientX: 130, clientY: 110, pointerId: 1 });
    expect(root.className).not.toMatch(/rootPanning/);
  });

  it('normalizes line-based wheel deltas (Firefox deltaMode 1) to pixels', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    // 1 line right, 3 lines down at 16px/line → pan by (-16, -48).
    fireEvent.wheel(root, { deltaX: 1, deltaY: 3, deltaMode: 1 });
    expect(getStage(container).style.transform).toContain('translate(-16px, -48px)');
  });

  it('leaves ctrl/cmd +/-/0 (the browser page-zoom shortcuts) alone', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    // fireEvent returns false when preventDefault was called — these must
    // stay uncancelled so the browser's own zoom (WCAG 1.4.4) still works.
    expect(fireEvent.keyDown(root, { key: '+', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(root, { key: '=', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(root, { key: '-', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(root, { key: '0', metaKey: true })).toBe(true);
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('pointercancel aborts a pending pan without clearing the selection', () => {
    render(
      <FlowCanvas nodes={NODES} edges={EDGES} defaultSelection={{ type: 'node', id: 'open' }} />,
    );
    const root = screen.getByRole('application');
    // Press on empty canvas, then the system aborts the gesture (palm
    // rejection, OS interruption) — the selection must survive, silently.
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerCancel(root, { pointerId: 1 });
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('pointercancel mid-pan drops the panning cursor class', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 110, pointerId: 1 });
    expect(root.className).toMatch(/rootPanning/);
    fireEvent.pointerCancel(root, { pointerId: 1 });
    expect(root.className).not.toMatch(/rootPanning/);
  });

  it('composes consumer pointer/key handlers; preventDefault opts out of canvas handling', () => {
    const onPointerDown = vi.fn();
    const onKeyDown = vi.fn((event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === '+') event.preventDefault();
    });
    const { container } = render(
      <FlowCanvas nodes={NODES} edges={[]} onPointerDown={onPointerDown} onKeyDown={onKeyDown} />,
    );
    const root = screen.getByRole('application');
    fireEvent.pointerDown(root, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(root, { pointerId: 1 });
    root.focus();
    // Consumer preventDefault on '+' → the canvas must not zoom.
    fireEvent.keyDown(root, { key: '+' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
    // Unprevented '-' still reaches the canvas zoom.
    fireEvent.keyDown(root, { key: '-' });
    expect(getStage(container).style.transform).toContain('scale(0.83');
  });

  it('consumer preventDefault on pointerup skips the selection clear but still ends the pan', () => {
    const onPointerUp = vi.fn((event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
    });
    const { container } = render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultSelection={{ type: 'node', id: 'open' }}
        onPointerUp={onPointerUp}
      />,
    );
    const root = screen.getByRole('application');
    // Press-without-move would normally clear the selection on release.
    fireEvent.pointerDown(root, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerUp(root, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onPointerUp).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
    // But the gesture is over: a later move must not pan (no stuck pan state).
    fireEvent.pointerMove(root, { clientX: 200, clientY: 200, pointerId: 1 });
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
  });
});

describe('FlowCanvas selection & intents', () => {
  it('click selects a node (uncontrolled) and reports the change', () => {
    const onSelectionChange = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={EDGES} onSelectionChange={onSelectionChange} />);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(node, { pointerId: 1 });
    expect(node.getAttribute('data-selected')).toBe('true');
    expect(onSelectionChange).toHaveBeenCalledWith({ type: 'node', id: 'open' });
  });

  it('click selects an edge', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const edge = screen.getByLabelText('From Open to Done');
    fireEvent.pointerDown(edge, { pointerId: 1, button: 0 });
    expect(edge.closest('g')!.querySelector('[data-active="true"]')).not.toBeNull();
  });

  it('controlled selection round-trips', () => {
    const { rerender } = render(
      <FlowCanvas nodes={NODES} edges={EDGES} selection={{ type: 'node', id: 'done' }} />,
    );
    expect(screen.getByLabelText('Done').getAttribute('data-selected')).toBe('true');
    rerender(<FlowCanvas nodes={NODES} edges={EDGES} selection={null} />);
    expect(screen.getByLabelText('Done').getAttribute('data-selected')).toBeNull();
  });

  it('double-click on node/edge fires open callbacks', () => {
    const onNodeOpen = vi.fn();
    const onEdgeOpen = vi.fn();
    render(
      <FlowCanvas nodes={NODES} edges={EDGES} onNodeOpen={onNodeOpen} onEdgeOpen={onEdgeOpen} />,
    );
    fireEvent.doubleClick(screen.getByLabelText('Open'));
    expect(onNodeOpen).toHaveBeenCalledWith('open');
    fireEvent.doubleClick(screen.getByLabelText('From Open to Done'));
    expect(onEdgeOpen).toHaveBeenCalledWith('t1');
  });

  it('double-click on empty canvas fires onNodeCreate with canvas coordinates', () => {
    const onNodeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeCreate={onNodeCreate} />);
    const root = screen.getByRole('application');
    root.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        width: 800,
        height: 600,
        right: 810,
        bottom: 620,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;
    fireEvent.doubleClick(root, { clientX: 110, clientY: 220 });
    expect(onNodeCreate).toHaveBeenCalledWith({ x: 100, y: 200 });
  });

  it('Delete fires the delete intent for the selection', () => {
    const onNodeDelete = vi.fn();
    const onEdgeDelete = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultSelection={{ type: 'node', id: 'open' }}
        onNodeDelete={onNodeDelete}
        onEdgeDelete={onEdgeDelete}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });
    expect(onNodeDelete).toHaveBeenCalledWith('open');
    expect(onEdgeDelete).not.toHaveBeenCalled();
  });

  it('Escape clears the selection', () => {
    render(
      <FlowCanvas nodes={NODES} edges={EDGES} defaultSelection={{ type: 'node', id: 'open' }} />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.getByLabelText('Open').getAttribute('data-selected')).toBeNull();
  });

  it('re-selecting the current selection does not re-fire onSelectionChange', () => {
    const onSelectionChange = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={EDGES} onSelectionChange={onSelectionChange} />);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(node, { pointerId: 1 });
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    // Clicking the selected node again (also the first half of a double-click
    // open) must not report a duplicate selection change.
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(node, { pointerId: 1 });
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const edge = screen.getByLabelText('From Open to Done');
    fireEvent.pointerDown(edge, { pointerId: 1, button: 0 });
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    fireEvent.pointerDown(edge, { pointerId: 1, button: 0 });
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    // The label chip selects its edge too — and applies the same guard.
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    expect(onSelectionChange).toHaveBeenCalledTimes(3);
    fireEvent.pointerDown(screen.getByText('Guard'), { pointerId: 1, button: 0 });
    expect(onSelectionChange).toHaveBeenCalledTimes(4);
    fireEvent.pointerDown(screen.getByText('Guard'), { pointerId: 1, button: 0 });
    expect(onSelectionChange).toHaveBeenCalledTimes(4);
  });

  it('consumes Escape only when it clears a selection', () => {
    const outerKeyDown = vi.fn();
    render(
      <div onKeyDown={outerKeyDown}>
        <FlowCanvas nodes={NODES} edges={EDGES} defaultSelection={{ type: 'node', id: 'open' }} />
      </div>,
    );
    const root = screen.getByRole('application');
    root.focus();
    // First Escape clears the selection and is consumed — a bubble-phase
    // ancestor (a consumer's own overlay/panel handler) must not also dismiss.
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.getByLabelText('Open')).not.toHaveAttribute('data-selected');
    expect(outerKeyDown).not.toHaveBeenCalled();
    // Second Escape has nothing to clear — it propagates so layered dismiss
    // still reaches the enclosing surface.
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(outerKeyDown).toHaveBeenCalledTimes(1);
  });

  it('Backspace is a delete alias and routes to the edge intent for edge selections', () => {
    const onNodeDelete = vi.fn();
    const onEdgeDelete = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultSelection={{ type: 'edge', id: 't1' }}
        onNodeDelete={onNodeDelete}
        onEdgeDelete={onEdgeDelete}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Backspace' });
    expect(onEdgeDelete).toHaveBeenCalledWith('t1');
    expect(onNodeDelete).not.toHaveBeenCalled();
  });

  it('Enter opens the selected node; Space opens the selected edge', () => {
    const onNodeOpen = vi.fn();
    const onEdgeOpen = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultSelection={{ type: 'node', id: 'open' }}
        onNodeOpen={onNodeOpen}
        onEdgeOpen={onEdgeOpen}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onNodeOpen).toHaveBeenCalledWith('open');
    expect(onEdgeOpen).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByLabelText('From Open to Done'), { pointerId: 1, button: 0 });
    fireEvent.keyDown(root, { key: ' ' });
    expect(onEdgeOpen).toHaveBeenCalledWith('t1');
    expect(onNodeOpen).toHaveBeenCalledTimes(1);
  });

  it('readOnly blocks delete keys and double-click create but keeps open working', () => {
    const onNodeDelete = vi.fn();
    const onNodeCreate = vi.fn();
    const onNodeOpen = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        readOnly
        defaultSelection={{ type: 'node', id: 'open' }}
        onNodeDelete={onNodeDelete}
        onNodeCreate={onNodeCreate}
        onNodeOpen={onNodeOpen}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });
    fireEvent.keyDown(root, { key: 'Backspace' });
    expect(onNodeDelete).not.toHaveBeenCalled();
    fireEvent.doubleClick(root, { clientX: 100, clientY: 100 });
    expect(onNodeCreate).not.toHaveBeenCalled();
    // Open stays allowed in readOnly — only create/move/connect/delete are gated.
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onNodeOpen).toHaveBeenCalledWith('open');
  });

  it('ignores keys originating from interactive adornment content', () => {
    const onNodeDelete = vi.fn();
    const { container } = render(
      <FlowCanvas
        nodes={[{ id: 'a', label: 'A', adornment: <input aria-label="Filter" /> }]}
        edges={[]}
        defaultSelection={{ type: 'node', id: 'a' }}
        onNodeDelete={onNodeDelete}
      />,
    );
    const input = screen.getByLabelText('Filter');
    input.focus();
    // Backspace inside the input edits text — the canvas must neither treat
    // it as a delete intent nor preventDefault it (fireEvent returns true
    // when the default was not prevented).
    expect(fireEvent.keyDown(input, { key: 'Backspace' })).toBe(true);
    fireEvent.keyDown(input, { key: 'Delete' });
    expect(onNodeDelete).not.toHaveBeenCalled();
    // Zoom keys typed into the adornment must not zoom the canvas either.
    fireEvent.keyDown(input, { key: '+' });
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
  });
});

// The consumer applies a delete intent by removing the node/edge from props.
// The retained (uncontrolled) selection state must stop acting once its id
// leaves the graph — intents may never target ids that are not in the graph.
describe('FlowCanvas stale selection', () => {
  it('stops firing node intents once the selected node leaves the graph', () => {
    const onNodeDelete = vi.fn();
    const onNodeOpen = vi.fn();
    const { rerender } = render(
      <FlowCanvas
        nodes={NODES}
        edges={[]}
        defaultSelection={{ type: 'node', id: 'open' }}
        onNodeDelete={onNodeDelete}
        onNodeOpen={onNodeOpen}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });
    expect(onNodeDelete).toHaveBeenCalledWith('open');
    // Consumer applies the intent: the node is gone from `nodes`.
    rerender(
      <FlowCanvas
        nodes={NODES.filter((n) => n.id !== 'open')}
        edges={[]}
        defaultSelection={{ type: 'node', id: 'open' }}
        onNodeDelete={onNodeDelete}
        onNodeOpen={onNodeOpen}
      />,
    );
    onNodeDelete.mockClear();
    fireEvent.keyDown(root, { key: 'Delete' });
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onNodeDelete).not.toHaveBeenCalled();
    expect(onNodeOpen).not.toHaveBeenCalled();
  });

  it('stops firing edge intents once the selected edge leaves the graph', () => {
    const onEdgeDelete = vi.fn();
    const onEdgeOpen = vi.fn();
    const { rerender } = render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultSelection={{ type: 'edge', id: 't1' }}
        onEdgeDelete={onEdgeDelete}
        onEdgeOpen={onEdgeOpen}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });
    expect(onEdgeDelete).toHaveBeenCalledWith('t1');
    rerender(
      <FlowCanvas
        nodes={NODES}
        edges={[]}
        defaultSelection={{ type: 'edge', id: 't1' }}
        onEdgeDelete={onEdgeDelete}
        onEdgeOpen={onEdgeOpen}
      />,
    );
    onEdgeDelete.mockClear();
    fireEvent.keyDown(root, { key: 'Backspace' });
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onEdgeDelete).not.toHaveBeenCalled();
    expect(onEdgeOpen).not.toHaveBeenCalled();
  });

  it('treats a controlled selection pointing outside the graph as no selection', () => {
    const onNodeDelete = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        selection={{ type: 'node', id: 'ghost' }}
        onNodeDelete={onNodeDelete}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });
    expect(onNodeDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Open')).not.toHaveAttribute('data-selected');
    expect(screen.getByLabelText('Done')).not.toHaveAttribute('data-selected');
  });

  it('lets Escape propagate when the only selection is stale', () => {
    const outerKeyDown = vi.fn();
    const view = (nodes: FlowCanvasNode[]) => (
      <div onKeyDown={outerKeyDown}>
        <FlowCanvas nodes={nodes} edges={[]} defaultSelection={{ type: 'node', id: 'open' }} />
      </div>
    );
    const { rerender } = render(view(NODES));
    rerender(view(NODES.filter((n) => n.id !== 'open')));
    const root = screen.getByRole('application');
    root.focus();
    // A stale selection is no selection — Escape has nothing to clear, so it
    // must reach the enclosing surface instead of being consumed.
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(outerKeyDown).toHaveBeenCalledTimes(1);
  });

  it('restores the selection when the id returns to the graph (consumer undo)', () => {
    const view = (nodes: FlowCanvasNode[]) => (
      <FlowCanvas nodes={nodes} edges={[]} defaultSelection={{ type: 'node', id: 'open' }} />
    );
    const { rerender } = render(view(NODES));
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
    rerender(view(NODES.filter((n) => n.id !== 'open')));
    expect(screen.queryByLabelText('Open')).not.toBeInTheDocument();
    // Undo re-adds the same id — the retained selection becomes valid again.
    rerender(view(NODES));
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
  });
});

// jsdom reports 0x0 rects, so everything above exercises the degenerate
// path. Mocking getBoundingClientRect on the root makes the real geometry —
// fit centering/scale, zoom clamping, cursor-anchored zoom — testable.
const mockRootRect = (el: HTMLElement, width: number, height: number) => {
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }) as DOMRect;
};

const stageScale = (container: HTMLElement): number =>
  parseFloat(/scale\(([\d.]+)\)/.exec(getStage(container).style.transform)![1]);

describe('FlowCanvas viewport geometry (measured 800x600 root)', () => {
  // Node sizes fall back to ESTIMATED_NODE_SIZE (160x40) in jsdom, so with
  // nodes at x=0 and x=300 the content bounds are 460x40 at (0, 0).
  it('zoom-to-fit centers the content bounds inside the padded root', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.click(screen.getByLabelText('Zoom to fit'));
    // z = min(1, (800-64)/460, (600-64)/40) = 1; tx = (800-460)/2; ty = (600-40)/2.
    expect(getStage(container).style.transform).toBe('translate(170px, 280px) scale(1)');
  });

  it('zoom-to-fit scales down large content and subtracts the bounds origin', () => {
    const { container } = render(
      <FlowCanvas
        nodes={[
          { id: 'a', label: 'A', position: { x: 100, y: 50 } },
          { id: 'b', label: 'B', position: { x: 1412, y: 50 } },
        ]}
        edges={[]}
      />,
    );
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.click(screen.getByLabelText('Zoom to fit'));
    // Bounds 1472x40 at (100, 50): z = (800-64)/1472 = 0.5;
    // tx = (800-736)/2 - 100*0.5 = -18; ty = (600-20)/2 - 50*0.5 = 265.
    expect(getStage(container).style.transform).toBe('translate(-18px, 265px) scale(0.5)');
  });

  it('zoom-to-fit clamps at MIN_ZOOM for very large graphs', () => {
    const { container } = render(
      <FlowCanvas
        nodes={[
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 10000, y: 0 } },
        ]}
        edges={[]}
      />,
    );
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.click(screen.getByLabelText('Zoom to fit'));
    // Raw fit scale would be (800-64)/10160 ≈ 0.072 → clamped to 0.25.
    expect(getStage(container).style.transform).toContain('scale(0.25)');
  });

  it('zoom buttons clamp at MAX_ZOOM and MIN_ZOOM', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    for (let i = 0; i < 5; i += 1) fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(stageScale(container)).toBe(2); // 1.2^4 ≈ 2.07 → clamped
    for (let i = 0; i < 20; i += 1) fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(stageScale(container)).toBe(0.25);
  });

  it('zoom buttons anchor the zoom at the viewport center', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    // Center (400, 300) stays fixed: t = c - c*z → (-80, -60).
    expect(getStage(container).style.transform).toBe('translate(-80px, -60px) scale(1.2)');
  });

  it('ctrl+wheel keeps the canvas point under the cursor stationary', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    fireEvent.wheel(root, { deltaY: -100, ctrlKey: true, clientX: 200, clientY: 150 });
    // t = c - c*z with c = (200, 150), z = 1.2.
    expect(getStage(container).style.transform).toBe('translate(-40px, -30px) scale(1.2)');
    fireEvent.wheel(root, { deltaY: -100, ctrlKey: true, clientX: 200, clientY: 150 });
    // Same anchor again: the point under the cursor must not drift.
    expect(getStage(container).style.transform).toBe('translate(-88px, -66px) scale(1.44)');
  });

  it('trackpad pinch (stream of small ctrl deltas) zooms proportionally, not a full step per event', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    // Ten events of deltaY = -5 total 50px ≈ half a notch → z ≈ 1.2^0.5.
    for (let i = 0; i < 10; i += 1) {
      fireEvent.wheel(root, { deltaY: -5, ctrlKey: true, clientX: 400, clientY: 300 });
    }
    expect(stageScale(container)).toBeCloseTo(Math.sqrt(1.2), 5);
    expect(stageScale(container)).toBeLessThan(1.2);
  });

  it('retries the skipped initial fit once the hidden root becomes measurable', () => {
    // Simulate mounting inside a hidden container: the root measures 0x0, so
    // the mount-time fit no-ops; revealing it (first non-zero ResizeObserver
    // tick) must apply the fit rather than leaving the graph at identity.
    interface ObserverEntry {
      cb: ResizeObserverCallback;
      targets: Element[];
    }
    const observers: ObserverEntry[] = [];
    class MockResizeObserver {
      private entry: ObserverEntry;
      constructor(cb: ResizeObserverCallback) {
        this.entry = { cb, targets: [] };
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.targets.push(el);
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    try {
      const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
      const root = screen.getByRole('application');
      expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
      mockRootRect(root, 800, 600); // the container is revealed
      const rootObservers = observers.filter((o) => o.targets.includes(root));
      expect(rootObservers.length).toBeGreaterThan(0);
      act(() => {
        for (const o of rootObservers) o.cb([], o as unknown as ResizeObserver);
      });
      expect(getStage(container).style.transform).toBe('translate(170px, 280px) scale(1)');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('re-applies the mount fit once when real node measurements replace the estimates', () => {
    // The mount fit necessarily runs before ResizeObserver delivers node
    // sizes, so it uses ESTIMATED_NODE_SIZE rects. When the first real
    // measurements shift the bounds, the fit must correct itself once.
    interface ObserverEntry {
      cb: ResizeObserverCallback;
      targets: Element[];
    }
    const observers: ObserverEntry[] = [];
    class MockResizeObserver {
      private entry: ObserverEntry;
      constructor(cb: ResizeObserverCallback) {
        this.entry = { cb, targets: [] };
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.targets.push(el);
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    try {
      const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
      const root = screen.getByRole('application');
      mockRootRect(root, 800, 600);
      const rootObservers = observers.filter((o) => o.targets.includes(root));
      act(() => {
        for (const o of rootObservers) o.cb([], o as unknown as ResizeObserver);
      });
      // Estimated fit: 160x40 nodes at x=0/x=300 → bounds 460x40 at (0, 0).
      expect(getStage(container).style.transform).toBe('translate(170px, 280px) scale(1)');

      // Real measurements arrive: both nodes are 300x40 → bounds 600x40.
      for (const label of ['Open', 'Done']) {
        const el = screen.getByLabelText(label);
        Object.defineProperty(el, 'offsetWidth', { value: 300, configurable: true });
        Object.defineProperty(el, 'offsetHeight', { value: 40, configurable: true });
      }
      const nodeObservers = observers.filter((o) =>
        o.targets.includes(screen.getByLabelText('Open')),
      );
      expect(nodeObservers.length).toBeGreaterThan(0);
      act(() => {
        for (const o of nodeObservers) o.cb([], o as unknown as ResizeObserver);
      });
      // z stays 1 (600 < 800-64); tx re-centers: (800-600)/2 = 100.
      expect(getStage(container).style.transform).toBe('translate(100px, 280px) scale(1)');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('double-click create inverts the viewport transform when zoomed and panned', () => {
    const onNodeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeCreate={onNodeCreate} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    // Zoom in (center-anchored → translate(-80, -60) scale(1.2), pinned by
    // the zoom-anchor test above), then pan by wheel → translate(-90, -80).
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.wheel(root, { deltaX: 10, deltaY: 20 });
    fireEvent.doubleClick(root, { clientX: 90, clientY: 40 });
    // x = (90 - 0 - (-90)) / 1.2 = 150; y = (40 - 0 - (-80)) / 1.2 = 100.
    expect(onNodeCreate).toHaveBeenCalledTimes(1);
    const point = onNodeCreate.mock.calls[0][0] as { x: number; y: number };
    expect(point.x).toBeCloseTo(150, 6);
    expect(point.y).toBeCloseTo(100, 6);
  });
});

describe('FlowCanvas node dragging', () => {
  it('drag commits onNodeMove with the delta in canvas units', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    const node = screen.getByLabelText('Open'); // starts at {0, 0}
    fireEvent.pointerDown(node, { clientX: 50, clientY: 20, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 90, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(node, { clientX: 90, clientY: 50, pointerId: 1 });
    expect(onNodeMove).toHaveBeenCalledWith('open', { x: 40, y: 30 });
  });

  it('a click without movement does NOT fire onNodeMove', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { clientX: 50, clientY: 20, pointerId: 1, button: 0 });
    fireEvent.pointerUp(node, { clientX: 50, clientY: 20, pointerId: 1 });
    expect(onNodeMove).not.toHaveBeenCalled();
  });

  it('does not emit onNodeMove when the node was deleted mid-drag', () => {
    const onNodeMove = vi.fn();
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { clientX: 50, clientY: 20, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 90, clientY: 50, pointerId: 1 });
    // Consumer applies a delete intent mid-gesture — the commit must not
    // fire with the dead id (same revalidation as connect/Delete/Enter).
    rerender(
      <FlowCanvas
        nodes={NODES.filter((n) => n.id !== 'open')}
        edges={[]}
        onNodeMove={onNodeMove}
      />,
    );
    fireEvent.pointerUp(screen.getByRole('application'), {
      clientX: 90,
      clientY: 50,
      pointerId: 1,
    });
    expect(onNodeMove).not.toHaveBeenCalled();
  });

  it('positionless nodes keep their dragged position for the session', () => {
    render(<FlowCanvas nodes={[{ id: 'a', label: 'A' }]} edges={[]} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    const node = screen.getByLabelText('A');
    const startLeft = parseFloat(node.style.left);
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 25, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(parseFloat(node.style.left)).toBe(startLeft + 25);
  });

  it('controlled nodes snap back unless the consumer persists the move', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(node.style.left).toBe('25px'); // live during drag
    fireEvent.pointerUp(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(node.style.left).toBe('0px'); // prop still says 0 → snap back
  });

  it('Shift+Arrow nudges the focused node by 8px and announces', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'ArrowRight', shiftKey: true });
    expect(onNodeMove).toHaveBeenCalledWith('open', { x: 8, y: 0 });
    expect(screen.getByRole('status').textContent).toBe('Open moved');
  });

  it('drag and nudge are inert in readOnly mode', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} readOnly />);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 25, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(node, { clientX: 25, clientY: 0, pointerId: 1 });
    node.focus();
    fireEvent.keyDown(node, { key: 'ArrowRight', shiftKey: true });
    expect(onNodeMove).not.toHaveBeenCalled();
  });

  it('pointercancel aborts a drag without committing or leaving a live position', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(node.style.left).toBe('25px');
    // The system aborted the gesture — the node must snap back, uncommitted.
    fireEvent.pointerCancel(node, { pointerId: 1 });
    expect(node.style.left).toBe('0px');
    expect(onNodeMove).not.toHaveBeenCalled();
  });

  it('consumer preventDefault on pointerup skips the drag commit but still ends the drag', () => {
    const onNodeMove = vi.fn();
    const onPointerUp = vi.fn((event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
    });
    render(
      <FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} onPointerUp={onPointerUp} />,
    );
    mockRootRect(screen.getByRole('application'), 800, 600);
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(node.style.left).toBe('25px'); // live during drag
    fireEvent.pointerUp(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(onPointerUp).toHaveBeenCalledTimes(1);
    // The consumer vetoed the commit (e.g. drop-on-trash-zone): no move
    // intent, no announcement, and the node snaps back to its prop position.
    expect(onNodeMove).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
    expect(node.style.left).toBe('0px');
    // But the gesture is over: a later move must not resume the drag.
    fireEvent.pointerMove(node, { clientX: 200, clientY: 0, pointerId: 1 });
    expect(node.style.left).toBe('0px');
  });

  it('drag while zoomed converts the screen-pixel delta to canvas units', () => {
    const onNodeMove = vi.fn();
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    // Settle the deferred mount fit before zooming: the root measured 0x0 at
    // mount so the fit is still pending, and the first live-drag render would
    // re-run it mid-gesture, resetting the zoom under the pointer (harmless
    // for the drag math — segments convert at the z in effect when they
    // happen — but it would make this test's expected z indeterminate). A
    // fresh nodes identity re-runs the fit effect now that the root is
    // measurable (NODES fit at z = 1, so only tx/ty change) — matching a real
    // browser, where the fit lands before the user can interact.
    rerender(
      <FlowCanvas nodes={NODES.map((n) => ({ ...n }))} edges={[]} onNodeMove={onNodeMove} />,
    );
    fireEvent.click(screen.getByLabelText('Zoom in')); // z = 1.2
    const node = screen.getByLabelText('Open'); // starts at {0, 0}
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 24, clientY: 12, pointerId: 1 });
    // The live position during the drag is already in canvas units: 24/1.2.
    expect(parseFloat(node.style.left)).toBeCloseTo(20, 6);
    fireEvent.pointerUp(node, { clientX: 24, clientY: 12, pointerId: 1 });
    expect(onNodeMove).toHaveBeenCalledTimes(1);
    const [id, position] = onNodeMove.mock.calls[0] as [string, { x: number; y: number }];
    expect(id).toBe('open');
    expect(position.x).toBeCloseTo(20, 6); // 24 screen px / 1.2
    expect(position.y).toBeCloseTo(10, 6); // 12 screen px / 1.2
  });

  it('a mid-gesture zoom converts only subsequent movement, not the accumulated delta', () => {
    const onNodeMove = vi.fn();
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    // Settle the deferred mount fit at z = 1 (see the zoomed-drag test above).
    rerender(
      <FlowCanvas nodes={NODES.map((n) => ({ ...n }))} edges={[]} onNodeMove={onNodeMove} />,
    );
    const node = screen.getByLabelText('Open'); // starts at {0, 0}
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 24, clientY: 0, pointerId: 1 }); // 24px at z=1 → 24 units
    expect(parseFloat(node.style.left)).toBeCloseTo(24, 6);
    // A second touch taps the zoom control mid-drag (z: 1 → 1.2). The already
    // dragged 24 canvas units must stay 24 — dividing the TOTAL screen delta
    // by the new z would retroactively reconvert them and jump the node.
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.pointerMove(node, { clientX: 36, clientY: 0, pointerId: 1 }); // +12px at z=1.2 → +10 units
    expect(parseFloat(node.style.left)).toBeCloseTo(34, 6); // not 36 / 1.2 = 30
    fireEvent.pointerUp(node, { clientX: 36, clientY: 0, pointerId: 1 });
    expect(onNodeMove).toHaveBeenCalledTimes(1);
    const [, position] = onNodeMove.mock.calls[0] as [string, { x: number; y: number }];
    expect(position.x).toBeCloseTo(34, 6);
    expect(position.y).toBeCloseTo(0, 6);
  });

  it('measures the click tolerance in screen pixels, not canvas units, when zoomed out', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.click(screen.getByLabelText('Zoom out')); // z = 1/1.2
    const node = screen.getByLabelText('Open');
    // 2.8 screen px is under the 3px screen tolerance, but converts to
    // 2.8 * 1.2 = 3.36 canvas units — a threshold mistakenly compared in
    // canvas units would treat this jittery click as a drag.
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 2.8, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(node, { clientX: 2.8, clientY: 0, pointerId: 1 });
    expect(onNodeMove).not.toHaveBeenCalled();
  });
});

describe('FlowCanvas connections', () => {
  const getHandle = (label: string) =>
    screen.getByLabelText(label).querySelector('[data-flow-handle]') as HTMLElement;

  it('dragging from the handle onto a valid target fires onEdgeCreate', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    // NODES: open at {0,0}, done at {300,0}; estimated size 160x40 → done center ≈ (380, 20)
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByRole('application'), {
      clientX: 380,
      clientY: 20,
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByRole('application'), {
      clientX: 380,
      clientY: 20,
      pointerId: 1,
    });
    expect(onEdgeCreate).toHaveBeenCalledWith('open', 'done');
  });

  it('dropping on empty canvas cancels', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByRole('application'), {
      clientX: 600,
      clientY: 400,
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByRole('application'), {
      clientX: 600,
      clientY: 400,
      pointerId: 1,
    });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('default validation rejects duplicate edges (drop is ignored)', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={EDGES} onEdgeCreate={onEdgeCreate} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByRole('application'), {
      clientX: 380,
      clientY: 20,
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByRole('application'), {
      clientX: 380,
      clientY: 20,
      pointerId: 1,
    });
    expect(onEdgeCreate).not.toHaveBeenCalled(); // EDGES already has open → done
  });

  it('keyboard connect: C, arrow to target, Enter → onEdgeCreate; announcements along the way', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    expect(screen.getByRole('status').textContent).toMatch(/^Connecting from Open/);
    fireEvent.keyDown(node, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toBe('Target: Done');
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onEdgeCreate).toHaveBeenCalledWith('open', 'done');
    expect(screen.getByRole('status').textContent).toBe('Connected Open to Done');
  });

  it('Escape cancels an in-flight pointer draw; the later pointerup does not commit', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 380, clientY: 20, pointerId: 1 }); // over Done
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
    fireEvent.pointerUp(root, { clientX: 380, clientY: 20, pointerId: 1 });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('Tab is not swallowed during keyboard connect (no keyboard trap)', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    // fireEvent returns false when preventDefault was called — Tab must
    // remain free to move focus out of the widget (WCAG 2.1.2).
    expect(fireEvent.keyDown(node, { key: 'Tab' })).toBe(true);
  });

  it('keyboard connect hops over the source when it sits between targets (A — S — B)', () => {
    // Source in the middle: stepping left from B must reach A, not dead-end
    // on the (invalid) source with a wrong "no target" announcement.
    const row: FlowCanvasNode[] = [
      { id: 'a', label: 'A', position: { x: 0, y: 0 } },
      { id: 's', label: 'S', position: { x: 300, y: 0 } },
      { id: 'b', label: 'B', position: { x: 600, y: 0 } },
    ];
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={row} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const source = screen.getByLabelText('S');
    source.focus();
    fireEvent.keyDown(source, { key: 'c' });
    fireEvent.keyDown(source, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toBe('Target: B');
    fireEvent.keyDown(source, { key: 'ArrowLeft' }); // nearest is S → hop over to A
    expect(screen.getByRole('status').textContent).toBe('Target: A');
    fireEvent.keyDown(source, { key: 'Enter' });
    expect(onEdgeCreate).toHaveBeenCalledWith('s', 'a');
  });

  it('keyboard connect: Escape cancels', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' });
    fireEvent.keyDown(node, { key: 'Escape' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
  });

  it('keyboard connect skips invalid targets (custom isValidConnection)', () => {
    const onEdgeCreate = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={[]}
        onEdgeCreate={onEdgeCreate}
        isValidConnection={() => false}
      />,
    );
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' }); // no valid targets → no target announcement
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('connect handle is hidden in readOnly mode and C is inert', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} readOnly />);
    expect(screen.getByLabelText('Open').querySelector('[data-flow-handle]')).toBeNull();
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    expect(screen.getByRole('status').textContent).not.toMatch(/Connecting/);
  });

  it('ignores a second pointer while a connection is being drawn', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 380, clientY: 20, pointerId: 1 }); // over Done
    // A second finger moves over empty canvas and lifts — it must neither
    // retarget the ghost nor commit/cancel the first finger's connection.
    fireEvent.pointerMove(root, { clientX: 600, clientY: 400, pointerId: 2 });
    fireEvent.pointerUp(root, { clientX: 600, clientY: 400, pointerId: 2 });
    expect(onEdgeCreate).not.toHaveBeenCalled();
    // The original pointer still completes its connection.
    fireEvent.pointerUp(root, { clientX: 380, clientY: 20, pointerId: 1 });
    expect(onEdgeCreate).toHaveBeenCalledWith('open', 'done');
  });

  it('lets a second pointer pan the background without disturbing an in-flight connection', () => {
    const onEdgeCreate = vi.fn();
    const { container } = render(
      <FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />,
    );
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 380, clientY: 20, pointerId: 1 }); // over Done
    // A second finger presses empty canvas and drags: its pan must run (and
    // its pan state must be cleaned up on release, not stranded).
    fireEvent.pointerDown(root, { clientX: 500, clientY: 400, pointerId: 2, button: 0 });
    fireEvent.pointerMove(root, { clientX: 530, clientY: 410, pointerId: 2 });
    fireEvent.pointerUp(root, { clientX: 530, clientY: 410, pointerId: 2 });
    expect(getStage(container).style.transform).toContain('translate(30px, 10px)');
    expect(onEdgeCreate).not.toHaveBeenCalled();
    fireEvent.pointerUp(root, { clientX: 380, clientY: 20, pointerId: 1 });
    expect(onEdgeCreate).toHaveBeenCalledWith('open', 'done');
  });

  it('pressing a node cancels an in-flight keyboard connect', () => {
    const onEdgeCreate = vi.fn();
    const onNodeOpen = vi.fn();
    render(
      <FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} onNodeOpen={onNodeOpen} />,
    );
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' }); // target: Done
    // The user visibly moves on — pressing another node abandons the connect.
    fireEvent.pointerDown(screen.getByLabelText('Done'), { pointerId: 1, button: 0 });
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
    // Enter now opens the selected node instead of confirming a stale connect.
    fireEvent.keyDown(screen.getByLabelText('Done'), { key: 'Enter' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
    expect(onNodeOpen).toHaveBeenCalledWith('done');
  });

  it('pressing empty canvas cancels an in-flight keyboard connect', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const root = screen.getByRole('application');
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' }); // target: Done
    fireEvent.pointerDown(root, { clientX: 600, clientY: 400, pointerId: 1, button: 0 });
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
    fireEvent.pointerUp(root, { clientX: 600, clientY: 400, pointerId: 1 });
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('pressing an edge cancels an in-flight keyboard connect', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    expect(screen.getByRole('status').textContent).toMatch(/^Connecting from Open/);
    fireEvent.pointerDown(screen.getByLabelText('From Open to Done'), { pointerId: 1, button: 0 });
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
  });

  it('pressing an edge label chip cancels an in-flight keyboard connect', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.pointerDown(screen.getByText('Guard'), { pointerId: 1, button: 0 });
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
  });

  it('cancels keyboard connect when focus leaves the canvas, but not on internal focus moves', () => {
    const onEdgeCreate = vi.fn();
    render(
      <>
        <FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />
        <button type="button">outside</button>
      </>,
    );
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' }); // target: Done
    // Focus moving within the canvas keeps the gesture alive…
    fireEvent.focusOut(node, { relatedTarget: screen.getByLabelText('Done') });
    expect(screen.getByRole('status').textContent).toBe('Target: Done');
    // …but focus leaving the canvas entirely must not leave the mode armed
    // invisibly.
    fireEvent.focusOut(node, { relatedTarget: screen.getByText('outside') });
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('revalidates a pointer connect at drop time against the live graph', () => {
    const onEdgeCreate = vi.fn();
    const { rerender } = render(
      <FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />,
    );
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 380, clientY: 20, pointerId: 1 }); // over Done
    // An identical edge appears mid-gesture (undo, collaboration): the drop
    // must not request a duplicate the validator would have rejected.
    rerender(<FlowCanvas nodes={NODES} edges={EDGES} onEdgeCreate={onEdgeCreate} />);
    fireEvent.pointerUp(root, { clientX: 380, clientY: 20, pointerId: 1 });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('revalidates a keyboard connect at Enter against the live graph', () => {
    const onEdgeCreate = vi.fn();
    const { rerender } = render(
      <FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />,
    );
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' }); // target: Done
    // The consumer removes the target node before the commit — Enter must not
    // fire onEdgeCreate with an id that is no longer in the graph.
    rerender(
      <FlowCanvas
        nodes={NODES.filter((n) => n.id !== 'done')}
        edges={[]}
        onEdgeCreate={onEdgeCreate}
      />,
    );
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
  });

  it('Enter with no target picked cancels audibly', () => {
    const onEdgeCreate = vi.fn();
    const onNodeOpen = vi.fn();
    render(
      <FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} onNodeOpen={onNodeOpen} />,
    );
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'Enter' }); // no target picked yet
    expect(onEdgeCreate).not.toHaveBeenCalled();
    // The mode ended — that must be announced, not silent (Escape parity).
    expect(screen.getByRole('status').textContent).toBe('Connection cancelled');
    expect(onNodeOpen).not.toHaveBeenCalled(); // the confirming Enter is consumed
  });

  it('announces when an arrow press finds no valid target', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} isValidConnection={() => false} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    fireEvent.keyDown(node, { key: 'ArrowRight' }); // every target rejected
    expect(screen.getByRole('status').textContent).toBe('No target in that direction');
  });

  it('C is inert while a pointer draw is in flight', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    fireEvent.pointerDown(getHandle('Open'), {
      clientX: 160,
      clientY: 20,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 380, clientY: 20, pointerId: 1 }); // over Done
    // Pressing C mid-draw must not replace the pointer draw with a keyboard
    // connect (which would silently discard the in-flight gesture).
    fireEvent.keyDown(screen.getByLabelText('Done'), { key: 'c' });
    expect(screen.getByRole('status').textContent).not.toMatch(/Connecting from Done/);
    fireEvent.pointerUp(root, { clientX: 380, clientY: 20, pointerId: 1 });
    expect(onEdgeCreate).toHaveBeenCalledWith('open', 'done');
    expect(onEdgeCreate).toHaveBeenCalledTimes(1);
  });
});

describe('FlowCanvas keyboard navigation', () => {
  it('ArrowRight from the root focuses the top-left node, then moves spatially', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByLabelText('Open'));
    expect(screen.getByRole('status').textContent).toBe('Open, node 1 of 2');
    fireEvent.keyDown(screen.getByLabelText('Open'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByLabelText('Done'));
    expect(screen.getByRole('status').textContent).toBe('Done, node 2 of 2');
  });

  it('focus selects the node (selection follows focus)', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(screen.getByLabelText('Open').getAttribute('data-selected')).toBe('true');
  });

  it('Home and End jump to first/last node in document order', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByLabelText('Done'));
    fireEvent.keyDown(screen.getByLabelText('Done'), { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByLabelText('Open'));
  });

  it('E-cycling skips broken edges that are not rendered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <FlowCanvas
        nodes={NODES}
        edges={[
          { id: 'ok', from: 'open', to: 'done' },
          { id: 'broken', from: 'open', to: 'ghost' },
        ]}
      />,
    );
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'e' });
    // Dense cycle: 1 of 1, not 1 of 2 with a dead second press.
    expect(screen.getByRole('status').textContent).toBe('Connection from Open to Done, 1 of 1');
    warn.mockRestore();
  });

  it('focuses with preventScroll — native focus-scroll would desync the viewport', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    const node = screen.getByLabelText('Open');
    const spy = vi.spyOn(node, 'focus');
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(spy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('pans the viewport to reveal a focused off-screen node', () => {
    const row: FlowCanvasNode[] = [
      { id: 'near', label: 'Near', position: { x: 0, y: 0 } },
      { id: 'far', label: 'Far', position: { x: 1000, y: 0 } },
    ];
    const { container } = render(<FlowCanvas nodes={row} edges={[]} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    root.focus();
    fireEvent.keyDown(root, { key: 'End' }); // Far: right edge 1160 > 800
    expect(document.activeElement).toBe(screen.getByLabelText('Far'));
    // dx = 800 - 24(pad) - 1160 = -384; no vertical correction needed.
    expect(getStage(container).style.transform).toBe('translate(-384px, 0px) scale(1)');
  });

  it('does not pan when the focused node is already fully visible', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowRight' }); // Open at {0,0} — visible
    expect(getStage(container).style.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('E cycles through the focused node’s edges and announces position', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'e' });
    const edge = screen.getByLabelText('From Open to Done');
    expect(document.activeElement).toBe(edge);
    expect(screen.getByRole('status').textContent).toBe('Connection from Open to Done, 1 of 1');
    // Enter on the focused edge opens it
  });

  it('Enter on a focused edge fires onEdgeOpen; an arrow returns to the source node', () => {
    const onEdgeOpen = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={EDGES} onEdgeOpen={onEdgeOpen} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'e' });
    const edge = screen.getByLabelText('From Open to Done');
    fireEvent.keyDown(edge, { key: 'Enter' });
    expect(onEdgeOpen).toHaveBeenCalledWith('t1');
    fireEvent.keyDown(edge, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(node);
  });

  it('Delete on a focused edge fires onEdgeDelete', () => {
    const onEdgeDelete = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={EDGES} onEdgeDelete={onEdgeDelete} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'e' });
    fireEvent.keyDown(screen.getByLabelText('From Open to Done'), { key: 'Delete' });
    expect(onEdgeDelete).toHaveBeenCalledWith('t1');
  });

  it('an arrow on a click-focused edge (no E-cycle) returns to the edge source node', () => {
    // A third node placed top-left-most makes a wrong topLeftMost fall-through detectable.
    const nodes: FlowCanvasNode[] = [
      { id: 'far', label: 'Far', position: { x: -500, y: -500 } },
      ...NODES,
    ];
    render(<FlowCanvas nodes={nodes} edges={EDGES} />);
    const edge = screen.getByLabelText('From Open to Done');
    edge.focus(); // browsers focus the tabIndex=-1 path on click — no cycle exists
    fireEvent.keyDown(edge, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByLabelText('Open'));
  });

  it('an arrow on a click-focused edge ignores an E-cycle left on an unrelated node', () => {
    const nodes: FlowCanvasNode[] = [
      ...NODES,
      { id: 'other', label: 'Other', position: { x: 0, y: 300 } },
    ];
    const edges: FlowCanvasEdge[] = [
      { id: 't1', from: 'open', to: 'done' },
      { id: 't2', from: 'other', to: 'done' },
    ];
    render(<FlowCanvas nodes={nodes} edges={edges} />);
    const open = screen.getByLabelText('Open');
    open.focus();
    fireEvent.keyDown(open, { key: 'e' }); // cycle on Open's edges → t1 focused
    const t2 = screen.getByLabelText('From Other to Done');
    t2.focus(); // click-focus a DIFFERENT edge; the old cycle is stale
    fireEvent.keyDown(t2, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByLabelText('Other'));
  });

  it('E on a click-focused edge ignores an E-cycle left on an unrelated node', () => {
    const nodes: FlowCanvasNode[] = [
      ...NODES,
      { id: 'other', label: 'Other', position: { x: 0, y: 300 } },
    ];
    const edges: FlowCanvasEdge[] = [
      { id: 't1', from: 'open', to: 'done' },
      { id: 't2', from: 'other', to: 'done' },
    ];
    render(<FlowCanvas nodes={nodes} edges={edges} />);
    const open = screen.getByLabelText('Open');
    open.focus();
    fireEvent.keyDown(open, { key: 'e' }); // cycle on Open's edges → t1 focused
    const t2 = screen.getByLabelText('From Other to Done');
    t2.focus(); // click-focus a DIFFERENT edge; the old cycle is stale
    fireEvent.keyDown(t2, { key: 'e' });
    // E must cycle the focused edge's own origin (Other), not teleport back
    // to the stale cycle's node (Open).
    expect(document.activeElement).toBe(t2);
    expect(screen.getByRole('status').textContent).toBe('Connection from Other to Done, 1 of 1');
  });

  it('E on a click-focused edge (no E-cycle) starts a cycle from the edge source node', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const edge = screen.getByLabelText('From Open to Done');
    edge.focus(); // browsers focus the tabIndex=-1 path on click — no cycle exists
    fireEvent.keyDown(edge, { key: 'e' });
    expect(document.activeElement).toBe(edge);
    expect(screen.getByRole('status').textContent).toBe('Connection from Open to Done, 1 of 1');
  });
});

describe('FlowCanvas focus reclaim after deletion', () => {
  it('returns focus to the canvas and announces it when the focused node unmounts', () => {
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'ArrowRight' }); // focus Open
    expect(document.activeElement).toBe(screen.getByLabelText('Open'));
    fireEvent.keyDown(screen.getByLabelText('Open'), { key: 'Delete' });
    // The consumer applies the delete intent: the focused node unmounts.
    rerender(<FlowCanvas nodes={NODES.filter((n) => n.id !== 'open')} edges={[]} />);
    expect(document.activeElement).toBe(root);
    expect(screen.getByRole('status').textContent).toBe('Focus returned to the canvas');
  });

  it('returns focus to the canvas when the focused edge unmounts', () => {
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const root = screen.getByRole('application');
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'e' }); // focus the edge
    expect(document.activeElement).toBe(screen.getByLabelText('From Open to Done'));
    fireEvent.keyDown(screen.getByLabelText('From Open to Done'), { key: 'Delete' });
    rerender(<FlowCanvas nodes={NODES} edges={[]} />);
    expect(document.activeElement).toBe(root);
    expect(screen.getByRole('status').textContent).toBe('Focus returned to the canvas');
  });

  it('does not move focus when an unfocused node unmounts', () => {
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    rerender(<FlowCanvas nodes={NODES.filter((n) => n.id !== 'done')} edges={[]} />);
    expect(document.activeElement).toBe(screen.getByLabelText('Open'));
  });

  it('a re-render of the focused node (memo props change, ref re-attach) does not steal focus', () => {
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={[]} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    // A new node object re-renders the memoized FlowNode, whose inline ref
    // callback detaches (null) and re-attaches within the same commit.
    rerender(
      <FlowCanvas
        nodes={NODES.map((n) => (n.id === 'open' ? { ...n, color: '#ff0000' } : n))}
        edges={[]}
      />,
    );
    expect(document.activeElement).toBe(screen.getByLabelText('Open'));
  });
});

// Regressions pinned from the Rule-8 review rounds: each of these mutations
// previously left the whole suite green.
describe('FlowCanvas review regressions', () => {
  it('re-announces identical consecutive messages (live region child mutates)', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const root = screen.getByRole('application');
    const status = screen.getByRole('status');
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(node, { pointerId: 1 });
    root.focus();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(status.textContent).toBe('Selection cleared');
    const firstSpan = status.firstElementChild;
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(node, { pointerId: 1 });
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(status.textContent).toBe('Selection cleared');
    // Same text, NEW child node — without the nonce the DOM never mutates
    // and screen readers stay silent on the second clear.
    expect(status.firstElementChild).not.toBe(firstSpan);
  });

  it('a second pointer on another node cannot hijack an in-flight drag', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'), 800, 600);
    const open = screen.getByLabelText('Open');
    const done = screen.getByLabelText('Done');
    fireEvent.pointerDown(open, { clientX: 50, clientY: 20, pointerId: 1, button: 0 });
    fireEvent.pointerMove(open, { clientX: 70, clientY: 20, pointerId: 1 });
    // Second finger taps another node mid-drag — must not orphan gesture 1.
    fireEvent.pointerDown(done, { clientX: 350, clientY: 20, pointerId: 2, button: 0 });
    fireEvent.pointerUp(done, { clientX: 350, clientY: 20, pointerId: 2 });
    fireEvent.pointerMove(open, { clientX: 90, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(open, { clientX: 90, clientY: 50, pointerId: 1 });
    expect(onNodeMove).toHaveBeenCalledTimes(1);
    expect(onNodeMove).toHaveBeenCalledWith('open', { x: 40, y: 30 });
  });

  it('click on empty canvas clears the selection once, silently when already empty', () => {
    const onSelectionChange = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={[]}
        defaultSelection={{ type: 'node', id: 'open' }}
        onSelectionChange={onSelectionChange}
      />,
    );
    const root = screen.getByRole('application');
    fireEvent.pointerDown(root, { clientX: 600, clientY: 400, pointerId: 1, button: 0 });
    fireEvent.pointerUp(root, { clientX: 600, clientY: 400, pointerId: 1 });
    expect(screen.getByLabelText('Open').getAttribute('data-selected')).toBeNull();
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('status').textContent).toBe('Selection cleared');
    onSelectionChange.mockClear();
    // Nothing selected now — a second empty click must not fire a spurious
    // onSelectionChange(null) (useControllableState has no equality guard).
    fireEvent.pointerDown(root, { clientX: 600, clientY: 400, pointerId: 1, button: 0 });
    fireEvent.pointerUp(root, { clientX: 600, clientY: 400, pointerId: 1 });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('sizes the edges svg to the content extent, covering negative coordinates', () => {
    const { container, rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const svg = container.querySelector('svg')!;
    // NODES span x 0..460 (est. width), y 0..40, margin 64 on each side.
    expect(Number(svg.getAttribute('width'))).toBeGreaterThanOrEqual(460 + 64);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThanOrEqual(40 + 64);
    rerender(
      <FlowCanvas
        nodes={[...NODES, { id: 'far', label: 'Far', position: { x: 900, y: 500 } }]}
        edges={EDGES}
      />,
    );
    expect(Number(svg.getAttribute('width'))).toBeGreaterThanOrEqual(1060 + 64);
    // Negative positions pull the anchored box (and viewBox origin) with them.
    rerender(
      <FlowCanvas
        nodes={[{ id: 'neg', label: 'Neg', position: { x: -500, y: -200 } }]}
        edges={[]}
      />,
    );
    const viewBoxX = Number(svg.getAttribute('viewBox')!.split(' ')[0]);
    expect(viewBoxX).toBeLessThanOrEqual(-500);
  });

  it('controlled selection does not self-update on click; it only reports', () => {
    const onSelectionChange = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={[]}
        selection={null}
        onSelectionChange={onSelectionChange}
      />,
    );
    const node = screen.getByLabelText('Open');
    fireEvent.pointerDown(node, { pointerId: 1, button: 0 });
    expect(onSelectionChange).toHaveBeenCalledWith({ type: 'node', id: 'open' });
    expect(node.getAttribute('data-selected')).toBeNull(); // prop is still null
  });

  it('keyboard connect pans to reveal an off-screen target', () => {
    const row: FlowCanvasNode[] = [
      { id: 's', label: 'S', position: { x: 0, y: 0 } },
      { id: 'far', label: 'Far', position: { x: 1000, y: 0 } },
    ];
    const { container } = render(<FlowCanvas nodes={row} edges={[]} />);
    const root = screen.getByRole('application');
    mockRootRect(root, 800, 600);
    const source = screen.getByLabelText('S');
    source.focus();
    fireEvent.keyDown(source, { key: 'c' });
    fireEvent.keyDown(source, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toBe('Target: Far');
    // Far's right edge (1160) revealed with 24px pad: dx = 800 - 24 - 1160.
    expect(getStage(container).style.transform).toBe('translate(-384px, 0px) scale(1)');
  });

  it('modifier zoom shortcuts pass through keyboard connect (WCAG 1.4.4)', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    const node = screen.getByLabelText('Open');
    node.focus();
    fireEvent.keyDown(node, { key: 'c' });
    // fireEvent returns false when preventDefault was called.
    expect(fireEvent.keyDown(node, { key: '+', ctrlKey: true })).toBe(true);
    // ...and the passthrough must not have cancelled the connect gesture.
    fireEvent.keyDown(node, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toBe('Target: Done');
  });

  it('readOnly swaps the keyboard instructions for the navigation-only variant', () => {
    render(<FlowCanvas nodes={[]} edges={[]} readOnly />);
    const root = screen.getByRole('application');
    const id = root.getAttribute('aria-describedby')!.split(' ')[0];
    const text = document.getElementById(id)!.textContent!;
    expect(text).not.toMatch(/Delete/);
    expect(text).toMatch(/Enter to open/);
  });
});

describe('FlowCanvas maximize + controls rendering', () => {
  it('renders the maximize toggle with a localized label, hidden when maximizeControl is false', () => {
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(screen.getByLabelText('Maximize')).toBeInTheDocument();
    rerender(<FlowCanvas nodes={NODES} edges={EDGES} maximizeControl={false} />);
    expect(screen.queryByLabelText('Maximize')).not.toBeInTheDocument();
  });

  it('renders the controls slot in a labelled toolbar with the pan carve-out', () => {
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        controls={<button data-testid="add">Add node</button>}
      />,
    );
    const toolbar = screen.getByRole('toolbar', { name: 'Canvas actions' });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('data-flow-controls');
    expect(toolbar).toContainElement(screen.getByTestId('add'));
  });

  it('does not render the controls toolbar when no controls are passed', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('honors defaultMaximized on first render', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} defaultMaximized />);
    expect(screen.getByRole('application')).toHaveAttribute('data-flowcanvas-maximized');
    expect(screen.getByLabelText('Restore')).toBeInTheDocument();
  });
});
