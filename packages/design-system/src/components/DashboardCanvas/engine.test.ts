import {
  DASHBOARD_COLUMNS,
  applyMove,
  applyResize,
  cellFromPoint,
  clampPlacement,
  collides,
  compact,
  placeWithPushDown,
  reorderSection,
  stackOrder,
  toggleSection,
} from './engine';
import type { DashboardCanvasValue, DashboardPlacement } from './engine';

const p = (id: string, x: number, y: number, w: number, h: number): DashboardPlacement => ({
  id,
  x,
  y,
  w,
  h,
});

const byId = (items: DashboardPlacement[], id: string): DashboardPlacement =>
  items.find((item) => item.id === id)!;

/** Asserts no two placements in the list overlap. */
const expectNoOverlaps = (items: DashboardPlacement[]): void => {
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      expect(
        collides(items[i], items[j]),
        `${String(items[i].id)} overlaps ${String(items[j].id)}`,
      ).toBe(false);
    }
  }
};

const value = (
  items: DashboardPlacement[],
  sections: DashboardCanvasValue['sections'] = [],
): DashboardCanvasValue => ({ items, sections });

describe('DASHBOARD_COLUMNS', () => {
  it('is 12', () => {
    expect(DASHBOARD_COLUMNS).toBe(12);
  });
});

describe('clampPlacement', () => {
  it('clamps negative x and y to 0', () => {
    expect(clampPlacement(p('a', -3, -2, 2, 2), undefined)).toEqual(p('a', 0, 0, 2, 2));
  });

  it('pulls x back so x + w fits in 12 columns', () => {
    expect(clampPlacement(p('a', 10, 0, 4, 1), undefined)).toEqual(p('a', 8, 0, 4, 1));
  });

  it('caps w at 12 columns and resets x to 0 when oversized', () => {
    expect(clampPlacement(p('a', 3, 0, 20, 1), undefined)).toEqual(p('a', 0, 0, 12, 1));
  });

  it('enforces w >= 1 and h >= 1 without constraints', () => {
    expect(clampPlacement(p('a', 0, 0, 0, 0), undefined)).toEqual(p('a', 0, 0, 1, 1));
  });

  it('raises w to minW and h to minH', () => {
    expect(clampPlacement(p('a', 0, 0, 1, 1), { minW: 3, minH: 2 })).toEqual(p('a', 0, 0, 3, 2));
  });

  it('lowers h to maxH', () => {
    expect(clampPlacement(p('a', 0, 0, 2, 9), { maxH: 4 })).toEqual(p('a', 0, 0, 2, 4));
  });

  it('does not mutate the input', () => {
    const input = p('a', -1, 0, 2, 2);
    clampPlacement(input, undefined);
    expect(input).toEqual(p('a', -1, 0, 2, 2));
  });
});

describe('collides', () => {
  it('detects overlapping rects', () => {
    expect(collides(p('a', 0, 0, 4, 2), p('b', 2, 1, 4, 2))).toBe(true);
  });

  it('detects full containment', () => {
    expect(collides(p('a', 0, 0, 6, 6), p('b', 2, 2, 2, 2))).toBe(true);
  });

  it('detects identical rects', () => {
    expect(collides(p('a', 1, 1, 2, 2), p('b', 1, 1, 2, 2))).toBe(true);
  });

  it('does NOT collide on touching vertical edges', () => {
    expect(collides(p('a', 0, 0, 4, 2), p('b', 4, 0, 4, 2))).toBe(false);
  });

  it('does NOT collide on touching horizontal edges', () => {
    expect(collides(p('a', 0, 0, 4, 2), p('b', 0, 2, 4, 2))).toBe(false);
  });

  it('does not collide when fully disjoint', () => {
    expect(collides(p('a', 0, 0, 2, 2), p('b', 6, 6, 2, 2))).toBe(false);
  });
});

describe('compact', () => {
  it('pulls a lone item up to y 0', () => {
    expect(compact([p('a', 3, 5, 2, 2)])).toEqual([p('a', 3, 0, 2, 2)]);
  });

  it('closes gaps in a same-column stack', () => {
    const out = compact([p('a', 0, 0, 2, 2), p('b', 0, 5, 2, 2)]);
    expect(byId(out, 'a').y).toBe(0);
    expect(byId(out, 'b').y).toBe(2);
  });

  it('never changes x', () => {
    const out = compact([p('a', 4, 7, 3, 1), p('b', 9, 3, 3, 2)]);
    expect(byId(out, 'a').x).toBe(4);
    expect(byId(out, 'b').x).toBe(9);
  });

  it('compacts independent columns independently', () => {
    const out = compact([p('a', 0, 3, 2, 1), p('b', 6, 5, 2, 1)]);
    expect(byId(out, 'a').y).toBe(0);
    expect(byId(out, 'b').y).toBe(0);
  });

  it('slots a small item into a gap it fits, but not one it does not', () => {
    // a: rows 0-2 at x 0-2; wide blocker b compacts onto a (rows 2-4).
    // c (h=2) fits the 2-row space above b at x 4-6; d (h=3) does not.
    const out = compact([
      p('a', 0, 0, 2, 2),
      p('b', 0, 5, 12, 2),
      p('c', 4, 9, 2, 2),
      p('d', 8, 9, 2, 3),
    ]);
    expect(byId(out, 'b').y).toBe(2); // b itself compacts onto a
    expect(byId(out, 'c').y).toBe(0); // fits above b at its own span
    expect(byId(out, 'd').y).toBe(4); // h=3 cannot fit above b, lands below it
  });

  it('is stable for identical (y, x): input order wins, second stacks below', () => {
    const out = compact([p('first', 0, 0, 2, 2), p('second', 0, 0, 2, 2)]);
    expect(byId(out, 'first').y).toBe(0);
    expect(byId(out, 'second').y).toBe(2);
  });

  it('keeps a wide item below the narrow items it rests on (L-shaped stack)', () => {
    const out = compact([p('tall', 0, 0, 2, 4), p('short', 4, 0, 2, 1), p('wide', 0, 6, 8, 2)]);
    expect(byId(out, 'tall').y).toBe(0);
    expect(byId(out, 'short').y).toBe(0);
    expect(byId(out, 'wide').y).toBe(4); // blocked by tall, not by short
    expectNoOverlaps(out);
  });

  it('preserves the input array order in the output', () => {
    const out = compact([p('b', 0, 5, 2, 1), p('a', 0, 0, 2, 1)]);
    expect(out.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('is idempotent', () => {
    const once = compact([p('a', 0, 3, 4, 2), p('b', 2, 8, 4, 2), p('c', 8, 1, 2, 5)]);
    expect(compact(once)).toEqual(once);
  });

  it('does not mutate the input array or its items', () => {
    const items = [p('a', 0, 5, 2, 2)];
    compact(items);
    expect(items).toEqual([p('a', 0, 5, 2, 2)]);
  });

  it('returns an empty array for no items', () => {
    expect(compact([])).toEqual([]);
  });
});

describe('placeWithPushDown', () => {
  it('drops onto an occupied cell: occupant is pushed down exactly enough', () => {
    const out = placeWithPushDown([p('a', 0, 0, 2, 2)], p('m', 0, 0, 2, 2));
    expect(byId(out, 'm')).toEqual(p('m', 0, 0, 2, 2));
    expect(byId(out, 'a')).toEqual(p('a', 0, 2, 2, 2));
  });

  it('pushes a chain down recursively', () => {
    const out = placeWithPushDown(
      [p('a', 0, 0, 2, 2), p('b', 0, 2, 2, 2), p('c', 0, 4, 2, 2)],
      p('m', 0, 0, 2, 3),
    );
    expect(byId(out, 'a').y).toBe(3);
    expect(byId(out, 'b').y).toBe(5);
    expect(byId(out, 'c').y).toBe(7);
    expectNoOverlaps(out);
  });

  it('a wide moved item pushes items in several columns, each keeping its x', () => {
    const items = [p('a', 0, 0, 3, 2), p('b', 5, 0, 3, 1), p('c', 9, 0, 3, 3)];
    const out = placeWithPushDown(items, p('m', 0, 0, 12, 1));
    expect(byId(out, 'a')).toEqual(p('a', 0, 1, 3, 2));
    expect(byId(out, 'b')).toEqual(p('b', 5, 1, 3, 1));
    expect(byId(out, 'c')).toEqual(p('c', 9, 1, 3, 3));
    expectNoOverlaps(out);
  });

  it('a drop into free space rises with the compaction — no floating placements', () => {
    const out = placeWithPushDown([p('a', 6, 0, 2, 2)], p('m', 0, 4, 2, 2));
    expect(byId(out, 'm')).toEqual(p('m', 0, 0, 2, 2));
    expect(byId(out, 'a')).toEqual(p('a', 6, 0, 2, 2));
  });

  it('a drop at y 10 over an empty canvas settles at y 0 in the same gesture', () => {
    expect(placeWithPushDown([], p('m', 3, 10, 4, 2))).toEqual([p('m', 3, 0, 4, 2)]);
  });

  it('equals compact([...others, moved]) when the drop is collision-free', () => {
    const others = [p('a', 0, 0, 4, 2), p('b', 4, 3, 4, 2)];
    const moved = p('m', 8, 6, 4, 2);
    expect(placeWithPushDown(others, moved)).toEqual(compact([...others, moved]));
  });

  it('non-colliding items compact upward around the drop', () => {
    const out = placeWithPushDown([p('a', 6, 5, 2, 2)], p('m', 0, 0, 2, 2));
    expect(byId(out, 'a').y).toBe(0);
  });

  it('an evicted item cannot land back under the moved item, it goes below', () => {
    // m takes rows 0-3 at x 0-4; a (same span) has no free rows above m.
    const out = placeWithPushDown([p('a', 0, 0, 4, 2)], p('m', 0, 0, 4, 4));
    expect(byId(out, 'a').y).toBe(4);
    expectNoOverlaps(out);
  });

  it('moved and its evictee compact as a stack with moved on top', () => {
    // m dropped onto a at row 2 with rows 0-1 free: m claims the spot (a goes
    // below), then the whole stack compacts to the top.
    const out = placeWithPushDown([p('a', 0, 2, 2, 2)], p('m', 0, 2, 2, 3));
    expect(byId(out, 'm')).toEqual(p('m', 0, 0, 2, 3));
    expect(byId(out, 'a')).toEqual(p('a', 0, 3, 2, 2));
    expectNoOverlaps(out);
  });

  it('replaces an existing entry with the same id (move within container)', () => {
    const out = placeWithPushDown([p('m', 0, 0, 2, 2), p('a', 6, 0, 2, 2)], p('m', 6, 0, 2, 2));
    expect(out.filter((item) => item.id === 'm')).toEqual([p('m', 6, 0, 2, 2)]);
    expect(byId(out, 'a').y).toBe(2);
    expectNoOverlaps(out);
  });

  it('is idempotent when dropped on free space', () => {
    const items = [p('a', 0, 0, 4, 2), p('b', 4, 0, 4, 2)];
    const once = placeWithPushDown(items, p('m', 8, 0, 4, 2));
    const twice = placeWithPushDown(
      once.filter((item) => item.id !== 'm'),
      byId(once, 'm'),
    );
    expect(twice).toEqual(once);
  });

  it('partial-overlap push: only the overlapped column chain moves', () => {
    // m overlaps a (x 4-6 of its 0-6 span); b sits at x 0-2 under a and may rise.
    const out = placeWithPushDown([p('a', 0, 0, 6, 1), p('b', 0, 1, 2, 1)], p('m', 4, 0, 4, 2));
    expect(byId(out, 'm')).toEqual(p('m', 4, 0, 4, 2));
    expect(byId(out, 'a').y).toBe(2); // pushed below m, x unchanged
    expect(byId(out, 'a').x).toBe(0);
    expect(byId(out, 'b').y).toBe(0); // compacts into the vacated row
    expectNoOverlaps(out);
  });

  it('never overlaps anything in a dense mixed layout', () => {
    const items = [
      p('a', 0, 0, 4, 2),
      p('b', 4, 0, 4, 2),
      p('c', 8, 0, 4, 2),
      p('d', 0, 2, 6, 2),
      p('e', 6, 2, 6, 2),
      p('f', 0, 4, 12, 1),
    ];
    const out = placeWithPushDown(items, p('m', 2, 1, 8, 2));
    // m displaces the whole top row, then the emptied row 0 compacts away.
    expect(byId(out, 'm')).toEqual(p('m', 2, 0, 8, 2));
    expect(byId(out, 'a').y).toBeGreaterThan(byId(out, 'm').y); // displaced items stay below m
    expectNoOverlaps(out);
    expect(compact(out)).toEqual(out); // fully compacted — no floating placements
  });

  it('does not mutate its inputs', () => {
    const items = [p('a', 0, 0, 2, 2)];
    const moved = p('m', 0, 0, 2, 2);
    placeWithPushDown(items, moved);
    expect(items).toEqual([p('a', 0, 0, 2, 2)]);
    expect(moved).toEqual(p('m', 0, 0, 2, 2));
  });
});

describe('applyMove', () => {
  const top = { kind: 'top' } as const;
  const sec = (id: string) => ({ kind: 'section', id }) as const;

  it('moves within the top-level container and pushes the occupant', () => {
    const v = value([p('a', 0, 0, 2, 2), p('b', 6, 0, 2, 2)]);
    const next = applyMove(v, top, top, 'a', 6, 0);
    expect(byId(next.items, 'a')).toEqual(p('a', 6, 0, 2, 2));
    expect(byId(next.items, 'b').y).toBe(2);
    expectNoOverlaps(next.items);
  });

  it('same-cell move of a floating item compacts it upward', () => {
    const v = value([p('a', 0, 3, 2, 2)]);
    const next = applyMove(v, top, top, 'a', 0, 3);
    expect(byId(next.items, 'a')).toEqual(p('a', 0, 0, 2, 2));
  });

  it('the vacated spot backfills deterministically after a move away', () => {
    const v = value([p('a', 0, 0, 2, 2), p('b', 0, 2, 2, 2)]);
    const next = applyMove(v, top, top, 'a', 6, 0);
    expect(byId(next.items, 'a')).toEqual(p('a', 6, 0, 2, 2));
    expect(byId(next.items, 'b')).toEqual(p('b', 0, 0, 2, 2));
  });

  it('clamps the drop coordinates to the grid', () => {
    const v = value([p('a', 0, 0, 4, 2)]);
    const next = applyMove(v, top, top, 'a', 20, -5);
    expect(byId(next.items, 'a')).toEqual(p('a', 8, 0, 4, 2));
  });

  it('cross-container: removes from source, source compacts', () => {
    const v = value(
      [],
      [
        {
          id: 's1',
          title: 'One',
          collapsed: false,
          items: [p('a', 0, 0, 2, 2), p('b', 0, 2, 2, 2)],
        },
      ],
    );
    const next = applyMove(v, sec('s1'), top, 'a', 0, 0);
    const s1 = next.sections[0].items;
    expect(s1.map((item) => item.id)).toEqual(['b']);
    expect(byId(s1, 'b').y).toBe(0);
    expect(byId(next.items, 'a')).toEqual(p('a', 0, 0, 2, 2));
  });

  it('cross-container: pushes down in the target', () => {
    const v = value(
      [p('t', 0, 0, 2, 2)],
      [{ id: 's1', title: 'One', collapsed: false, items: [p('a', 0, 0, 2, 2)] }],
    );
    const next = applyMove(v, sec('s1'), top, 'a', 0, 0);
    expect(byId(next.items, 'a')).toEqual(p('a', 0, 0, 2, 2));
    expect(byId(next.items, 't').y).toBe(2);
    expectNoOverlaps(next.items);
  });

  it('moves into an empty section', () => {
    const v = value(
      [p('a', 0, 0, 2, 2)],
      [{ id: 's1', title: 'One', collapsed: false, items: [] }],
    );
    const next = applyMove(v, top, sec('s1'), 'a', 4, 0);
    expect(next.items).toEqual([]);
    expect(next.sections[0].items).toEqual([p('a', 4, 0, 2, 2)]);
  });

  it('returns the value unchanged when the id is not in the source container', () => {
    const v = value([p('a', 0, 0, 2, 2)]);
    expect(applyMove(v, top, top, 'nope', 0, 0)).toBe(v);
  });

  it('returns the value unchanged when the target section does not exist', () => {
    const v = value([p('a', 0, 0, 2, 2)]);
    expect(applyMove(v, top, sec('ghost'), 'a', 0, 0)).toBe(v);
  });

  it('does not mutate the input value', () => {
    const items = [p('a', 0, 0, 2, 2), p('b', 6, 0, 2, 2)];
    const v = value(items);
    applyMove(v, top, top, 'a', 6, 0);
    expect(v.items).toBe(items);
    expect(items[0]).toEqual(p('a', 0, 0, 2, 2));
  });
});

describe('applyResize', () => {
  const top = { kind: 'top' } as const;

  it('growing h pushes the neighbor below down', () => {
    const v = value([p('a', 0, 0, 2, 2), p('b', 0, 2, 2, 2)]);
    const next = applyResize(v, top, 'a', 2, 4);
    expect(byId(next.items, 'a')).toEqual(p('a', 0, 0, 2, 4));
    expect(byId(next.items, 'b').y).toBe(4);
  });

  it('growing w pushes a same-row right neighbor down (x never changes)', () => {
    const v = value([p('a', 0, 0, 2, 2), p('b', 2, 0, 2, 2)]);
    const next = applyResize(v, top, 'a', 4, 2);
    expect(byId(next.items, 'b')).toEqual(p('b', 2, 2, 2, 2));
    expectNoOverlaps(next.items);
  });

  it('shrinking h compacts the stack below (double compaction chain)', () => {
    const v = value([p('a', 0, 0, 2, 4), p('b', 0, 4, 2, 2), p('c', 0, 6, 2, 2)]);
    const next = applyResize(v, top, 'a', 2, 2);
    expect(byId(next.items, 'b').y).toBe(2);
    expect(byId(next.items, 'c').y).toBe(4);
  });

  it('keeps the resized item at its x and y', () => {
    // blocker pins rows 0-2 at x 4-6 so a's y is held by geometry, not floating.
    const v = value([p('blocker', 4, 0, 2, 3), p('a', 4, 3, 2, 2)]);
    const next = applyResize(v, top, 'a', 6, 3);
    expect(byId(next.items, 'a')).toEqual(p('a', 4, 3, 6, 3));
  });

  it('floors w at 1 even for an out-of-grid x from an invalid controlled value', () => {
    const v = value([p('a', 12, 0, 2, 2)]);
    const next = applyResize(v, top, 'a', 5, 2);
    expect(byId(next.items, 'a').w).toBe(1);
  });

  it('clamps w to the remaining columns at the item x', () => {
    const v = value([p('a', 8, 0, 2, 2)]);
    const next = applyResize(v, top, 'a', 10, 2);
    expect(byId(next.items, 'a').w).toBe(4);
  });

  it('respects minW, minH and maxH constraints', () => {
    const v = value([p('a', 0, 0, 4, 4)]);
    const next = applyResize(v, top, 'a', 1, 9, { minW: 3, minH: 2, maxH: 6 });
    expect(byId(next.items, 'a').w).toBe(3);
    expect(byId(next.items, 'a').h).toBe(6);
  });

  it('resizes inside a section container', () => {
    const v = value(
      [],
      [{ id: 's1', title: 'One', collapsed: false, items: [p('a', 0, 0, 2, 2)] }],
    );
    const next = applyResize(v, { kind: 'section', id: 's1' }, 'a', 4, 3);
    expect(next.sections[0].items).toEqual([p('a', 0, 0, 4, 3)]);
  });

  it('returns the value unchanged for an unknown id', () => {
    const v = value([p('a', 0, 0, 2, 2)]);
    expect(applyResize(v, top, 'nope', 4, 4)).toBe(v);
  });
});

describe('toggleSection', () => {
  const v = value(
    [],
    [
      { id: 's1', title: 'One', collapsed: false, items: [p('a', 0, 0, 2, 2)] },
      { id: 's2', title: 'Two', collapsed: true, items: [] },
    ],
  );

  it('flips only the target section collapsed flag', () => {
    const next = toggleSection(v, 's1');
    expect(next.sections[0].collapsed).toBe(true);
    expect(next.sections[0].items).toBe(v.sections[0].items);
    expect(next.sections[1]).toBe(v.sections[1]);
    expect(next.items).toBe(v.items);
  });

  it('round-trips back to the original state', () => {
    expect(toggleSection(toggleSection(v, 's2'), 's2').sections[1].collapsed).toBe(true);
  });

  it('returns the value unchanged for an unknown id', () => {
    expect(toggleSection(v, 'ghost')).toBe(v);
  });
});

describe('reorderSection', () => {
  const section = (id: string) => ({ id, title: id, collapsed: false, items: [] });
  const v = value([], [section('a'), section('b'), section('c')]);

  it('moves a band to the target index', () => {
    expect(reorderSection(v, 'c', 0).sections.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(reorderSection(v, 'a', 2).sections.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('clamps the index into range', () => {
    expect(reorderSection(v, 'c', -5).sections.map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(reorderSection(v, 'a', 99).sections.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('is a no-op object when the index does not change', () => {
    expect(reorderSection(v, 'b', 1)).toBe(v);
  });

  it('returns the value unchanged for an unknown id', () => {
    expect(reorderSection(v, 'ghost', 0)).toBe(v);
  });

  it('does not touch top-level items', () => {
    const withItems = value([p('x', 0, 0, 2, 2)], [section('a'), section('b')]);
    expect(reorderSection(withItems, 'b', 0).items).toBe(withItems.items);
  });
});

describe('stackOrder', () => {
  it('lists top-level items (y, then x) before sections in band order', () => {
    const v = value(
      [p('t2', 4, 0, 2, 2), p('t1', 0, 0, 2, 2), p('t3', 0, 2, 2, 2)],
      [
        {
          id: 's1',
          title: 'One',
          collapsed: false,
          items: [p('b', 0, 1, 2, 1), p('a', 0, 0, 2, 1)],
        },
        { id: 's2', title: 'Two', collapsed: true, items: [p('c', 0, 0, 2, 1)] },
      ],
    );
    expect(stackOrder(v)).toEqual([
      { container: { kind: 'top' }, id: 't1' },
      { container: { kind: 'top' }, id: 't2' },
      { container: { kind: 'top' }, id: 't3' },
      { container: { kind: 'section', id: 's1' }, id: 'a' },
      { container: { kind: 'section', id: 's1' }, id: 'b' },
      { container: { kind: 'section', id: 's2' }, id: 'c' },
    ]);
  });

  it('breaks same-y ties by x', () => {
    const v = value([p('right', 6, 0, 2, 1), p('left', 0, 0, 2, 1)]);
    expect(stackOrder(v).map((entry) => entry.id)).toEqual(['left', 'right']);
  });

  it('returns an empty list for an empty value', () => {
    expect(stackOrder(value([]))).toEqual([]);
  });
});

describe('cellFromPoint', () => {
  const rect = { left: 100, top: 50 } as DOMRect;
  // 60px columns, 48px rows, 12px gap → 72px column pitch, 60px row pitch.
  const at = (px: number, py: number) => cellFromPoint(px, py, rect, 60, 48, 12);

  it('maps the container origin to cell (0, 0)', () => {
    expect(at(100, 50)).toEqual({ x: 0, y: 0 });
  });

  it('steps one cell per column/row pitch (cell width + gap)', () => {
    expect(at(100 + 72, 50)).toEqual({ x: 1, y: 0 });
    expect(at(100, 50 + 60)).toEqual({ x: 0, y: 1 });
    expect(at(100 + 3 * 72 + 30, 50 + 2 * 60 + 10)).toEqual({ x: 3, y: 2 });
  });

  it('a point inside the trailing gap belongs to the cell before it', () => {
    expect(at(100 + 65, 50)).toEqual({ x: 0, y: 0 });
  });

  it('clamps negative overshoot to 0', () => {
    expect(at(20, -100)).toEqual({ x: 0, y: 0 });
  });

  it('clamps x overshoot to the last column but leaves y unbounded', () => {
    expect(at(100 + 40 * 72, 50 + 40 * 60)).toEqual({ x: DASHBOARD_COLUMNS - 1, y: 40 });
  });

  it('guards zero-size cells (jsdom) without producing NaN', () => {
    expect(cellFromPoint(500, 500, rect, 0, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('no-op gestures return the input reference', () => {
  const value: DashboardCanvasValue = {
    items: [
      { id: 'a', x: 0, y: 0, w: 2, h: 1 },
      { id: 'b', x: 0, y: 1, w: 2, h: 1 },
    ],
    sections: [],
  };

  it('applyMove: a same-cell drop in an already-compacted layout', () => {
    expect(applyMove(value, { kind: 'top' }, { kind: 'top' }, 'a', 0, 0)).toBe(value);
  });

  it('applyResize: clamping that resolves to the current dimensions', () => {
    expect(applyResize(value, { kind: 'top' }, 'a', 0, 1, { minW: 2 })).toBe(value);
  });
});

describe('engine property test (seeded, #337 review)', () => {
  // ponytail: fixed-seed mulberry32 — deterministic in CI, not a real fuzz-test
  // dependency. Upgrade to fast-check only if a seed stops finding regressions.
  function mulberry32(seed: number) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260726);
  const randInt = (max: number) => Math.floor(rand() * max);
  const randomLayout = (): DashboardPlacement[] =>
    Array.from({ length: 2 + randInt(6) }, (_, i) => {
      const w = 1 + randInt(4);
      return {
        id: `p${i}`,
        x: randInt(DASHBOARD_COLUMNS - w + 1),
        y: randInt(8),
        w,
        h: 1 + randInt(3),
      };
    });
  const expectBounds = (items: DashboardPlacement[]) => {
    for (const item of items) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(DASHBOARD_COLUMNS);
    }
  };

  it('holds no-overlap, bounds, and full-compaction invariants across 200 random layouts', () => {
    for (let i = 0; i < 200; i += 1) {
      const compacted = compact(randomLayout());
      expectNoOverlaps(compacted);
      expectBounds(compacted);
      expect(compact(compacted)).toEqual(compacted); // already fully compacted

      const dropped = clampPlacement(
        { ...compacted[randInt(compacted.length)], x: randInt(DASHBOARD_COLUMNS), y: randInt(8) },
        undefined,
      );
      const pushed = placeWithPushDown(compacted, dropped);
      expectNoOverlaps(pushed);
      expectBounds(pushed);
      const out = pushed.find((item) => item.id === dropped.id)!;
      expect(out.x).toBe(dropped.x);
      expect(out.w).toBe(dropped.w);
      expect(out.h).toBe(dropped.h);

      const resized = applyResize(
        value(compacted),
        { kind: 'top' },
        dropped.id,
        dropped.w + 1,
        dropped.h + 1,
      );
      expectNoOverlaps(resized.items);
      expectBounds(resized.items);
    }
  });
});
