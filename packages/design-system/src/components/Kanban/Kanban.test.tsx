import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Kanban, type KanbanMoveEvent } from './Kanban';
import { SortableHandle } from '../Sortable/Sortable';

describe('Kanban', () => {
  it('renders a board region with columns and cards (role="article" only when Handle is present)', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="col-a">
          <Kanban.Card id="card-1">
            <Kanban.Handle aria-label="Drag card 1" />
            Card One
          </Kanban.Card>
          <Kanban.Card id="card-2">Card Two (no handle)</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );

    // Root is a region
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();

    // Card with Handle gets role="article"
    const articles = container.querySelectorAll('[role="article"]');
    expect(articles).toHaveLength(1);

    // Card without Handle does NOT get role="article" (dnd-kit applies role="button")
    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('forwards ref to root <div> with role="region"', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Kanban ref={ref}>
        <Kanban.Column id="col-a">
          <Kanban.Card id="card-1">A</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('role')).toBe('region');
  });

  it('Column forwards ref to its <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Kanban>
        <Kanban.Column ref={ref} id="col-a">
          <Kanban.Card id="card-1">A</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('Card forwards ref to its <div>; role="article" when Handle is present', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Kanban>
        <Kanban.Column id="col-a">
          <Kanban.Card ref={ref} id="card-1">
            <Kanban.Handle aria-label="Drag" />
            Content
          </Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current?.getAttribute('role')).toBe('article');
  });

  it('merges consumer className on root, Column, and Card', () => {
    const { container } = render(
      <Kanban className="custom-board">
        <Kanban.Column id="col-a" className="custom-col">
          <Kanban.Card id="card-1" className="custom-card">
            A
          </Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(container.querySelector('[role="region"]')?.className).toContain('custom-board');
    // Column div
    const allDivs = container.querySelectorAll('div');
    const colDiv = Array.from(allDivs).find((d) => d.className.includes('custom-col'));
    expect(colDiv).not.toBeNull();
    // Card div
    const cardDiv = Array.from(allDivs).find((d) => d.className.includes('custom-card'));
    expect(cardDiv).not.toBeNull();
  });

  it('Column and Card ids accept both string and number', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="string-col">
          <Kanban.Card id="string-card">String id</Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id={42}>
          <Kanban.Card id={99}>Number id</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    // Both columns render — there should be at least 2 column divs inside the region
    const region = container.querySelector('[role="region"]')!;
    expect(region.children.length).toBe(2);
  });

  it('renders an empty Column without crashing', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="empty" />
      </Kanban>,
    );
    expect(container.querySelector('[role="region"]')).not.toBeNull();
  });

  it('renders multiple Columns in source order', () => {
    const { container } = render(
      <Kanban>
        <Kanban.Column id="first">
          <Kanban.Card id="a">A</Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id="second">
          <Kanban.Card id="b">B</Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id="third">
          <Kanban.Card id="c">C</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    const region = container.querySelector('[role="region"]')!;
    expect(region.children).toHaveLength(3);
  });

  it('Kanban.Handle is the same reference as SortableHandle', () => {
    expect(Kanban.Handle).toBe(SortableHandle);
  });

  it('renders without console warnings under default props with Handles', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Kanban>
        <Kanban.Column id="col-a">
          <Kanban.Card id="card-1">
            <Kanban.Handle aria-label="Drag card 1" />
            Card One
          </Kanban.Card>
          <Kanban.Card id="card-2">
            <Kanban.Handle aria-label="Drag card 2" />
            Card Two
          </Kanban.Card>
        </Kanban.Column>
        <Kanban.Column id="col-b">
          <Kanban.Card id="card-3">
            <Kanban.Handle aria-label="Drag card 3" />
            Card Three
          </Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Drop position (#376)
// ---------------------------------------------------------------------------
// jsdom lays nothing out — every getBoundingClientRect is 0×0, which leaves
// dnd-kit unable to resolve ANY drop target. `stubLayout` below fakes a real
// board: columns side by side, cards stacked inside them, rects derived from
// each element's CURRENT position in the DOM so a live reorder re-measures the
// way a browser would. With that in place a real pointer drag (jsdom 29
// implements PointerEvent, so the PointerSensor activates for real) runs
// through Kanban's own DndContext.

const COL_W = 100;
const COL_GAP = 20;
const CARD_H = 50;

/** Column i occupies x [i*(COL_W+COL_GAP), +COL_W], y [0, height]. Card n
 *  inside it occupies that x band, y [n*CARD_H, +CARD_H]. */
function stubLayout(): () => void {
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const column = this.closest('[data-col]');
    if (!column) return orig.call(this);
    const colIdx = Number(column.getAttribute('data-col'));
    const left = colIdx * (COL_W + COL_GAP);
    if (this === column) {
      const height = Number(column.getAttribute('data-h') ?? 300);
      return new DOMRect(left, 0, COL_W, height);
    }
    const card = this.closest('[data-card]');
    if (card !== this) return orig.call(this);
    const idx = Array.from(column.querySelectorAll('[data-card]')).indexOf(this);
    return new DOMRect(left, idx * CARD_H, COL_W, CARD_H);
  };
  return () => {
    Element.prototype.getBoundingClientRect = orig;
  };
}

interface BoardProps {
  onMove?: (event: KanbanMoveEvent) => void;
  columns: [string, string[]][];
  /** Column height — a tall column with few cards has drop-able padding. */
  height?: number;
}

function Board({ onMove, columns, height = 300 }: BoardProps) {
  return (
    <Kanban onMove={onMove}>
      {columns.map(([colId, cards], i) => (
        <Kanban.Column key={colId} id={colId} data-col={i} data-h={height}>
          {cards.map((cardId) => (
            <Kanban.Card key={cardId} id={cardId} data-card={cardId}>
              {cardId}
            </Kanban.Card>
          ))}
        </Kanban.Column>
      ))}
    </Kanban>
  );
}

/** Presses the card, walks the pointer through `path`, releases at the last
 *  point. Coordinates are in the stubbed layout's space. The first move only
 *  trips the sensor's 5px activation constraint — the drag proper starts at
 *  `path[0]`, which keeps every delta measured from the press point. */
function drag(cardId: string, path: [number, number][]) {
  const card = screen.getByText(cardId);
  const from = card.getBoundingClientRect();
  const startX = from.left + COL_W / 2;
  const startY = from.top + CARD_H / 2;
  fireEvent.pointerDown(card, { clientX: startX, clientY: startY, button: 0, isPrimary: true });
  fireEvent.pointerMove(document, { clientX: startX, clientY: startY + 10 });
  for (const [clientX, clientY] of path) fireEvent.pointerMove(document, { clientX, clientY });
  const [lastX, lastY] = path[path.length - 1];
  fireEvent.pointerUp(document, { clientX: lastX, clientY: lastY });
}

/** Centre of column i, at vertical offset y. */
const at = (col: number, y: number): [number, number] => [col * (COL_W + COL_GAP) + COL_W / 2, y];

describe('Kanban — drop position', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = stubLayout();
  });
  afterEach(() => restore());

  it('#376 reproduction: enters at the top, releases ON the last card, commits that card’s slot', () => {
    // The exact gesture from the issue: cross the boundary near the top of a
    // three-card column, travel DOWN, release over a sibling. Before the fix
    // the slot froze at the crossing and this committed index 0 while the
    // preview showed the gap further down. `at(1, 140)` sits on b2 in the
    // live list [a1, b1, b2, b3], so both preview and commit are index 2.
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        columns={[
          ['a', ['a1', 'a2']],
          ['b', ['b1', 'b2', 'b3']],
        ]}
      />,
    );

    drag('a1', [at(1, 5), at(1, 140)]);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toEqual({
      cardId: 'a1',
      from: { columnId: 'a', index: 0 },
      to: { columnId: 'b', index: 2 },
    });
  });

  it('commits the slot the card was RELEASED on, not the one it entered the column at (#376)', () => {
    // Same crossing, but released past the last card — the append path.
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        columns={[
          ['a', ['a1', 'a2']],
          ['b', ['b1', 'b2', 'b3']],
        ]}
      />,
    );

    drag('a1', [at(1, 5), at(1, 190)]);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toEqual({
      cardId: 'a1',
      from: { columnId: 'a', index: 0 },
      to: { columnId: 'b', index: 3 },
    });
  });

  it('re-evaluates upward too: enters at the bottom, releases on the top card', () => {
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        columns={[
          ['a', ['a1', 'a2']],
          ['b', ['b1', 'b2', 'b3']],
        ]}
      />,
    );

    drag('a1', [at(1, 190), at(1, 5)]);

    expect(onMove.mock.calls[0][0].to).toEqual({ columnId: 'b', index: 0 });
  });

  it('appends when released in a sparse column’s padding below the last card', () => {
    // Tall column, three cards: below them `over` resolves to the column
    // itself, which the sortable strategy renders with no displacement — so
    // the card must already be sitting at the end of the live list.
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        height={1000}
        columns={[
          ['a', ['a1', 'a2']],
          ['b', ['b1', 'b2', 'b3']],
        ]}
      />,
    );

    drag('a1', [at(1, 5), at(1, 980)]);

    expect(onMove.mock.calls[0][0].to).toEqual({ columnId: 'b', index: 3 });
  });

  it('drops into an empty column at index 0', () => {
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        columns={[
          ['a', ['a1', 'a2']],
          ['b', []],
        ]}
      />,
    );

    drag('a1', [at(1, 100)]);

    expect(onMove.mock.calls[0][0].to).toEqual({ columnId: 'b', index: 0 });
  });

  it('a same-column reorder still uses arrayMove semantics (no oscillation)', () => {
    // The dragOver early-return exists for exactly this path — the slot is
    // resolved once, at dragEnd, from `over`.
    const onMove = vi.fn();
    render(<Board onMove={onMove} columns={[['a', ['a1', 'a2', 'a3']]]} />);

    drag('a1', [at(0, 90), at(0, 140)]);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toEqual({
      cardId: 'a1',
      from: { columnId: 'a', index: 0 },
      to: { columnId: 'a', index: 2 },
    });
  });

  it('does not fire onMove for a drag that never leaves its own slot', () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} columns={[['a', ['a1', 'a2', 'a3']]]} />);

    drag('a1', [at(0, 30)]);

    expect(onMove).not.toHaveBeenCalled();
  });

  it('after a round trip, a sibling’s LIVE index wins over its pre-drag index', () => {
    // a1 → b → back into a, seated at the end, released over a4. a4's pre-drag
    // index is 3; its index in the live column (a1 removed from the front, then
    // re-appended) is 2 — and 2 is what the strategy previews. Resolving the
    // sibling against the pre-drag order would commit 3.
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        columns={[
          ['a', ['a1', 'a2', 'a3', 'a4']],
          ['b', ['b1']],
        ]}
      />,
    );

    drag('a1', [at(1, 5), at(0, 140)]);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toEqual({
      cardId: 'a1',
      from: { columnId: 'a', index: 0 },
      to: { columnId: 'a', index: 2 },
    });
  });

  it('commits the released slot after a round trip back to the origin column', () => {
    const onMove = vi.fn();
    render(
      <Board
        onMove={onMove}
        columns={[
          ['a', ['a1', 'a2', 'a3']],
          ['b', ['b1']],
        ]}
      />,
    );

    // a1 → column b → back into a, released below a3 (the last card).
    drag('a1', [at(1, 5), at(0, 140)]);

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toEqual({
      cardId: 'a1',
      from: { columnId: 'a', index: 0 },
      to: { columnId: 'a', index: 2 },
    });
  });
});
