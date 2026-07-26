import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { createPortal } from 'react-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { overlayStack } from '../_internal/overlay';
import { DashboardCanvas } from './DashboardCanvas';
import { applyMove, applyResize, reorderSection } from './engine';
import type { DashboardCanvasValue } from './engine';

function baseValue(): DashboardCanvasValue {
  return {
    items: [
      { id: 'a', x: 0, y: 1, w: 2, h: 1 },
      { id: 'b', x: 0, y: 0, w: 2, h: 1 },
    ],
    sections: [
      {
        id: 's1',
        title: 'Section One',
        collapsed: false,
        items: [{ id: 'c', x: 0, y: 0, w: 1, h: 1 }],
      },
      {
        id: 's2',
        title: 'Section Two',
        collapsed: true,
        items: [{ id: 'd', x: 0, y: 0, w: 1, h: 1 }],
      },
    ],
  };
}

const renderItem = (id: string | number) => <div data-testid={`item-${id}`}>{id}</div>;

describe('DashboardCanvas rendering', () => {
  it('stamps each item with the correct inline grid custom properties', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const a = screen.getByTestId('item-a').parentElement as HTMLElement;
    expect(a.style.getPropertyValue('--dc-col')).toBe('1 / span 2');
    expect(a.style.getPropertyValue('--dc-row')).toBe('2 / span 1');
    expect(a.style.getPropertyValue('--dc-h-span')).toBe('span 1');
  });

  it('renders top-level items DOM-sorted by (y, then x), independent of value order', () => {
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const ids = Array.from(container.querySelectorAll('[data-dc-item]')).map((el) =>
      el.getAttribute('data-dc-item'),
    );
    // a: y=1, b: y=0 → b renders before a even though it's second in value.items.
    // c/d live inside their sections and come after. s2 (holding 'd') is
    // collapsed, but Accordion.Content keeps its body mounted (a CSS height
    // animation, not a DOM unmount) — 'd' still renders, inert, last.
    expect(ids).toEqual(['b', 'a', 'c', 'd']);
  });

  it('calls renderItem for every item, including ones in a collapsed section', () => {
    const spy = vi.fn(renderItem);
    render(<DashboardCanvas value={baseValue()} renderItem={spy} />);
    expect(screen.getByTestId('item-a')).toBeInTheDocument();
    expect(screen.getByTestId('item-b')).toBeInTheDocument();
    expect(screen.getByTestId('item-c')).toBeInTheDocument();
    // 'd' belongs to the collapsed section — present (Accordion.Content
    // stays mounted) but inert (see the collapsed-section a11y test below).
    expect(screen.getByTestId('item-d')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls.map((call) => call[0]).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a collapsed section’s items are inert: not focusable, not a drag/resize surface', () => {
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const d = itemEl(container, 'd');
    expect(d).not.toHaveAttribute('tabindex');
    expect(d).not.toHaveAttribute('role');
    expect(container.querySelector('[data-dc-container="s2"]')).toHaveAttribute('inert');
  });

  it('an expanded section’s container is not inert', () => {
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(container.querySelector('[data-dc-container="s1"]')).not.toHaveAttribute('inert');
  });

  it('renders sections in band (array) order with their titles', () => {
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const sections = Array.from(container.querySelectorAll('[data-dc-section]'));
    expect(sections.map((s) => s.getAttribute('data-dc-section'))).toEqual(['s1', 's2']);
    expect(screen.getByText('Section One')).toBeInTheDocument();
    expect(screen.getByText('Section Two')).toBeInTheDocument();
  });

  it('renders the renderSectionHeader slot per section id', () => {
    render(
      <DashboardCanvas
        value={baseValue()}
        renderItem={renderItem}
        renderSectionHeader={(id) => <button type="button">extra-{id}</button>}
      />,
    );
    expect(screen.getByText('extra-s1')).toBeInTheDocument();
    expect(screen.getByText('extra-s2')).toBeInTheDocument();
  });

  it('exposes the canvas as a labeled group from i18n', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(screen.getByRole('group', { name: 'Dashboard canvas' })).toBeInTheDocument();
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<DashboardCanvas ref={ref} value={baseValue()} renderItem={renderItem} />);
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Dashboard canvas' }));
  });

  it('merges a consumer className with the root class', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} className="custom" />);
    expect(screen.getByRole('group', { name: 'Dashboard canvas' }).className).toContain('custom');
  });

  it('stamps --dc-cols 24 on the root by default', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    expect(root.style.getPropertyValue('--dc-cols')).toBe('24');
  });

  it('stamps the columns prop as --dc-cols and merges a consumer style', () => {
    render(
      <DashboardCanvas
        value={baseValue()}
        renderItem={renderItem}
        columns={12}
        style={{ outline: 'none' }}
      />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    expect(root.style.getPropertyValue('--dc-cols')).toBe('12');
    expect(root.style.outline).toBe('none');
  });

  it('stamps the stackBelow breakpoint class: md by default, the given one otherwise', () => {
    const { rerender } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    expect(root.className).toMatch(/stackMd/);
    rerender(<DashboardCanvas value={baseValue()} renderItem={renderItem} stackBelow="sm" />);
    expect(root.className).toMatch(/stackSm/);
    expect(root.className).not.toMatch(/stackMd/);
    rerender(<DashboardCanvas value={baseValue()} renderItem={renderItem} stackBelow="lg" />);
    expect(root.className).toMatch(/stackLg/);
  });
});

describe('DashboardCanvas section collapse', () => {
  it('a collapse click fires onChange with the section toggled, geometry untouched', async () => {
    const user = userEvent.setup();
    const value = baseValue();
    const onChange = vi.fn();
    render(<DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} />);

    await user.click(screen.getByRole('button', { name: 'Collapse Section One section' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.sections.find((s) => s.id === 's1')?.collapsed).toBe(true);
    // Item geometry is preserved even though the body goes inert.
    expect(next.sections.find((s) => s.id === 's1')?.items).toEqual(value.sections[0].items);
    expect(next.items).toEqual(value.items);
  });

  it('an expand click on a collapsed section fires onChange with collapsed: false', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} />);

    await user.click(screen.getByRole('button', { name: 'Expand Section Two section' }));

    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.sections.find((s) => s.id === 's2')?.collapsed).toBe(false);
  });

  it('collapse toggles fire onChange even in readOnly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} readOnly />,
    );

    await user.click(screen.getByRole('button', { name: 'Collapse Section One section' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(
      (onChange.mock.calls[0][0] as DashboardCanvasValue).sections.find((s) => s.id === 's1')
        ?.collapsed,
    ).toBe(true);
  });

  it('the collapse button reports aria-expanded matching section state', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(screen.getByRole('button', { name: 'Collapse Section One section' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Expand Section Two section' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

// --- pointer gestures (Task 3) ---------------------------------------------
// jsdom reports zero-size rects everywhere, so gesture tests hand every canvas
// surface a deterministic box (Sortable.test.tsx stubStackedRects convention).
// In jsdom the computed grid gap resolves to 0 and the row unit falls back to
// 48px, so a 480px-wide container yields exact 40px columns: cell x =
// floor(px / 40), cell y = floor(py / 48). Containers are found via their
// data-dc-container attribute, section bands via data-dc-section, and items
// derive their box from the inline --dc-col/--dc-row custom properties.
const CONTAINER_RECTS: Record<
  string,
  { left: number; top: number; width: number; height: number }
> = {
  top: { left: 0, top: 0, width: 480, height: 480 },
  s1: { left: 0, top: 600, width: 480, height: 240 },
};
const BAND_RECTS: Record<string, { left: number; top: number; width: number; height: number }> = {
  s1: { left: 0, top: 560, width: 480, height: 280 }, // midpoint y=700
  s2: { left: 0, top: 850, width: 480, height: 40 }, // midpoint y=870
};
const COL_PX = 40;
const ROW_PX = 48;

function toRect(r: { left: number; top: number; width: number; height: number }): DOMRect {
  return {
    x: r.left,
    y: r.top,
    top: r.top,
    left: r.left,
    right: r.left + r.width,
    bottom: r.top + r.height,
    width: r.width,
    height: r.height,
    toJSON() {},
  } as DOMRect;
}

function stubCanvasRects(): () => void {
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const el = this as HTMLElement;
    const item = el.closest?.('[data-dc-item]') as HTMLElement | null;
    if (item) {
      const key = item.closest('[data-dc-container]')?.getAttribute('data-dc-container') ?? 'top';
      const base = CONTAINER_RECTS[key] ?? CONTAINER_RECTS.top;
      const col = /^(\d+) \/ span (\d+)$/.exec(item.style.getPropertyValue('--dc-col'));
      const row = /^(\d+) \/ span (\d+)$/.exec(item.style.getPropertyValue('--dc-row'));
      const x = Number(col?.[1] ?? 1) - 1;
      const w = Number(col?.[2] ?? 1);
      const y = Number(row?.[1] ?? 1) - 1;
      const h = Number(row?.[2] ?? 1);
      return toRect({
        left: base.left + x * COL_PX,
        top: base.top + y * ROW_PX,
        width: w * COL_PX,
        height: h * ROW_PX,
      });
    }
    const containerKey = el.getAttribute?.('data-dc-container');
    if (containerKey && CONTAINER_RECTS[containerKey]) {
      return toRect(CONTAINER_RECTS[containerKey]);
    }
    const bandKey = el.getAttribute?.('data-dc-section');
    if (bandKey && BAND_RECTS[bandKey]) return toRect(BAND_RECTS[bandKey]);
    return toRect({ left: 0, top: 0, width: 1000, height: 1000 });
  };
  return () => {
    Element.prototype.getBoundingClientRect = orig;
  };
}

function itemEl(container: HTMLElement, id: string): HTMLElement {
  return container.querySelector(`[data-dc-item="${id}"]`) as HTMLElement;
}

// Band drag-reorder starts from the section's dedicated grip handle, not the
// header at large — Accordion's toggle button fills the whole header width
// (DashboardCanvasSection's remarks), so there's no other independent
// press-and-drag surface left in the row.
function sectionHandle(container: HTMLElement, id: string): HTMLElement {
  return container.querySelector(
    `[data-dc-section="${id}"] [data-dc-section-handle]`,
  ) as HTMLElement;
}

describe('DashboardCanvas pointer gestures', () => {
  let restoreRects: () => void;
  beforeEach(() => {
    restoreRects = stubCanvasRects();
  });
  afterEach(() => {
    restoreRects();
  });

  // columns={12}: this suite's px math predates #350 — COL_PX=40 is the
  // 12-column cell width of the stubbed 480px container.
  function renderCanvas(props: Partial<Parameters<typeof DashboardCanvas>[0]> = {}) {
    const onChange = vi.fn();
    const value = baseValue();
    const utils = render(
      <DashboardCanvas
        value={value}
        onChange={onChange}
        renderItem={renderItem}
        columns={12}
        {...props}
      />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    return { ...utils, onChange, value, root };
  }

  it('at the default 24 columns a drag snaps per 24th-width cell', () => {
    const { container, onChange, value, root } = renderCanvas({ columns: 24 });
    // 480px container / 24 cols → 20px cells. Grab 'b' at (10,10); origin
    // (85,50) → cell (4,1) — twice the column index the 12-col math yields.
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'top' }, 'b', 4, 1),
    );
  });

  it('a snapped move commits onChange once with the engine applyMove result', () => {
    const { container, onChange, value, root } = renderCanvas();
    // 'b' sits at (0,0,2,1) → rect (0,0,80,48); grab it at (10,10).
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // Ghost origin = pointer - grab offset = (85,50) → cell (2,1).
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'top' }, 'b', 2, 1),
    );
  });

  it('mid-drag renders the engine preview (neighbors reflow) plus a ghost; Escape cancels', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // Origin (165,5) → cell (4,0): 'b' vacates column 0, so 'a' compacts up.
    fireEvent.pointerMove(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(itemEl(container, 'a').style.getPropertyValue('--dc-row')).toBe('1 / span 1');
    expect(itemEl(container, 'b')).toHaveAttribute('data-dc-drop-preview');
    expect(container.querySelector('[data-dc-ghost]')).toBeInTheDocument();
    expect(root).toHaveAttribute('data-dragging');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(itemEl(container, 'a').style.getPropertyValue('--dc-row')).toBe('2 / span 1');
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a drop back on the dragged item’s own cell fires no onChange', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // 7px right arms the drag, but origin (7,0) still snaps to b's own (0,0).
    fireEvent.pointerMove(root, { clientX: 17, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 17, clientY: 10, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a sub-5px pointer move never arms a drag (clicks pass through)', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 14, clientY: 10, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-dragging');
    fireEvent.pointerUp(root, { clientX: 14, clientY: 10, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dragging into a section body commits applyMove into that section', () => {
    const { container, onChange, value, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // Pointer (55,615) is inside s1's body (top 600); origin (45,605) → cell (1,0).
    fireEvent.pointerMove(root, { clientX: 55, clientY: 615, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 55, clientY: 615, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'section', id: 's1' }, 'b', 1, 0),
    );
  });

  it('a collapsed section’s band is not a drop target', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // (50,860) sits on collapsed s2's band — no registered container there, so
    // the drop target stays the container the drag last hovered (top).
    fireEvent.pointerMove(root, { clientX: 50, clientY: 860, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 50, clientY: 860, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DashboardCanvasValue;
    expect(next.sections.find((s) => s.id === 's2')?.items.map((i) => i.id)).toEqual(['d']);
    expect(next.items.map((i) => i.id)).toContain('b');
  });

  it('an SE resize previews live and commits once with the clamped engine result', () => {
    const { container, onChange, value, root } = renderCanvas({
      constraints: { a: { maxH: 1 } },
    });
    const se = container.querySelector('[data-dc-item="a"] [data-dc-resize="se"]') as HTMLElement;
    fireEvent.pointerDown(se, { clientX: 80, clientY: 96, pointerId: 1, button: 0 });
    // +85px → +2 columns, +55px → +1 row: requested 4×2, maxH clamps to 4×1.
    fireEvent.pointerMove(root, { clientX: 165, clientY: 151, pointerId: 1 });
    expect(itemEl(container, 'a').style.getPropertyValue('--dc-col')).toBe('1 / span 4');
    fireEvent.pointerUp(root, { clientX: 165, clientY: 151, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyResize(value, { kind: 'top' }, 'a', 4, 2, { maxH: 1 }),
    );
  });

  it('an E resize changes width only and honors function-form constraints', () => {
    const { container, onChange, value, root } = renderCanvas({
      constraints: (id: string | number) => (id === 'a' ? { minW: 3 } : undefined),
    });
    const e = container.querySelector('[data-dc-item="a"] [data-dc-resize="e"]') as HTMLElement;
    fireEvent.pointerDown(e, { clientX: 80, clientY: 70, pointerId: 1, button: 0 });
    // -80px → -2 columns (requested w=0); vertical travel is ignored on E.
    fireEvent.pointerMove(root, { clientX: 0, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 0, clientY: 130, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyResize(value, { kind: 'top' }, 'a', 0, 1, { minW: 3 }),
    );
  });

  it('a resize that snaps back to the original size fires nothing', () => {
    const { container, onChange, root } = renderCanvas();
    const se = container.querySelector('[data-dc-item="a"] [data-dc-resize="se"]') as HTMLElement;
    fireEvent.pointerDown(se, { clientX: 80, clientY: 96, pointerId: 1, button: 0 });
    fireEvent.pointerMove(root, { clientX: 83, clientY: 98, pointerId: 1 }); // rounds to ±0 cells
    fireEvent.pointerUp(root, { clientX: 83, clientY: 98, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('resize handles never start a move drag (no ghost while resizing)', () => {
    const { container, root } = renderCanvas();
    const se = container.querySelector('[data-dc-item="a"] [data-dc-resize="se"]') as HTMLElement;
    fireEvent.pointerDown(se, { clientX: 80, clientY: 96, pointerId: 1, button: 0 });
    fireEvent.pointerMove(root, { clientX: 165, clientY: 151, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 165, clientY: 151, pointerId: 1 });
  });

  it('dragging a section header shows an insertion indicator and commits reorderSection', () => {
    const { container, onChange, value, root } = renderCanvas();
    fireEvent.pointerDown(sectionHandle(container, 's1'), {
      clientX: 100,
      clientY: 570,
      pointerId: 1,
      button: 0,
    });
    // y=900 is past both band midpoints (700, 870) → insertion slot 2 → index 1.
    fireEvent.pointerMove(root, { clientX: 100, clientY: 900, pointerId: 1 });
    expect(container.querySelector('[data-dc-band-indicator]')).toBeInTheDocument();
    expect(container.querySelector('[data-dc-section="s1"]')).toHaveAttribute('data-dragging');
    fireEvent.pointerUp(root, { clientX: 100, clientY: 900, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(reorderSection(value, 's1', 1));
  });

  it('a band drag dropped back at its own slot fires nothing', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(sectionHandle(container, 's1'), {
      clientX: 100,
      clientY: 570,
      pointerId: 1,
      button: 0,
    });
    // Armed (6px) but still above s1's own midpoint → slot 0 = its own index.
    fireEvent.pointerMove(root, { clientX: 100, clientY: 576, pointerId: 1 });
    expect(container.querySelector('[data-dc-band-indicator]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 100, clientY: 576, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pointerdown on the collapse toggle never starts a band drag', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Collapse Section One section' }), {
      clientX: 10,
      clientY: 570,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 10, clientY: 900, pointerId: 1 });
    expect(container.querySelector('[data-dc-band-indicator]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 10, clientY: 900, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('readOnly renders no resize handles and wires no gestures', () => {
    const { container, onChange, root } = renderCanvas({ readOnly: true });
    expect(container.querySelector('[data-dc-resize]')).not.toBeInTheDocument();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('captures on the never-remounted ROOT once armed, so an outside pointerup after a cross-container move still commits exactly once', () => {
    // jsdom has no setPointerCapture at all — install one to observe receivers.
    const spy = vi.fn();
    (HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture = spy;
    const { container, onChange, value, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // No capture before arming — clicks inside item bodies must pass through.
    expect(spy).not.toHaveBeenCalled();
    // Arms + crosses into s1's body: the item element REMOUNTS here, which
    // would implicitly release capture had it been set on the item.
    fireEvent.pointerMove(root, { clientX: 55, clientY: 615, pointerId: 1 });
    expect(spy.mock.instances).toEqual([root]);
    // Root capture retargets an outside-the-canvas pointerup to the root.
    fireEvent.pointerUp(root, { clientX: 5000, clientY: 5000, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'section', id: 's1' }, 'b', 1, 0),
    );
    expect(root).not.toHaveAttribute('data-dragging');
    delete (HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture;
  });

  it('a controlled value update mid-drag is honored at commit (no cached-preview revert)', () => {
    const onChange = vi.fn();
    const value = baseValue();
    const { container, rerender } = render(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} columns={12} />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 175, clientY: 15, pointerId: 1 }); // cell (4,0)
    const updated: DashboardCanvasValue = {
      ...value,
      items: [...value.items, { id: 'e', x: 6, y: 0, w: 2, h: 1 }],
    };
    rerender(
      <DashboardCanvas value={updated} onChange={onChange} renderItem={renderItem} columns={12} />,
    );
    fireEvent.pointerUp(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(updated, { kind: 'top' }, { kind: 'top' }, 'b', 4, 0),
    );
    expect((onChange.mock.calls[0][0] as DashboardCanvasValue).items.map((i) => i.id)).toContain(
      'e',
    );
  });

  it('a resize whose clamp resolves back to the current size fires nothing', () => {
    const { container, onChange, root } = renderCanvas({ constraints: { a: { minW: 2 } } });
    const e = container.querySelector('[data-dc-item="a"] [data-dc-resize="e"]') as HTMLElement;
    fireEvent.pointerDown(e, { clientX: 80, clientY: 70, pointerId: 1, button: 0 });
    // Requested w=0, but minW clamps it right back to the current 2 columns.
    fireEvent.pointerMove(root, { clientX: 0, clientY: 70, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 0, clientY: 70, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('flipping readOnly on mid-drag aborts the gesture', () => {
    const onChange = vi.fn();
    const value = baseValue();
    const { container, rerender } = render(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).toBeInTheDocument();
    rerender(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} readOnly />,
    );
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pointercancel restores the layout without committing', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).toBeInTheDocument();
    fireEvent.pointerCancel(root, { pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    expect(itemEl(container, 'a').style.getPropertyValue('--dc-row')).toBe('2 / span 1');
    fireEvent.pointerUp(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// --- keyboard editing + announcements (Task 4) ------------------------------
// Pure engine math — no getBoundingClientRect stubs needed: the keyboard paths
// never measure pixels, they step grid cells directly.
describe('DashboardCanvas keyboard editing', () => {
  function renderCanvas(props: Partial<Parameters<typeof DashboardCanvas>[0]> = {}) {
    const onChange = vi.fn();
    const value = baseValue();
    const utils = render(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} {...props} />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    return { ...utils, onChange, value, root, status: screen.getByRole('status') };
  }

  it('edit-mode items are focusable with button semantics and a localized roledescription', () => {
    const { container } = renderCanvas();
    const b = itemEl(container, 'b');
    expect(b).toHaveAttribute('tabindex', '0');
    expect(b).toHaveAttribute('role', 'button');
    expect(b).toHaveAttribute('aria-roledescription', 'widget');
    expect(b.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('a full keyboard move cycle commits once with the engine-equal payload', () => {
    const { container, onChange, value, status } = renderCanvas();
    const b = itemEl(container, 'b');
    b.focus();
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(status).toHaveTextContent('Picked up');
    expect(b).toHaveAttribute('data-dc-picked');
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(status).toHaveTextContent('Moved to column 2, row 1');
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'top' }, 'b', 1, 0),
    );
    expect(status).toHaveTextContent('Dropped');
    expect(itemEl(container, 'b')).not.toHaveAttribute('data-dc-picked');
  });

  it('arrow moves while picked render the live engine preview', () => {
    const { container } = renderCanvas();
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    // The preview IS applyMove's result: b snaps to column 2, a stays put.
    expect(itemEl(container, 'b').style.getPropertyValue('--dc-col')).toBe('2 / span 2');
    expect(itemEl(container, 'a').style.getPropertyValue('--dc-row')).toBe('2 / span 1');
  });

  it('Escape cancels the pick, restores the layout, and fires nothing', () => {
    const { container, onChange, status } = renderCanvas();
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(itemEl(container, 'b').style.getPropertyValue('--dc-col')).toBe('2 / span 2');
    fireEvent.keyDown(b, { key: 'Escape' });
    expect(itemEl(container, 'b').style.getPropertyValue('--dc-col')).toBe('1 / span 2');
    expect(itemEl(container, 'b')).not.toHaveAttribute('data-dc-picked');
    expect(status).toHaveTextContent('Move cancelled');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dropping back on the home cell fires nothing (Space pickup and drop)', () => {
    const { container, onChange } = renderCanvas();
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: ' ' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    fireEvent.keyDown(b, { key: 'ArrowLeft' });
    fireEvent.keyDown(b, { key: ' ' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Shift+ArrowRight resizes one column per keypress, committing each time', () => {
    const { container, onChange, value, status } = renderCanvas();
    const a = itemEl(container, 'a');
    fireEvent.keyDown(a, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(applyResize(value, { kind: 'top' }, 'a', 3, 1));
    expect(status).toHaveTextContent('Resized to 3 by 1');
    fireEvent.keyDown(itemEl(container, 'a'), { key: 'ArrowRight', shiftKey: true });
    // Controlled value never re-rendered, so the second press re-requests 3×1.
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('a Shift+arrow resize clamped back to the current size commits nothing but announces the limit', () => {
    const { container, onChange, status } = renderCanvas({ constraints: { a: { minW: 2 } } });
    fireEvent.keyDown(itemEl(container, 'a'), { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(status).toHaveTextContent('Resized to 2 by 1');
  });

  it('ArrowDown past the container bottom carries the pick into the next expanded section', () => {
    const { container, onChange, value, status } = renderCanvas();
    const a = itemEl(container, 'a');
    a.focus();
    fireEvent.keyDown(a, { key: 'Enter' });
    // a sits at (0,1); the only other top-level item ends at row 1, so one
    // ArrowDown steps past the bottom and enters Section One at y=0.
    fireEvent.keyDown(a, { key: 'ArrowDown' });
    expect(status).toHaveTextContent('Entered the Section One section');
    // The cross-container preview remounts the item — focus is reclaimed.
    expect(document.activeElement).toBe(itemEl(container, 'a'));
    fireEvent.keyDown(itemEl(container, 'a'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'section', id: 's1' }, 'a', 0, 0),
    );
  });

  it('ArrowUp at the top row carries the pick into the container above, entering at its bottom', () => {
    const { container, onChange, value, status } = renderCanvas();
    const c = itemEl(container, 'c');
    fireEvent.keyDown(c, { key: 'Enter' });
    fireEvent.keyDown(c, { key: 'ArrowUp' });
    expect(status).toHaveTextContent('Moved to the top level');
    fireEvent.keyDown(itemEl(container, 'c'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    // Top-level content ends at row 2 (item a), so c enters at y=2.
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'section', id: 's1' }, { kind: 'top' }, 'c', 0, 2),
    );
  });

  it('ArrowDown with only a collapsed section below clamps instead of entering it', () => {
    const { container, onChange, status } = renderCanvas();
    const c = itemEl(container, 'c');
    fireEvent.keyDown(c, { key: 'Enter' });
    // s2 (below s1) is collapsed — not a keyboard target, mirroring pointer.
    fireEvent.keyDown(c, { key: 'ArrowDown' });
    expect(status).toHaveTextContent('Moved to column 1, row 1');
    expect(status).not.toHaveTextContent('Entered');
    fireEvent.keyDown(c, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Shift+ArrowDown on a section toggle commits reorderSection and announces the new position', () => {
    const { onChange, value, status } = renderCanvas();
    const toggle = screen.getByRole('button', { name: 'Collapse Section One section' });
    toggle.focus();
    fireEvent.keyDown(toggle, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(reorderSection(value, 's1', 1));
    expect(status).toHaveTextContent('Section One section moved to position 2');
  });

  it('Shift+ArrowUp on the first band is a clamped no-op', () => {
    const { onChange, status } = renderCanvas();
    const toggle = screen.getByRole('button', { name: 'Collapse Section One section' });
    fireEvent.keyDown(toggle, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(status).toHaveTextContent('');
  });

  it('wires the visually-hidden instructions via aria-describedby, merging a consumer value', () => {
    const { container, root, rerender, onChange, value } = renderCanvas({
      'aria-describedby': 'ext',
    });
    const ids = (root.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids).toContain('ext');
    const instructionsEl = document.getElementById(ids.find((id) => id !== 'ext') as string);
    expect(instructionsEl).toHaveTextContent('pick it up');
    // Items reference the same instructions block.
    expect(itemEl(container, 'b')).toHaveAttribute('aria-describedby', instructionsEl?.id);
    rerender(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} readOnly />,
    );
    expect(instructionsEl).not.toHaveTextContent('pick it up');
  });

  it('an external value change mid-pick cancels the pick and keeps the canvas editable', () => {
    const onChange = vi.fn();
    const value = baseValue();
    const { container, rerender } = render(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} />,
    );
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(itemEl(container, 'b').style.getPropertyValue('--dc-col')).toBe('2 / span 2');
    // The consumer deletes the picked item out from under the pick.
    const updated: DashboardCanvasValue = {
      ...value,
      items: value.items.filter((item) => item.id !== 'b'),
    };
    rerender(<DashboardCanvas value={updated} onChange={onChange} renderItem={renderItem} />);
    // No stale preview: the deleted item is gone, the pick is cancelled...
    expect(container.querySelector('[data-dc-item="b"]')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Move cancelled');
    // ...and the canvas is not locked: another item can be picked up.
    fireEvent.keyDown(itemEl(container, 'a'), { key: 'Enter' });
    expect(itemEl(container, 'a')).toHaveAttribute('data-dc-picked');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('focus leaving the picked item cancels the pick', () => {
    const { container, onChange, status } = renderCanvas();
    const b = itemEl(container, 'b');
    b.focus();
    fireEvent.keyDown(b, { key: 'Enter' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    fireEvent.blur(b); // Tab-away
    expect(itemEl(container, 'b')).not.toHaveAttribute('data-dc-picked');
    expect(itemEl(container, 'b').style.getPropertyValue('--dc-col')).toBe('1 / span 2');
    expect(status).toHaveTextContent('Move cancelled');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pointer gestures are inert while an item is picked', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.keyDown(itemEl(container, 'b'), { key: 'Enter' });
    fireEvent.pointerDown(itemEl(container, 'a'), {
      clientX: 10,
      clientY: 60,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 200, clientY: 200, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-dragging');
    fireEvent.pointerUp(root, { clientX: 200, clientY: 200, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a picked item’s requested x clamps at the columns bound (#350)', () => {
    const value: DashboardCanvasValue = {
      items: [{ id: 'e', x: 10, y: 0, w: 2, h: 1 }],
      sections: [],
    };
    const { container } = render(
      <DashboardCanvas value={value} onChange={vi.fn()} renderItem={renderItem} columns={12} />,
    );
    const e = itemEl(container, 'e');
    fireEvent.keyDown(e, { key: 'Enter' });
    fireEvent.keyDown(e, { key: 'ArrowRight' });
    // x + w is already at 12 — the request clamps back to column 11 (1-based).
    expect(itemEl(container, 'e').style.getPropertyValue('--dc-col')).toBe('11 / span 2');
  });

  it('the same item keeps moving right under the default 24 columns (#350)', () => {
    const value: DashboardCanvasValue = {
      items: [{ id: 'e', x: 10, y: 0, w: 2, h: 1 }],
      sections: [],
    };
    const { container } = render(
      <DashboardCanvas value={value} onChange={vi.fn()} renderItem={renderItem} />,
    );
    const e = itemEl(container, 'e');
    fireEvent.keyDown(e, { key: 'Enter' });
    fireEvent.keyDown(e, { key: 'ArrowRight' });
    expect(itemEl(container, 'e').style.getPropertyValue('--dc-col')).toBe('12 / span 2');
  });

  it('a keyboard resize clamps w to the columns remaining right of x (#350)', () => {
    const value: DashboardCanvasValue = {
      items: [{ id: 'e', x: 10, y: 0, w: 2, h: 1 }],
      sections: [],
    };
    const onChange = vi.fn();
    const { container } = render(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} columns={12} />,
    );
    fireEvent.keyDown(itemEl(container, 'e'), { key: 'ArrowRight', shiftKey: true });
    // Clamped back to the current 2 columns — no commit, limit announced.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Resized to 2 by 1');
  });

  it('readOnly items are not keyboard-editable, but collapse toggles keep working', async () => {
    const user = userEvent.setup();
    const { container, onChange } = renderCanvas({ readOnly: true });
    const b = itemEl(container, 'b');
    expect(b).not.toHaveAttribute('tabindex');
    expect(b).not.toHaveAttribute('role');
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(b).not.toHaveAttribute('data-dc-picked');
    fireEvent.keyDown(b, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Collapse Section One section' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// --- below-md single-column stacking + narrow editing gate (Task 5) --------
// The @container reflow itself is browser-land (jsdom doesn't evaluate
// container queries) — validated visually in Task 7. These tests cover the
// JS-side editing gate: a ResizeObserver mirror of the CSS breakpoint
// (FlowCanvas ResizeObserver-mock precedent, FlowCanvas.test.tsx:928-940).
describe('DashboardCanvas below-md editing gate', () => {
  interface ObserverEntry {
    cb: ResizeObserverCallback;
    targets: Element[];
  }

  function stubResizeObserver(): ObserverEntry[] {
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
    return observers;
  }

  function fireWidth(observers: ObserverEntry[], root: Element, width: number) {
    act(() => {
      for (const o of observers.filter((entry) => entry.targets.includes(root))) {
        o.cb(
          [{ contentRect: { width } } as ResizeObserverEntry],
          null as unknown as ResizeObserver,
        );
      }
    });
  }

  let restoreRects: () => void;
  beforeEach(() => {
    restoreRects = stubCanvasRects();
  });
  afterEach(() => {
    restoreRects();
    vi.unstubAllGlobals();
  });

  it('carries the always-on container class on the root regardless of width', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    // container-type: inline-size lives on `.canvas` itself, unconditionally.
    expect(root.className).toMatch(/canvas/);
  });

  it('a width below 640px sets data-narrow and turns off pointer editing', () => {
    const observers = stubResizeObserver();
    const onChange = vi.fn();
    const { container } = render(
      <DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    expect(root).not.toHaveAttribute('data-narrow');
    fireWidth(observers, root, 400);
    expect(root).toHaveAttribute('data-narrow');
    expect(container.querySelector('[data-dc-resize]')).not.toBeInTheDocument();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a width of exactly 640px goes narrow (matches the CSS max-width: 640px, inclusive)', () => {
    const observers = stubResizeObserver();
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 640);
    expect(root).toHaveAttribute('data-narrow');
  });

  it('a zero-width report (unmeasured/hidden mount) stays wide, not narrow', () => {
    const observers = stubResizeObserver();
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 0);
    expect(root).not.toHaveAttribute('data-narrow');
  });

  it('collapse toggles still fire onChange while narrow', async () => {
    const user = userEvent.setup();
    const observers = stubResizeObserver();
    const onChange = vi.fn();
    render(<DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 400);
    await user.click(screen.getByRole('button', { name: 'Collapse Section One section' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('going narrow mid-drag aborts the gesture without committing', () => {
    const observers = stubResizeObserver();
    const onChange = vi.fn();
    const { container } = render(
      <DashboardCanvas value={baseValue()} onChange={onChange} renderItem={renderItem} />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).toBeInTheDocument();
    fireWidth(observers, root, 400);
    expect(container.querySelector('[data-dc-ghost]')).not.toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 175, clientY: 15, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('narrow items are not keyboard-editable, and the instructions switch to the readOnly variant', () => {
    const observers = stubResizeObserver();
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    const ids = (root.getAttribute('aria-describedby') ?? '').split(' ');
    const instructionsEl = document.getElementById(ids[0]);
    expect(instructionsEl).toHaveTextContent('pick it up');
    fireWidth(observers, root, 400);
    const b = itemEl(container, 'b');
    expect(b).not.toHaveAttribute('tabindex');
    expect(b).not.toHaveAttribute('role');
    expect(instructionsEl).not.toHaveTextContent('pick it up');
  });

  it('widening back past 640px re-enables pointer editing', () => {
    const observers = stubResizeObserver();
    const { container } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 400);
    fireWidth(observers, root, 800);
    expect(root).not.toHaveAttribute('data-narrow');
    expect(container.querySelector('[data-dc-resize]')).not.toBeNull();
  });

  it('stackBelow="lg" raises the gate to 768px inclusive (#350)', () => {
    const observers = stubResizeObserver();
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} stackBelow="lg" />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 700); // wide under md, narrow under lg
    expect(root).toHaveAttribute('data-narrow');
    fireWidth(observers, root, 768);
    expect(root).toHaveAttribute('data-narrow');
    fireWidth(observers, root, 769);
    expect(root).not.toHaveAttribute('data-narrow');
  });

  it('stackBelow="sm" lowers the gate to 480px inclusive (#350)', () => {
    const observers = stubResizeObserver();
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} stackBelow="sm" />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 500); // narrow under the default md, wide under sm
    expect(root).not.toHaveAttribute('data-narrow');
    fireWidth(observers, root, 480);
    expect(root).toHaveAttribute('data-narrow');
  });

  it('changing stackBelow re-evaluates the gate at the current width (#350)', () => {
    const observers = stubResizeObserver();
    const { rerender } = render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireWidth(observers, root, 700);
    expect(root).not.toHaveAttribute('data-narrow');
    rerender(<DashboardCanvas value={baseValue()} renderItem={renderItem} stackBelow="lg" />);
    // The re-created observer re-reports the current width on observe().
    fireWidth(observers, root, 700);
    expect(root).toHaveAttribute('data-narrow');
  });
});

// --- empty sections: droppable body + drop affordance (#353) ---------------
describe('DashboardCanvas empty sections (#353)', () => {
  function emptyValue(): DashboardCanvasValue {
    return {
      items: [
        { id: 'a', x: 0, y: 1, w: 2, h: 1 },
        { id: 'b', x: 0, y: 0, w: 2, h: 1 },
      ],
      sections: [{ id: 's1', title: 'Section One', collapsed: false, items: [] }],
    };
  }

  let restoreRects: () => void;
  beforeEach(() => {
    restoreRects = stubCanvasRects();
  });
  afterEach(() => {
    restoreRects();
  });

  function renderCanvas(props: Partial<Parameters<typeof DashboardCanvas>[0]> = {}) {
    const onChange = vi.fn();
    const value = emptyValue();
    const utils = render(
      <DashboardCanvas
        value={value}
        onChange={onChange}
        renderItem={renderItem}
        columns={12}
        {...props}
      />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    return { ...utils, onChange, value, root };
  }

  it('stamps data-dc-empty on an empty container, not on a populated one', () => {
    const { container } = renderCanvas();
    expect(container.querySelector('[data-dc-container="s1"]')).toHaveAttribute('data-dc-empty');
    expect(container.querySelector('[data-dc-container="top"]')).not.toHaveAttribute(
      'data-dc-empty',
    );
  });

  it('a single-jump pointer drag into the empty section commits applyMove into it', () => {
    const { container, onChange, value, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    // Pointer (55,615) is inside s1's body rect; origin (45,605) → cell (1,0).
    fireEvent.pointerMove(root, { clientX: 55, clientY: 615, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 55, clientY: 615, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'section', id: 's1' }, 'b', 1, 0),
    );
  });

  it('a slow multi-step drag into the empty section commits the same move', () => {
    const { container, onChange, value, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    for (const y of [60, 200, 400, 590, 615]) {
      fireEvent.pointerMove(root, { clientX: 55, clientY: y, pointerId: 1 });
    }
    fireEvent.pointerUp(root, { clientX: 55, clientY: 615, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'section', id: 's1' }, 'b', 1, 0),
    );
  });

  it('keyboard arrow-crossing enters the empty section and drops into it', () => {
    const { container, onChange, value } = renderCanvas();
    const a = itemEl(container, 'a');
    a.focus();
    fireEvent.keyDown(a, { key: 'Enter' });
    // a sits at (0,1); the other top item ends at row 1, so one ArrowDown
    // steps past the bottom and enters the empty Section One at y=0.
    fireEvent.keyDown(a, { key: 'ArrowDown' });
    expect(screen.getByRole('status')).toHaveTextContent('Entered the Section One section');
    fireEvent.keyDown(itemEl(container, 'a'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(
      applyMove(value, { kind: 'top' }, { kind: 'section', id: 's1' }, 'a', 0, 0),
    );
  });

  it('shows the drop hint in the empty section only while a move drag is armed', () => {
    const { container, root } = renderCanvas();
    expect(screen.queryByText('Drop widgets here')).not.toBeInTheDocument();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 }); // arms, stays in top
    expect(screen.getByText('Drop widgets here')).toBeInTheDocument();
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(screen.queryByText('Drop widgets here')).not.toBeInTheDocument();
  });

  it('shows the drop hint during a keyboard pick, and never in readOnly', () => {
    const { container, rerender, onChange, value } = renderCanvas();
    fireEvent.keyDown(itemEl(container, 'b'), { key: 'Enter' });
    expect(screen.getByText('Drop widgets here')).toBeInTheDocument();
    fireEvent.keyDown(itemEl(container, 'b'), { key: 'Escape' });
    expect(screen.queryByText('Drop widgets here')).not.toBeInTheDocument();
    rerender(
      <DashboardCanvas
        value={value}
        onChange={onChange}
        renderItem={renderItem}
        columns={12}
        readOnly
      />,
    );
    expect(screen.queryByText('Drop widgets here')).not.toBeInTheDocument();
  });
});

// --- snap-dot field wiring (#356) ------------------------------------------
// jsdom never computes CSS-module styles, so the both-lattices dot field is
// asserted at the source level: four gradient layers (start/end × both axes)
// plus the −gap/2 field shift that keeps every dot an unclipped full circle.
describe('DashboardCanvas snap-dot field (#356)', () => {
  const scss = readFileSync(resolve(import.meta.dirname, './DashboardCanvas.module.scss'), 'utf8');
  const dotRule = /background-image:[^;]+;/.exec(scss)?.[0] ?? '';

  it('paints four dot layers: cell start and cell end on both axes', () => {
    expect(dotRule.match(/dc-dot\(/g)).toHaveLength(4);
    expect(scss).toContain('$start: calc(var(--dashboard-canvas-gap) / 2)');
    expect(scss).toContain('$end: calc(100% - var(--dashboard-canvas-gap) / 2)');
    expect(dotRule).toContain('dc-dot($start, $start)');
    expect(dotRule).toContain('dc-dot($end, $start)');
    expect(dotRule).toContain('dc-dot($start, $end)');
    expect(dotRule).toContain('dc-dot($end, $end)');
  });

  it('shifts the field by -gap/2 so lattice dots align with cell edges', () => {
    expect(scss).toMatch(
      /background-position:\s*calc\(var\(--dashboard-canvas-gap\) \/ -2\)\s*calc\(var\(--dashboard-canvas-gap\) \/ -2\)/,
    );
  });
});

// #362 — a Modal opened from inside renderItem portals to document.body, but
// its events bubble through the REACT tree into the item/root handlers, so
// without gating the canvas drags behind the open backdrop. Two layers under
// test: the DOM-containment guard (portal-bubbled events never arm) and the
// overlay-stack gate (no arming under an open Modal/Drawer/Lightbox, and an
// overlay opening mid-gesture aborts it).
describe('DashboardCanvas overlay & portal gating (#362)', () => {
  let restoreRects: () => void;
  beforeEach(() => {
    restoreRects = stubCanvasRects();
  });
  afterEach(() => {
    restoreRects();
    act(() => {
      overlayStack.unregister('test-overlay');
    });
  });

  function renderCanvas(props: Partial<Parameters<typeof DashboardCanvas>[0]> = {}) {
    const onChange = vi.fn();
    const utils = render(
      <DashboardCanvas
        value={baseValue()}
        onChange={onChange}
        renderItem={renderItem}
        columns={12}
        {...props}
      />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    return { ...utils, onChange, root };
  }

  it('a pointerdown bubbled from a portal inside renderItem never arms a drag', () => {
    const portalRenderItem = (id: string | number) => (
      <div data-testid={`item-${id}`}>
        {id}
        {id === 'b' && createPortal(<div data-testid="portal-surface" />, document.body)}
      </div>
    );
    const { container, onChange, root } = renderCanvas({ renderItem: portalRenderItem });
    fireEvent.pointerDown(screen.getByTestId('portal-surface'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).toBeNull();
    expect(root).not.toHaveAttribute('data-dragging');
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('portal-bubbled moves never promote a pending press into a drag', () => {
    const portalRenderItem = (id: string | number) => (
      <div data-testid={`item-${id}`}>
        {id}
        {id === 'b' && createPortal(<div data-testid="portal-surface" />, document.body)}
      </div>
    );
    const { container, onChange, root } = renderCanvas({ renderItem: portalRenderItem });
    // Legit press on the item itself, then the move stream arrives portal-
    // bubbled (an overlay opened on the press, before the 5px threshold).
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByTestId('portal-surface'), {
      clientX: 95,
      clientY: 60,
      pointerId: 1,
    });
    expect(container.querySelector('[data-dc-ghost]')).toBeNull();
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not arm a pointer drag while a blocking overlay is open above the canvas', () => {
    const { container, onChange, root } = renderCanvas();
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).toBeNull();
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not arm a keyboard pick or resize while a blocking overlay is open', () => {
    const { container, onChange } = renderCanvas();
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(b).not.toHaveAttribute('data-dc-picked');
    fireEvent.keyDown(b, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a canvas rendered INSIDE an open overlay portal keeps editing', () => {
    const onChange = vi.fn();
    const { container } = render(
      <div data-modal-portal-root="">
        <DashboardCanvas
          value={baseValue()}
          onChange={onChange}
          renderItem={renderItem}
          columns={12}
        />
      </div>,
    );
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('an overlay opening mid-drag aborts the gesture without committing', () => {
    const { container, onChange, root } = renderCanvas();
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeNull();
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    expect(container.querySelector('[data-dc-ghost]')).toBeNull();
    expect(root).not.toHaveAttribute('data-dragging');
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not reorder a section via Shift+Arrow while a blocking overlay is open', () => {
    const { onChange } = renderCanvas();
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Collapse Section One section' }), {
      key: 'ArrowDown',
      shiftKey: true,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('an overlay opening mid-pick cancels the pick', () => {
    const { container } = renderCanvas();
    const b = itemEl(container, 'b');
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(b).toHaveAttribute('data-dc-picked');
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    expect(itemEl(container, 'b')).not.toHaveAttribute('data-dc-picked');
  });

  it('an overlay CLOSING mid-drag does not abort the gesture', () => {
    act(() => {
      overlayStack.register('test-overlay', 'overlay');
    });
    // Canvas inside the overlay portal so editing is allowed while it's open.
    const onChange = vi.fn();
    const { container } = render(
      <div data-modal-portal-root="">
        <DashboardCanvas
          value={baseValue()}
          onChange={onChange}
          renderItem={renderItem}
          columns={12}
        />
      </div>,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    fireEvent.pointerDown(itemEl(container, 'b'), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerMove(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeNull();
    act(() => {
      overlayStack.unregister('test-overlay');
    });
    expect(container.querySelector('[data-dc-ghost]')).not.toBeNull();
    fireEvent.pointerUp(root, { clientX: 95, clientY: 60, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
