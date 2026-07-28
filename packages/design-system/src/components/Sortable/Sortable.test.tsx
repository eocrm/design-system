import { createRef, type CSSProperties } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sortable, restrictTransformToRect } from './Sortable';

describe('Sortable', () => {
  it('renders <ol> with items as <li> elements', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">A</Sortable.Item>
        <Sortable.Item id="b">B</Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('forwards ref to the underlying <ol>', () => {
    const ref = createRef<HTMLOListElement>();
    render(
      <Sortable ref={ref}>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('OL');
  });

  it('Item forwards ref to the underlying <li>', () => {
    const ref = createRef<HTMLLIElement>();
    render(
      <Sortable>
        <Sortable.Item ref={ref} id="a">
          A
        </Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('LI');
  });

  it('Handle forwards ref to the underlying <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle ref={ref}>handle</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('BUTTON');
  });

  it('merges consumer className on root and Items', () => {
    const { container } = render(
      <Sortable className="custom-ol">
        <Sortable.Item id="a" className="custom-li">
          A
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('ol')?.className).toContain('custom-ol');
    expect(container.querySelector('li')?.className).toContain('custom-li');
  });

  it('accepts both string and number for Item id', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id={1}>One</Sortable.Item>
        <Sortable.Item id="two">Two</Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('Item renders consumer children inside the <li>', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <span data-testid="content">hello</span>
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('li [data-testid="content"]')?.textContent).toBe('hello');
  });

  it('Handle renders <button type="button"> with default aria-label "Reorder item"', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    const handle = container.querySelector('button[data-sortable-handle="true"]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('type')).toBe('button');
    expect(handle?.getAttribute('aria-label')).toBe('Reorder item');
  });

  it('Handle aria-label is overridable', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle aria-label="Reorder card A">h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    expect(
      container.querySelector('[data-sortable-handle="true"]')?.getAttribute('aria-label'),
    ).toBe('Reorder card A');
  });

  it('with Handle present: <li> does not get tabIndex or role from dnd-kit', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    const li = container.querySelector('li');
    expect(li?.getAttribute('tabIndex')).toBeNull();
    expect(li?.getAttribute('role')).toBeNull();
  });

  it('without Handle: <li> is focusable (tabIndex=0) for keyboard reorder', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const li = container.querySelector('li');
    expect(li?.getAttribute('tabIndex')).toBe('0');
  });

  it('throws when Sortable.Handle is rendered outside a Sortable.Item', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Sortable.Handle>orphan</Sortable.Handle>)).toThrow(
      /must be rendered inside a <Sortable.Item>/,
    );
    consoleError.mockRestore();
  });

  it('at rest renders one <li> per item and no DragOverlay clone', () => {
    // DragOverlay only renders content during an active drag. With no drag in
    // progress it renders null, so each item's content appears exactly once
    // (in its <li>) — there is no second, overlay copy in the DOM.
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <span data-testid="content">Alpha</span>
        </Sortable.Item>
        <Sortable.Item id="b">
          <span data-testid="content">Beta</span>
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    // No overlay clone at rest — exactly one node per item content.
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(2);
    // The lifted-overlay marker is never present without an active drag.
    expect(container.querySelectorAll('[data-dragging="true"]')).toHaveLength(0);
  });

  it('renders empty list (no items) without crashing', () => {
    const { container } = render(<Sortable>{null}</Sortable>);
    expect(container.querySelector('ol')).not.toBeNull();
  });

  it('renders without console warnings under default props', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
        <Sortable.Item id="b">B</Sortable.Item>
      </Sortable>,
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('renders with restrictToContainer={false} (free drag) without crashing', () => {
    const { container } = render(
      <Sortable restrictToContainer={false}>
        <Sortable.Item id="a">A</Sortable.Item>
        <Sortable.Item id="b">B</Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('forwards ref to the <ol> with restrictToContainer enabled (default)', () => {
    // restrictToContainer merges an internal ref onto the <ol>; the consumer's
    // ref must still resolve to the same node.
    const ref = createRef<HTMLOListElement>();
    render(
      <Sortable ref={ref}>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('OL');
  });
});

// dnd-kit's KeyboardSensor + sortableKeyboardCoordinates resolve the next drop
// target from each item's bounding rect. jsdom reports zero-size rects, so the
// sensor can't find a neighbour. Hand each <li> a STABLE box derived from its
// DOM index (a vertical stack) — stable per element, because rectSortingStrategy
// re-measures every item and a stateful counter would return a different rect on
// each call for the same node. Descendants (the Handle button) inherit their
// <li>'s rect; everything else gets a large container rect. Coordinate
// resolution is strategy-independent, so ArrowDown resolves the same in a grid.
function stubStackedRects(): () => void {
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const li = (this as Element).closest?.('li');
    if (li?.parentElement) {
      const i = Array.prototype.indexOf.call(li.parentElement.children, li);
      const top = i * 50;
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        right: 100,
        bottom: top + 40,
        width: 100,
        height: 40,
        toJSON() {},
      } as DOMRect;
    }
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      toJSON() {},
    } as DOMRect;
  };
  return () => {
    Element.prototype.getBoundingClientRect = orig;
  };
}

describe('Sortable grid arrangement (#316)', () => {
  it('defaults to the list arrangement (backward-compatible)', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = container.querySelector('ol')!;
    expect(ol.className).toMatch(/list/);
    expect(ol.className).not.toMatch(/grid/);
    // No column template injected in list mode.
    expect(ol.style.getPropertyValue('--sortable-columns')).toBe('');
  });

  it('arrangement="grid" swaps the <ol> to the grid class and injects 12 columns by default', () => {
    const { container } = render(
      <Sortable arrangement="grid">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = container.querySelector('ol')!;
    expect(ol.className).toMatch(/grid/);
    expect(ol.className).not.toMatch(/list/);
    expect(ol.style.getPropertyValue('--sortable-columns')).toBe('12');
  });

  it('columns overrides the injected track count', () => {
    const { container } = render(
      <Sortable arrangement="grid" columns={4}>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(
      (container.querySelector('ol') as HTMLElement).style.getPropertyValue('--sortable-columns'),
    ).toBe('4');
  });

  it('merges consumer style with --sortable-columns; the injected value wins', () => {
    const { container } = render(
      <Sortable
        arrangement="grid"
        columns={6}
        style={{ backgroundColor: 'red', ['--sortable-columns' as string]: '99' } as CSSProperties}
      >
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = container.querySelector('ol') as HTMLElement;
    expect(ol.style.backgroundColor).toBe('red');
    expect(ol.style.getPropertyValue('--sortable-columns')).toBe('6');
  });

  it.each([
    [undefined, 'auto'],
    [2, 'span 2'],
    ['25%', 'span 3'],
    ['33%', 'span 4'],
    ['50%', 'span 6'],
    ['67%', 'span 8'],
    ['75%', 'span 9'],
    ['100%', '1 / -1'],
    ['full', '1 / -1'],
  ] as const)('Item span=%s stamps --sortable-item-span: %s on the <li>', (span, expected) => {
    const { container } = render(
      <Sortable arrangement="grid">
        <Sortable.Item id="a" span={span}>
          A
        </Sortable.Item>
      </Sortable>,
    );
    expect(
      (container.querySelector('li') as HTMLElement).style.getPropertyValue('--sortable-item-span'),
    ).toBe(expected);
  });

  it('a span-less Item stamps auto so it never inherits a spanned ancestor', () => {
    const { container } = render(
      <Sortable arrangement="grid">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(
      (container.querySelector('li') as HTMLElement).style.getPropertyValue('--sortable-item-span'),
    ).toBe('auto');
  });

  it('keeps handle-only drag semantics in grid mode (<li> gets no dnd-kit role/tabIndex)', () => {
    const { container } = render(
      <Sortable arrangement="grid">
        <Sortable.Item id="a" span="50%">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    const li = container.querySelector('li');
    expect(li?.getAttribute('tabIndex')).toBeNull();
    expect(li?.getAttribute('role')).toBeNull();
    // The Handle still wires the drag activator.
    expect(container.querySelector('[data-sortable-handle="true"]')).not.toBeNull();
  });

  it('without a Handle the grid <li> is keyboard-focusable (tabIndex=0)', () => {
    const { container } = render(
      <Sortable arrangement="grid">
        <Sortable.Item id="a" span="50%">
          A
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('li')?.getAttribute('tabIndex')).toBe('0');
  });

  it('fires onReorder with the correct from/to for a keyboard drag in a grid', async () => {
    // Two items so the drop target is unambiguous (the only neighbour is
    // index 1) — dnd-kit's closestCenter picks it deterministically. The
    // from/to mapping is `itemIds.indexOf`, identical to list mode; this
    // asserts it still resolves under the grid strategy + closestCenter.
    const restore = stubStackedRects();
    const onReorder = vi.fn();
    const user = userEvent.setup();
    render(
      <Sortable arrangement="grid" columns={12} onReorder={onReorder}>
        <Sortable.Item id="a" span="50%">
          <Sortable.Handle aria-label="Reorder A">ha</Sortable.Handle>A
        </Sortable.Item>
        <Sortable.Item id="b" span="50%">
          <Sortable.Handle aria-label="Reorder B">hb</Sortable.Handle>B
        </Sortable.Item>
      </Sortable>,
    );

    screen.getByLabelText('Reorder A').focus();
    await user.keyboard('[Space]'); // pick up "a"
    await user.keyboard('[ArrowDown]'); // move past "b"
    await user.keyboard('[Space]'); // drop

    restore();

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith({ id: 'a', from: 0, to: 1 });
  });
});

describe('Sortable collapseBelow (#318)', () => {
  it('string form adds collapsible + collapse class on the grid <ol>', () => {
    render(
      <Sortable arrangement="grid" collapseBelow="md" data-testid="ol">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.className).toMatch(/collapsible/);
    expect(ol.className).toMatch(/collapseMd/);
  });

  it('map form adds step classes, injects step templates, items stamp clamped spans', () => {
    render(
      <Sortable arrangement="grid" collapseBelow={{ md: 6, sm: 1 }} data-testid="ol">
        <Sortable.Item id="a" span="75%" data-testid="wide">
          A
        </Sortable.Item>
        <Sortable.Item id="b" span={3} data-testid="narrow">
          B
        </Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.className).toMatch(/stepMd/);
    expect(ol.className).toMatch(/stepSm/);
    expect(ol.style.getPropertyValue('--sortable-columns-md')).toBe('repeat(6, minmax(0, 1fr))');
    const wide = screen.getByTestId('wide');
    expect(wide.style.getPropertyValue('--sortable-item-span-md')).toBe('1 / -1');
    expect(wide.style.getPropertyValue('--sortable-item-span-sm')).toBe('1 / -1');
    const narrow = screen.getByTestId('narrow');
    expect(narrow.style.getPropertyValue('--sortable-item-span-md')).toBe('span 3');
  });

  // Same mechanism guard as Grid's: jsdom can't evaluate `@container`, so the
  // regression test is that the size container is an ANCESTOR of the <ol> for
  // the map form (a query can never restyle its own container) and the <ol>
  // itself for the string form (those rules only touch `> *`).
  it('map form renders the size-container wrapper AROUND the <ol>, not on it', () => {
    render(
      <Sortable arrangement="grid" collapseBelow={{ md: 6, sm: 1 }} data-testid="ol">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.parentElement!.className).toMatch(/stepContainer/);
    expect(ol.className).not.toMatch(/collapsible/);
  });

  it('string form wraps the <ol> in nothing', () => {
    render(
      <Sortable arrangement="grid" collapseBelow="md" data-testid="ol">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(screen.getByTestId('ol').parentElement!.className).not.toMatch(/stepContainer/);
  });

  it('collapseBelow is inert in list arrangement', () => {
    render(
      <Sortable collapseBelow="md" data-testid="ol">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.className).not.toMatch(/collapsible/);
    expect(ol.className).not.toMatch(/collapseMd/);
  });
});

describe('restrictTransformToRect', () => {
  // A 50px-tall, 100px-wide node sitting at (left:10, top:20) inside a
  // 400x300 bounding box anchored at (left:0, top:0).
  const nodeRect = { top: 20, bottom: 70, left: 10, right: 110 };
  const boundingRect = { top: 0, left: 0, width: 400, height: 300 };

  it('returns the transform unchanged when fully within bounds', () => {
    const transform = { x: 5, y: 5, scaleX: 1, scaleY: 1 };
    expect(restrictTransformToRect(transform, nodeRect, boundingRect)).toEqual(transform);
  });

  it('clamps y so the top edge stays at the bound when dragged above', () => {
    // y = -100 would push top to -80 (above boundingRect.top=0). Clamp to keep
    // the top edge at the bound: y = boundingRect.top - nodeRect.top = -20.
    const result = restrictTransformToRect(
      { x: 0, y: -100, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.y).toBe(-20);
    expect(result.x).toBe(0);
  });

  it('clamps y so the bottom edge stays at the bound when dragged below', () => {
    // y = 1000 would push bottom way past 300. Clamp:
    // y = boundingRect.top + height - nodeRect.bottom = 0 + 300 - 70 = 230.
    const result = restrictTransformToRect(
      { x: 0, y: 1000, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.y).toBe(230);
  });

  it('clamps x so the left edge stays at the bound when dragged left', () => {
    // x = -100 would push left to -90 (< boundingRect.left=0). Clamp:
    // x = boundingRect.left - nodeRect.left = 0 - 10 = -10.
    const result = restrictTransformToRect(
      { x: -100, y: 0, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.x).toBe(-10);
    expect(result.y).toBe(0);
  });

  it('clamps x so the right edge stays at the bound when dragged right', () => {
    // x = 1000 would push right past 400. Clamp:
    // x = boundingRect.left + width - nodeRect.right = 0 + 400 - 110 = 290.
    const result = restrictTransformToRect(
      { x: 1000, y: 0, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.x).toBe(290);
  });

  it('preserves scaleX / scaleY untouched', () => {
    const result = restrictTransformToRect(
      { x: 1000, y: 1000, scaleX: 0.5, scaleY: 0.75 },
      nodeRect,
      boundingRect,
    );
    expect(result.scaleX).toBe(0.5);
    expect(result.scaleY).toBe(0.75);
  });
});

// ---------------------------------------------------------------------------
// Drag announcements (#390)
// ---------------------------------------------------------------------------
describe('Sortable — drag announcements', () => {
  it('announces the item’s own text and slot, never its id', async () => {
    const restore = stubStackedRects();
    const user = userEvent.setup();
    render(
      // Grid arrangement so dnd-kit uses closestCenter: list mode's default
      // rectIntersection needs real overlap, which jsdom's stubbed rects can't
      // produce (see the keyboard-reorder test above).
      <Sortable arrangement="grid" columns={12}>
        <Sortable.Item id="lead-1" span="50%">
          <Sortable.Handle aria-label="Reorder first" />
          Call Acme about renewal
        </Sortable.Item>
        <Sortable.Item id="lead-2" span="50%">
          <Sortable.Handle aria-label="Reorder second" />
          Send proposal to Globex
        </Sortable.Item>
      </Sortable>,
    );

    screen.getByLabelText('Reorder first').focus();
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowDown]');
    const live = screen.getByRole('status').textContent ?? '';
    await user.keyboard('[Space]');
    const dropped = screen.getByRole('status').textContent ?? '';
    restore();

    expect(live).toBe('Call Acme about renewal, position 2 of 2.');
    expect(dropped).toBe('Dropped Call Acme about renewal at position 2 of 2.');
    expect(`${live}${dropped}`).not.toMatch(/lead-/);
  });
});

describe('Sortable — announcements with no resolvable target', () => {
  // Rects are NOT stubbed here, so jsdom reports every box as zero and dnd-kit's
  // default rectIntersection matches nothing: `over` is null for the whole drag
  // and never CHANGES, so no `onDragOver` ever fires. That makes this the one
  // place the pick-up announcement survives to be asserted in a list component,
  // and it exercises `drag.droppedNowhere` on release.
  function dragNowhere(handleLabel: string) {
    const grip = screen.getByLabelText(handleLabel);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: 0, clientY: 40 });
  }
  const live = () => screen.getByRole('status').textContent;

  it('announces the pick-up, then that nothing moved', () => {
    render(
      <Sortable>
        <Sortable.Item id="lead-1">
          <Sortable.Handle aria-label="Reorder first" />
          Call Acme about renewal
        </Sortable.Item>
        <Sortable.Item id="lead-2">
          <Sortable.Handle aria-label="Reorder second" />
          Send proposal to Globex
        </Sortable.Item>
      </Sortable>,
    );
    dragNowhere('Reorder first');
    expect(live()).toBe('Picked up Call Acme about renewal.');
    fireEvent.pointerUp(document, { clientX: 0, clientY: 40 });
    expect(live()).toBe('Released Call Acme about renewal. Nothing moved.');
  });

  it('falls back to “the item” when there is no text and no aria-label', () => {
    render(
      <Sortable>
        <Sortable.Item id="lead-1">
          <Sortable.Handle aria-label="Reorder first" />
        </Sortable.Item>
        <Sortable.Item id="lead-2">
          <Sortable.Handle aria-label="Reorder second" />
        </Sortable.Item>
      </Sortable>,
    );
    dragNowhere('Reorder first');
    expect(live()).toBe('Picked up the item.');
    fireEvent.pointerUp(document, { clientX: 0, clientY: 40 });
    expect(live()).toBe('Released the item. Nothing moved.');
  });
});
