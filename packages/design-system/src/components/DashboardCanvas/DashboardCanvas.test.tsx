import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    // c/d live inside their sections and come after.
    expect(ids).toEqual(['b', 'a', 'c']); // s2 is collapsed, so 'd' is unmounted.
  });

  it('calls renderItem exactly once per visible item id', () => {
    render(<DashboardCanvas value={baseValue()} renderItem={renderItem} />);
    expect(screen.getByTestId('item-a')).toBeInTheDocument();
    expect(screen.getByTestId('item-b')).toBeInTheDocument();
    expect(screen.getByTestId('item-c')).toBeInTheDocument();
    // 'd' belongs to the collapsed section — its body is unmounted.
    expect(screen.queryByTestId('item-d')).not.toBeInTheDocument();
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
    // Item geometry is preserved even though the body unmounts.
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

describe('DashboardCanvas pointer gestures', () => {
  let restoreRects: () => void;
  beforeEach(() => {
    restoreRects = stubCanvasRects();
  });
  afterEach(() => {
    restoreRects();
  });

  function renderCanvas(props: Partial<Parameters<typeof DashboardCanvas>[0]> = {}) {
    const onChange = vi.fn();
    const value = baseValue();
    const utils = render(
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} {...props} />,
    );
    const root = screen.getByRole('group', { name: 'Dashboard canvas' });
    return { ...utils, onChange, value, root };
  }

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
    fireEvent.pointerDown(screen.getByText('Section One'), {
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
    fireEvent.pointerDown(screen.getByText('Section One'), {
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
      <DashboardCanvas value={value} onChange={onChange} renderItem={renderItem} />,
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
    rerender(<DashboardCanvas value={updated} onChange={onChange} renderItem={renderItem} />);
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
