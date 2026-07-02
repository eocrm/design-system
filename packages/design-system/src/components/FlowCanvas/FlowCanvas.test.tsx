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
});
