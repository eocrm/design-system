import { act, fireEvent, render, screen } from '@testing-library/react';
import { DashboardCanvas } from './DashboardCanvas';
import type { DashboardCanvasProps } from './DashboardCanvas';
import type { DashboardCanvasValue } from './engine';

// jsdom has no layout: stub the observers (callbacks captured), a manual rAF
// queue, and a per-id content height for every auto body.
let roCallbacks: Array<{ cb: () => void; el: Element }>;
let moCallbacks: Array<() => void>;
let frames: FrameRequestCallback[];
let heights: Record<string, number>;
let bodyRectCalls: number;
const origRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  roCallbacks = [];
  moCallbacks = [];
  frames = [];
  heights = {};
  bodyRectCalls = 0;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private cb: () => void;
      constructor(cb: () => void) {
        this.cb = cb;
      }
      observe(el: Element) {
        roCallbacks.push({ cb: this.cb, el });
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'MutationObserver',
    class {
      private cb: () => void;
      constructor(cb: () => void) {
        this.cb = cb;
      }
      observe() {
        moCallbacks.push(this.cb);
      }
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  Element.prototype.getBoundingClientRect = function () {
    const el = this as HTMLElement;
    if (el.hasAttribute('data-dc-auto-body')) {
      bodyRectCalls += 1;
      const id = el.closest('[data-dc-item]')?.getAttribute('data-dc-item') ?? '';
      return { height: heights[id] ?? 0, width: 100 } as DOMRect;
    }
    return origRect.call(el);
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  Element.prototype.getBoundingClientRect = origRect;
});

function flushFrame() {
  act(() => {
    const queued = frames;
    frames = [];
    for (const cb of queued) cb(0);
  });
}

function fireObservers() {
  act(() => {
    // Only the auto bodies' observers: the canvas root has its own width RO.
    for (const { cb, el } of roCallbacks) if (el.hasAttribute('data-dc-auto-body')) cb();
    for (const cb of moCallbacks) cb();
  });
}

/** Expected span for `px`, with the gap read exactly as `measureGrid` reads it. */
function spanFor(container: HTMLElement, px: number): number {
  const grid = container.querySelector('[data-dc-container="top"]') as HTMLElement;
  const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
  return Math.ceil((px + gap) / (48 + gap));
}

const itemEl = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-dc-item="${id}"]`) as HTMLElement;
const row = (container: HTMLElement, id: string) =>
  itemEl(container, id).style.getPropertyValue('--dc-row');

function twoItems(): DashboardCanvasValue {
  return {
    items: [
      { id: 'a', x: 0, y: 0, w: 4, h: 2 },
      { id: 'b', x: 0, y: 2, w: 4, h: 2 },
    ],
    sections: [],
  };
}

function renderCanvas(props: Partial<DashboardCanvasProps> = {}) {
  const onChange = vi.fn();
  const renderItem = vi.fn((id: string | number) => <div>{id}</div>);
  const utils = render(
    <DashboardCanvas
      value={twoItems()}
      onChange={onChange}
      renderItem={renderItem}
      constraints={{ a: { autoHeight: true } }}
      {...props}
    />,
  );
  return { ...utils, onChange, renderItem };
}

describe('DashboardCanvas autoHeight', () => {
  it("derives an auto item's row span from its content and moves the neighbour below", () => {
    heights.a = 300;
    const { container } = renderCanvas();
    flushFrame();
    const span = spanFor(container, 300);
    expect(row(container, 'a')).toBe(`1 / span ${span}`);
    expect(row(container, 'b')).toBe(`${span + 1} / span 2`);
  });

  it('never calls onChange for a measurement', () => {
    heights.a = 300;
    const { onChange } = renderCanvas();
    flushFrame();
    fireObservers();
    flushFrame();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a later drop commits the measured h for the auto item', () => {
    heights.a = 300;
    const { container, onChange } = renderCanvas();
    flushFrame();
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.items.find((i) => i.id === 'a')?.h).toBe(spanFor(container, 300));
  });

  it('coalesces many changes into one pass per frame', () => {
    const value: DashboardCanvasValue = {
      items: Array.from({ length: 30 }, (_, i) => ({
        id: `i${i}`,
        x: i % 24,
        y: Math.floor(i / 24) * 2,
        w: 1,
        h: 2,
      })),
      sections: [],
    };
    for (const item of value.items) heights[item.id] = 100;
    const { renderItem } = renderCanvas({ value, constraints: () => ({ autoHeight: true }) });
    flushFrame();
    for (const item of value.items) heights[item.id] = 200;
    const setAttr = vi.spyOn(Element.prototype, 'setAttribute');
    bodyRectCalls = 0;
    renderItem.mockClear();
    fireObservers();
    flushFrame();
    // One read per auto body, one measuring toggle, one re-render.
    expect(bodyRectCalls).toBe(30);
    expect(setAttr.mock.calls.filter(([name]) => name === 'data-dc-measuring')).toHaveLength(1);
    expect(renderItem).toHaveBeenCalledTimes(30);
    setAttr.mockRestore();
  });

  it('freezes spans during a gesture and applies them after drop', () => {
    heights.a = 300;
    const { container } = renderCanvas();
    flushFrame();
    const before = row(container, 'a');
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    heights.a = 600;
    fireObservers();
    flushFrame();
    // A step re-derives the pick preview from the effective layout — still frozen.
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(row(container, 'a')).toBe(before);
    fireEvent.keyDown(b, { key: 'Escape' });
    flushFrame();
    expect(row(container, 'a')).toBe(`1 / span ${spanFor(container, 600)}`);
  });

  it('clamps the span to minH/maxH', () => {
    heights.a = 2000;
    const { container, rerender, renderItem } = renderCanvas({
      constraints: { a: { autoHeight: true, minH: 3, maxH: 5 } },
    });
    flushFrame();
    expect(row(container, 'a')).toBe('1 / span 5');
    heights.a = 1;
    rerender(
      <DashboardCanvas
        value={twoItems()}
        renderItem={renderItem}
        constraints={{ a: { autoHeight: true, minH: 3, maxH: 5 } }}
      />,
    );
    fireObservers();
    flushFrame();
    expect(row(container, 'a')).toBe('1 / span 3');
  });

  it('auto items have no S/SE handles and ignore Shift+ArrowUp/Down; Shift+ArrowRight still widens', () => {
    const { container, onChange } = renderCanvas();
    const a = itemEl(container, 'a');
    expect(a.querySelector('[data-dc-resize="e"]')).toBeInTheDocument();
    expect(a.querySelector('[data-dc-resize="s"]')).toBeNull();
    expect(a.querySelector('[data-dc-resize="se"]')).toBeNull();
    expect(itemEl(container, 'b').querySelector('[data-dc-resize="se"]')).toBeInTheDocument();
    fireEvent.keyDown(a, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(a, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
    fireEvent.keyDown(a, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.items.find((i) => i.id === 'a')?.w).toBe(5);
  });

  it('renders a canvas without autoHeight exactly as before', () => {
    const value: DashboardCanvasValue = {
      items: [
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
        { id: 'b', x: 0, y: 5, w: 4, h: 2 },
      ],
      sections: [],
    };
    heights.a = 999;
    const { container } = renderCanvas({ value, constraints: undefined });
    fireObservers();
    flushFrame();
    expect(container.querySelector('[data-dc-auto-body]')).toBeNull();
    expect(row(container, 'a')).toBe('1 / span 2');
    expect(row(container, 'b')).toBe('6 / span 2');
  });

  it('keeps the last span while the section is collapsed', () => {
    const value = (collapsed: boolean): DashboardCanvasValue => ({
      items: [],
      sections: [{ id: 's', title: 'S', collapsed, items: [{ id: 'c', x: 0, y: 0, w: 4, h: 2 }] }],
    });
    const constraints = { c: { autoHeight: true } };
    const renderItem = (id: string | number) => <div>{id}</div>;
    heights.c = 300;
    const { container, rerender } = render(
      <DashboardCanvas value={value(false)} renderItem={renderItem} constraints={constraints} />,
    );
    flushFrame();
    const span = (px: number) => `1 / span ${spanFor(container, px)}`;
    expect(row(container, 'c')).toBe(span(300));
    rerender(
      <DashboardCanvas value={value(true)} renderItem={renderItem} constraints={constraints} />,
    );
    heights.c = 600;
    fireObservers();
    flushFrame();
    expect(row(container, 'c')).toBe(span(300));
    rerender(
      <DashboardCanvas value={value(false)} renderItem={renderItem} constraints={constraints} />,
    );
    flushFrame();
    expect(row(container, 'c')).toBe(span(600));
  });

  it('measurement does not loop', () => {
    heights.a = 300;
    const { renderItem } = renderCanvas();
    flushFrame();
    renderItem.mockClear();
    fireObservers();
    flushFrame();
    expect(renderItem).not.toHaveBeenCalled();
    expect(frames).toHaveLength(0);
  });
});
