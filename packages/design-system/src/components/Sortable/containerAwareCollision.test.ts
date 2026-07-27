// Headless reproduction of #367: synthetic droppable rects mirroring the
// playground repro (14-card ~800px Backlog beside an empty flex-stretched
// Archive). First test pins the raw closestCorners misresolution (the bug
// mechanism); the rest specify containerAwareClosestCorners.
import { closestCorners, type ClientRect, type DroppableContainer } from '@dnd-kit/core';
import { containerAwareClosestCorners } from './containerAwareCollision';

type Args = Parameters<typeof containerAwareClosestCorners>[0];

function rect(left: number, top: number, width: number, height: number): ClientRect {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

// Geometry (viewport-relative, matches the measured playground repro):
// - backlog column: x 0..260, y 0..796, 14 cards (h 46, gap 8) starting y 38
// - archive column: x 272..532, y 0..796 (flex-stretched, EMPTY)
const COLUMN_W = 260;
const COLUMN_H = 796;
const CARD_W = 244;
const CARD_H = 46;
const CARD_GAP = 8;
const N_CARDS = 14;
const ARCHIVE_LEFT = 272;

function cardRect(index: number): ClientRect {
  return rect(8, 38 + index * (CARD_H + CARD_GAP), CARD_W, CARD_H);
}

function buildArgs(overrides: Partial<Args> = {}): Args {
  const droppableRects = new Map<string, ClientRect>();
  droppableRects.set('backlog', rect(0, 0, COLUMN_W, COLUMN_H));
  droppableRects.set('archive', rect(ARCHIVE_LEFT, 0, COLUMN_W, COLUMN_H));
  for (let i = 0; i < N_CARDS; i++) droppableRects.set(`lead-${i + 1}`, cardRect(i));

  const container = (id: string, sortable: boolean): DroppableContainer =>
    ({
      id,
      data: { current: sortable ? { sortable: { containerId: id, index: 0, items: [] } } : {} },
    }) as unknown as DroppableContainer;

  const droppableContainers = [
    container('backlog', false),
    container('archive', false),
    ...Array.from({ length: N_CARDS }, (_, i) => container(`lead-${i + 1}`, true)),
  ];

  return {
    active: { id: 'lead-7' } as Args['active'],
    collisionRect: rect(0, 0, CARD_W, CARD_H),
    droppableRects: droppableRects as Args['droppableRects'],
    droppableContainers,
    pointerCoordinates: null,
    ...overrides,
  };
}

/** Center the dragged rect (and pointer) at a point — mirrors a mid-card grab. */
function pointerAt(x: number, y: number): Partial<Args> {
  return {
    collisionRect: rect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H),
    pointerCoordinates: { x, y },
  };
}

// Pointer dead-center in the EMPTY archive column — the issue's repro point.
const IN_EMPTY_ARCHIVE = pointerAt(ARCHIVE_LEFT + COLUMN_W / 2, COLUMN_H / 2);

describe('closestCorners baseline (the #367 mechanism)', () => {
  // Deliberately pins upstream MISbehavior as a tripwire: if a @dnd-kit/core
  // bump makes this fail, its ranking changed — re-evaluate whether
  // containerAwareClosestCorners is still needed; do NOT invert the assertion.
  it('misresolves a drop centered in the stretched empty column to a source-column card', () => {
    const winner = closestCorners(buildArgs(IN_EMPTY_ARCHIVE))[0];
    expect(winner.id).not.toBe('archive');
    expect(String(winner.id)).toMatch(/^lead-/);
  });
});

describe('containerAwareClosestCorners', () => {
  it('pointer inside the stretched empty column → that column wins', () => {
    const winner = containerAwareClosestCorners(buildArgs(IN_EMPTY_ARCHIVE))[0];
    expect(winner.id).toBe('archive');
  });

  it('pointer anywhere inside the empty column (top, deep bottom) → column wins', () => {
    for (const y of [30, 200, 700, COLUMN_H - 10]) {
      const winner = containerAwareClosestCorners(
        buildArgs(pointerAt(ARCHIVE_LEFT + COLUMN_W / 2, y)),
      )[0];
      expect(winner.id).toBe('archive');
    }
  });

  it('pointer over a card in the populated column → that card wins', () => {
    const c3 = cardRect(2); // lead-3
    const winner = containerAwareClosestCorners(
      buildArgs(pointerAt(c3.left + c3.width / 2, c3.top + c3.height / 2)),
    )[0];
    expect(winner.id).toBe('lead-3');
  });

  it('pointer in a populated column below its last card → resolves within that column', () => {
    const lastBottom = cardRect(N_CARDS - 1).bottom; // 794 — use a sparser column
    // Sparser variant: only 5 cards registered in backlog, same stretched height.
    const args = buildArgs(pointerAt(COLUMN_W / 2, 700));
    args.droppableContainers = args.droppableContainers.filter((d) => {
      const m = /^lead-(\d+)$/.exec(String(d.id));
      return m == null || Number(m[1]) <= 5;
    });
    const winner = containerAwareClosestCorners(args)[0];
    // Either the column itself or its last card is acceptable — both resolve
    // to "append to this column" downstream. Never anything in/near archive.
    expect(['backlog', 'lead-5']).toContain(winner.id);
    expect(lastBottom).toBeGreaterThan(700); // guard: full-column variant would overlap a card
  });

  it('pointer still in the source column while the dragged rect spills into the sibling → source card wins', () => {
    const c7 = cardRect(6); // lead-7
    // Pointer near backlog's right edge: the card-sized dragged rect overlaps
    // archive, but the POINTER hasn't left backlog — pointer beats rect overlap.
    const winner = containerAwareClosestCorners(
      buildArgs(pointerAt(COLUMN_W - 10, c7.top + c7.height / 2)),
    )[0];
    expect(winner.id).toBe('lead-7');
  });

  it('null pointerCoordinates (keyboard drag) → identical to plain closestCorners', () => {
    const args = buildArgs({
      collisionRect: cardRect(6),
      pointerCoordinates: null,
    });
    expect(containerAwareClosestCorners(args)).toEqual(closestCorners(args));
  });

  it('pointer in the gap between columns → falls back to plain closestCorners', () => {
    const args = buildArgs(pointerAt(266, 300)); // 260..272 is the column gap
    expect(containerAwareClosestCorners(args)).toEqual(closestCorners(args));
  });
});
