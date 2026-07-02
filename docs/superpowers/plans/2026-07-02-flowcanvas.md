# FlowCanvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `FlowCanvas` — a hand-rolled, generic node-edge graph editor primitive (pan/zoom canvas, draggable nodes, directed bezier edges, full keyboard parity) — per the approved spec `docs/superpowers/specs/2026-07-02-flowcanvas-design.md` (issue #265).

**Architecture:** HTML nodes absolutely positioned over a single SVG edge underlay, inside a `translate/scale` stage div (ImageCrop pattern). Pure geometry/layout modules (`layout.ts`, `edgePath.ts`, `spatialNav.ts`) are TDD'd first; the orchestrator composes them with `useViewport` (pan/zoom) and intent callbacks. Events-only: the canvas never mutates consumer data.

**Tech Stack:** React 19, SCSS modules + CSS custom properties, Vitest + Testing Library (jsdom, `globals: true` — never import `describe/it/expect/vi`), existing `_internal` utilities. **No new dependencies.**

**Working conventions (apply to every task):**

- Repo root: `/Users/dpws/projects/design-system`. Library package: `packages/design-system`.
- Branch: all work happens on `feat/flow-canvas` (Task 1 creates it).
- Run library tests with `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run <path>`.
- Read `packages/design-system/CLAUDE.md` before touching library code. Rules that bite here: tokens-only SCSS (Rule 3), component tokens layer (`FlowCanvas.tokens.scss`), `:focus-visible` not `:focus` (3a), no layout props on the component root (Rule 4), forwardRef + spread (Rule 6), JSDoc everywhere (Rule 7), i18n for every user-facing string (Rule 9).
- Match `clsx` import style to existing components (check `head -20 src/components/Kanban/Kanban.tsx`).
- Every commit message ends with:

  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  ```

---

### Task 1: Branch + move `useControllableState` to `_internal`

FlowCanvas needs controlled/uncontrolled selection. The hook lives in `DataTable/`; importing it from there would add a bogus `composes: ['DataTable']` edge to the manifest (the composes regex `/from\s+['"]\.\.\/([A-Z][a-zA-Z0-9]+)/` matches `../DataTable/...` but not `../_internal/...`). Move it to the shared `_internal` home.

**Files:**

- Move: `packages/design-system/src/components/DataTable/useControllableState.ts` → `packages/design-system/src/components/_internal/useControllableState.ts`
- Move: `packages/design-system/src/components/DataTable/useControllableState.test.ts` → `packages/design-system/src/components/_internal/useControllableState.test.ts`
- Modify: `packages/design-system/src/components/DataTable/useDataTable.ts` (import path)

- [ ] **Step 1: Create the branch**

```bash
git -C /Users/dpws/projects/design-system checkout -B feat/flow-canvas origin/main
```

- [ ] **Step 2: Move the files with git mv**

```bash
cd /Users/dpws/projects/design-system/packages/design-system
git mv src/components/DataTable/useControllableState.ts src/components/_internal/useControllableState.ts
git mv src/components/DataTable/useControllableState.test.ts src/components/_internal/useControllableState.test.ts
```

- [ ] **Step 3: Fix the `Updater` import inside the moved hook**

The hook starts with `import type { Updater } from './types';` which pointed at `DataTable/types.ts`. Check whether `Updater` is used by other DataTable files:

```bash
grep -rn "Updater" src/components/DataTable
```

In the moved `_internal/useControllableState.ts`, replace the import with a local definition matching the one in `DataTable/types.ts` (read it first — it is shaped like `type Updater<T> = T | ((prev: T) => T)`):

```ts
export type Updater<T> = T | ((prev: T) => T);
```

If `DataTable/types.ts`'s `Updater` is still used by other DataTable files, leave it there too (tiny duplicate type is fine); if the hook was its only consumer, delete it from `DataTable/types.ts`.

- [ ] **Step 4: Update consumer imports**

In `src/components/DataTable/useDataTable.ts` change

```ts
import { useControllableState } from './useControllableState';
```

to

```ts
import { useControllableState } from '../_internal/useControllableState';
```

Also update the import inside the moved test file (it imports `./useControllableState` — still correct after the move; verify) and any `./types` import for `Updater` in the moved files (point at the local type now).

- [ ] **Step 5: Run tests + typecheck**

```bash
npx vitest run src/components/_internal/useControllableState.test.ts src/components/DataTable
npm run typecheck
```

Expected: all PASS. Also regenerate the manifest so `composes` stays accurate:

```bash
npm run build:manifest && npx vitest run src/_meta/manifest.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: move useControllableState to _internal for shared use

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `types.ts` — public data types

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/types.ts`

- [ ] **Step 1: Write the file**

```ts
import type { ReactNode } from 'react';

/** A point in canvas coordinates (px at zoom 1, origin at the stage's top-left). */
export interface FlowCanvasPoint {
  /** Horizontal offset in canvas units. */
  x: number;
  /** Vertical offset in canvas units. */
  y: number;
}

/** One node (vertex) on the canvas. */
export interface FlowCanvasNode {
  /** Stable unique id. Referenced by edges and every intent callback. */
  id: string;
  /**
   * Plain-text label rendered inside the node. Also used verbatim for
   * screen-reader announcements — keep it human-readable.
   */
  label: string;
  /**
   * Accent color for the node's left bar as a CSS color (typically `#RRGGBB`).
   * Defaults to the accent token when omitted.
   */
  color?: string;
  /**
   * Position in canvas coordinates. When omitted the node is auto-laid-out
   * (layered, left → right) and remains user-draggable for the session.
   */
  position?: FlowCanvasPoint;
  /**
   * Slot rendered after the label — badges, icons, counters. Not announced to
   * screen readers; keep essential state in `label` or the consumer's own UI.
   */
  adornment?: ReactNode;
}

/** One directed edge between two nodes. */
export interface FlowCanvasEdge {
  /** Stable unique id. Referenced by selection and intent callbacks. */
  id: string;
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  /**
   * Slot rendered as a chip at the edge midpoint (e.g. a "Guard" badge).
   * Not announced to screen readers.
   */
  label?: ReactNode;
}

/** Current single selection: a node, an edge, or nothing. */
export type FlowCanvasSelection = { type: 'node' | 'edge'; id: string } | null;
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck
git add src/components/FlowCanvas/types.ts && git commit -m "feat(FlowCanvas): public data types

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `layout.ts` — layered auto-layout (TDD)

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/layout.ts`
- Test: `packages/design-system/src/components/FlowCanvas/layout.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { computeLayout, ESTIMATED_NODE_SIZE } from './layout';
import type { FlowCanvasEdge, FlowCanvasNode } from './types';

const n = (id: string): FlowCanvasNode => ({ id, label: id });
const e = (from: string, to: string): FlowCanvasEdge => ({ id: `${from}-${to}`, from, to });

describe('computeLayout', () => {
  it('returns an empty map for no nodes', () => {
    expect(computeLayout([], []).size).toBe(0);
  });

  it('places a linear chain in increasing x ranks', () => {
    const pos = computeLayout([n('a'), n('b'), n('c')], [e('a', 'b'), e('b', 'c')]);
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
    expect(pos.get('b')!.x).toBeLessThan(pos.get('c')!.x);
  });

  it('ranks a diamond correctly (join lands after both branches)', () => {
    const pos = computeLayout(
      [n('a'), n('b'), n('c'), n('d')],
      [e('a', 'b'), e('a', 'c'), e('b', 'd'), e('c', 'd')],
    );
    expect(pos.get('b')!.x).toBe(pos.get('c')!.x);
    expect(pos.get('d')!.x).toBeGreaterThan(pos.get('b')!.x);
    expect(pos.get('b')!.y).not.toBe(pos.get('c')!.y);
  });

  it('survives cycles without hanging and places every node', () => {
    const pos = computeLayout([n('a'), n('b')], [e('a', 'b'), e('b', 'a')]);
    expect(pos.size).toBe(2);
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
  });

  it('places disconnected nodes', () => {
    const pos = computeLayout([n('a'), n('lonely')], []);
    expect(pos.size).toBe(2);
  });

  it('ignores self-loops for ranking', () => {
    const pos = computeLayout([n('a'), n('b')], [e('a', 'a'), e('a', 'b')]);
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
  });

  it('ignores edges referencing unknown nodes', () => {
    const pos = computeLayout([n('a')], [e('a', 'ghost')]);
    expect(pos.size).toBe(1);
  });

  it('is deterministic', () => {
    const nodes = [n('a'), n('b'), n('c')];
    const edges = [e('a', 'b'), e('a', 'c')];
    expect(computeLayout(nodes, edges)).toEqual(computeLayout(nodes, edges));
  });

  it('offsets rank columns by the widest measured node', () => {
    const sizes = new Map([['a', { width: 400, height: 40 }]]);
    const wide = computeLayout([n('a'), n('b')], [e('a', 'b')], sizes);
    const narrow = computeLayout([n('a'), n('b')], [e('a', 'b')]);
    expect(wide.get('b')!.x - wide.get('a')!.x).toBeGreaterThan(
      narrow.get('b')!.x - narrow.get('a')!.x,
    );
    expect(ESTIMATED_NODE_SIZE.width).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/FlowCanvas/layout.test.ts
```

Expected: FAIL — cannot resolve `./layout`.

- [ ] **Step 3: Implement**

```ts
import type { FlowCanvasEdge, FlowCanvasNode, FlowCanvasPoint } from './types';

/** Measured (or estimated) rendered size of a node, in canvas units. */
export interface NodeSize {
  width: number;
  height: number;
}

/** Fallback node size used before ResizeObserver reports real ones (and in jsdom). */
export const ESTIMATED_NODE_SIZE: NodeSize = { width: 160, height: 40 };

const RANK_GAP = 96; // horizontal gap between rank columns
const NODE_GAP = 32; // vertical gap between nodes within a rank

/**
 * Layered auto-layout: longest-path ranks from the graph's sources flow
 * left → right; one barycenter pass orders nodes within a rank to reduce edge
 * crossings; ranks are vertically centered against the tallest rank.
 * Pure, deterministic, and cycle-safe (back-edges to on-stack nodes are
 * skipped). Self-loops and edges to unknown nodes are ignored.
 */
export function computeLayout(
  nodes: readonly FlowCanvasNode[],
  edges: readonly FlowCanvasEdge[],
  sizes?: ReadonlyMap<string, NodeSize>,
): Map<string, FlowCanvasPoint> {
  const result = new Map<string, FlowCanvasPoint>();
  if (nodes.length === 0) return result;

  const ids = new Set(nodes.map((node) => node.id));
  const out = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const node of nodes) {
    out.set(node.id, []);
    incoming.set(node.id, []);
    indegree.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    out.get(edge.from)!.push(edge.to);
    incoming.get(edge.to)!.push(edge.from);
    indegree.set(edge.to, indegree.get(edge.to)! + 1);
  }

  // Longest-path ranks, cycle-safe.
  const rank = new Map<string, number>();
  const onStack = new Set<string>();
  const visit = (id: string, r: number): void => {
    if (onStack.has(id)) return; // back-edge in a cycle
    const prev = rank.get(id);
    if (prev !== undefined && prev >= r) return;
    rank.set(id, r);
    onStack.add(id);
    for (const next of out.get(id)!) visit(next, r + 1);
    onStack.delete(id);
  };
  const sources = nodes.filter((node) => indegree.get(node.id) === 0);
  for (const source of sources.length > 0 ? sources : [nodes[0]]) visit(source.id, 0);
  for (const node of nodes) if (!rank.has(node.id)) rank.set(node.id, 0);

  // Bucket by rank in input order.
  const ranks: FlowCanvasNode[][] = [];
  for (const node of nodes) {
    const r = rank.get(node.id)!;
    (ranks[r] ??= []).push(node);
  }
  const orderIndex = new Map<string, number>();
  for (const bucket of ranks) bucket?.forEach((node, i) => orderIndex.set(node.id, i));

  // One barycenter pass: order each rank by the average order of predecessors.
  for (let r = 1; r < ranks.length; r++) {
    const bucket = ranks[r];
    if (!bucket) continue;
    const score = (node: FlowCanvasNode): number => {
      const preds = incoming.get(node.id)!;
      if (preds.length === 0) return orderIndex.get(node.id)!;
      return preds.reduce((sum, p) => sum + (orderIndex.get(p) ?? 0), 0) / preds.length;
    };
    bucket.sort((a, b) => score(a) - score(b) || orderIndex.get(a.id)! - orderIndex.get(b.id)!);
    bucket.forEach((node, i) => orderIndex.set(node.id, i));
  }

  // Position: x per rank column, y stacked and centered per rank.
  const sizeOf = (id: string): NodeSize => sizes?.get(id) ?? ESTIMATED_NODE_SIZE;
  const rankHeights = ranks.map((bucket) =>
    (bucket ?? []).reduce(
      (sum, node, i) => sum + sizeOf(node.id).height + (i > 0 ? NODE_GAP : 0),
      0,
    ),
  );
  const maxHeight = Math.max(0, ...rankHeights);
  let x = 0;
  for (let r = 0; r < ranks.length; r++) {
    const bucket = ranks[r] ?? [];
    let y = (maxHeight - (rankHeights[r] ?? 0)) / 2;
    let maxWidth = 0;
    for (const node of bucket) {
      result.set(node.id, { x, y });
      y += sizeOf(node.id).height + NODE_GAP;
      maxWidth = Math.max(maxWidth, sizeOf(node.id).width);
    }
    x += (maxWidth || ESTIMATED_NODE_SIZE.width) + RANK_GAP;
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/FlowCanvas/layout.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas/layout.ts src/components/FlowCanvas/layout.test.ts
git commit -m "feat(FlowCanvas): layered auto-layout module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `edgePath.ts` — bezier geometry (TDD)

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/edgePath.ts`
- Test: `packages/design-system/src/components/FlowCanvas/edgePath.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { edgeGeometry, selfLoopGeometry } from './edgePath';
import type { Rect } from './edgePath';

const rect = (x: number, y: number): Rect => ({ x, y, width: 100, height: 40 });

describe('edgeGeometry', () => {
  it('anchors horizontally when dx dominates (right side → left side)', () => {
    const g = edgeGeometry(rect(0, 0), rect(300, 0));
    expect(g.path).toMatch(/^M 100 20 C /); // source right-middle
    expect(g.path).toMatch(/300 20$/); // target left-middle
  });

  it('anchors vertically when dy dominates (bottom → top)', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 300));
    expect(g.path).toMatch(/^M 50 40 C /); // source bottom-middle
    expect(g.path).toMatch(/50 300$/); // target top-middle
  });

  it('flips anchors for right-to-left edges', () => {
    const g = edgeGeometry(rect(300, 0), rect(0, 0));
    expect(g.path).toMatch(/^M 300 20 C /); // source LEFT-middle
    expect(g.path).toMatch(/100 20$/); // target RIGHT-middle
  });

  it('midpoint is the true cubic midpoint (t = 0.5)', () => {
    const g = edgeGeometry(rect(0, 0), rect(300, 0));
    // symmetric horizontal curve → midpoint sits halfway between anchors
    expect(g.midpoint.x).toBe(200);
    expect(g.midpoint.y).toBe(20);
  });

  it('offsets a reverse pair so the two edges do not overlap', () => {
    const ab = edgeGeometry(rect(0, 0), rect(300, 0), 1);
    const ba = edgeGeometry(rect(300, 0), rect(0, 0), -1);
    expect(ab.path).not.toBe(ba.path);
    expect(ab.midpoint.y).not.toBe(ba.midpoint.y);
  });

  it('produces only finite numbers even for coincident rects', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 0));
    for (const value of g.path.match(/-?\d+(\.\d+)?/g)!.map(Number)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('selfLoopGeometry', () => {
  it('starts on the top edge and ends on the right edge of the node', () => {
    const g = selfLoopGeometry(rect(0, 0));
    expect(g.path).toMatch(/^M 75 0 C /);
    expect(g.path).toMatch(/100 10$/);
    expect(g.midpoint.y).toBeLessThan(0); // chip floats above the node
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
npx vitest run src/components/FlowCanvas/edgePath.test.ts
```

- [ ] **Step 3: Implement**

```ts
/** Axis-aligned rectangle in canvas coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** SVG path plus the chip anchor point for one edge. */
export interface EdgeGeometry {
  /** `d` attribute for the SVG `<path>`. */
  path: string;
  /** True cubic midpoint (t = 0.5) — where the label chip is anchored. */
  midpoint: Point;
}

const MIN_STRENGTH = 40; // minimum control-point pull so short edges still curve
const PAIR_SHIFT = 8; // endpoint offset when a reverse edge exists
const PAIR_BOW = 24; // extra control-point bow for reverse pairs

function cubic(p0: Point, c1: Point, c2: Point, p3: Point): EdgeGeometry {
  return {
    path: `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`,
    // De Casteljau at t = 0.5: (p0 + 3·c1 + 3·c2 + p3) / 8
    midpoint: {
      x: (p0.x + 3 * c1.x + 3 * c2.x + p3.x) / 8,
      y: (p0.y + 3 * c1.y + 3 * c2.y + p3.y) / 8,
    },
  };
}

/**
 * Bezier between two node rects. Anchors on the facing sides (horizontal when
 * |dx| ≥ |dy|, else vertical). `curvature` (±1) separates an A→B / B→A pair:
 * pass opposite signs so the two edges bow apart; 0 for a lone edge.
 */
export function edgeGeometry(source: Rect, target: Rect, curvature: -1 | 0 | 1 = 0): EdgeGeometry {
  const sc = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const tc = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  const bow = curvature * PAIR_BOW;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sign = dx >= 0 ? 1 : -1;
    const p0 = { x: sc.x + (sign * source.width) / 2, y: sc.y + curvature * PAIR_SHIFT };
    const p3 = { x: tc.x - (sign * target.width) / 2, y: tc.y + curvature * PAIR_SHIFT };
    const strength = Math.max(MIN_STRENGTH, Math.abs(p3.x - p0.x) / 2);
    return cubic(
      p0,
      { x: p0.x + sign * strength, y: p0.y + bow },
      { x: p3.x - sign * strength, y: p3.y + bow },
      p3,
    );
  }
  const sign = dy >= 0 ? 1 : -1;
  const p0 = { x: sc.x + curvature * PAIR_SHIFT, y: sc.y + (sign * source.height) / 2 };
  const p3 = { x: tc.x + curvature * PAIR_SHIFT, y: tc.y - (sign * target.height) / 2 };
  const strength = Math.max(MIN_STRENGTH, Math.abs(p3.y - p0.y) / 2);
  return cubic(
    p0,
    { x: p0.x + bow, y: p0.y + sign * strength },
    { x: p3.x + bow, y: p3.y - sign * strength },
    p3,
  );
}

/** Small loop arcing over a node's top-right corner, for self-referencing edges. */
export function selfLoopGeometry(rect: Rect): EdgeGeometry {
  const p0 = { x: rect.x + rect.width * 0.75, y: rect.y };
  const p3 = { x: rect.x + rect.width, y: rect.y + rect.height * 0.25 };
  return cubic(p0, { x: p0.x + 10, y: p0.y - 48 }, { x: p3.x + 48, y: p3.y - 10 }, p3);
}
```

- [ ] **Step 4: Run tests — expect PASS (8 tests)**

```bash
npx vitest run src/components/FlowCanvas/edgePath.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas/edgePath.ts src/components/FlowCanvas/edgePath.test.ts
git commit -m "feat(FlowCanvas): edge bezier geometry module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `spatialNav.ts` — arrow-key navigation (TDD)

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/spatialNav.ts`
- Test: `packages/design-system/src/components/FlowCanvas/spatialNav.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { nearestInDirection, topLeftMost } from './spatialNav';
import type { Rect } from './edgePath';

const rects = new Map<string, Rect>([
  ['a', { x: 0, y: 0, width: 100, height: 40 }],
  ['b', { x: 200, y: 0, width: 100, height: 40 }],
  ['c', { x: 200, y: 200, width: 100, height: 40 }],
  ['d', { x: 0, y: 200, width: 100, height: 40 }],
]);

describe('nearestInDirection', () => {
  it('finds the node to the right', () => {
    expect(nearestInDirection('a', rects, 'right')).toBe('b');
  });
  it('finds the node below', () => {
    expect(nearestInDirection('a', rects, 'down')).toBe('d');
  });
  it('prefers the aligned candidate over a closer diagonal one', () => {
    expect(nearestInDirection('d', rects, 'right')).toBe('c');
  });
  it('returns null at the boundary', () => {
    expect(nearestInDirection('b', rects, 'right')).toBeNull();
  });
  it('returns null for an unknown id', () => {
    expect(nearestInDirection('ghost', rects, 'left')).toBeNull();
  });
});

describe('topLeftMost', () => {
  it('picks the topmost-leftmost rect', () => {
    expect(topLeftMost(rects)).toBe('a');
  });
  it('returns null for an empty map', () => {
    expect(topLeftMost(new Map())).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
npx vitest run src/components/FlowCanvas/spatialNav.test.ts
```

- [ ] **Step 3: Implement**

```ts
import type { Rect } from './edgePath';

export type NavDirection = 'up' | 'down' | 'left' | 'right';

function center(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Nearest node in an arrow direction, judged by rect centers. Candidates must
 * lie strictly in that direction; off-axis distance is penalized 2× so
 * aligned neighbors win over closer diagonal ones. Returns null when nothing
 * lies that way.
 */
export function nearestInDirection(
  currentId: string,
  rects: ReadonlyMap<string, Rect>,
  direction: NavDirection,
): string | null {
  const current = rects.get(currentId);
  if (!current) return null;
  const cc = center(current);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, rect] of rects) {
    if (id === currentId) continue;
    const c = center(rect);
    const dx = c.x - cc.x;
    const dy = c.y - cc.y;
    let primary: number;
    let secondary: number;
    switch (direction) {
      case 'right':
        primary = dx;
        secondary = Math.abs(dy);
        break;
      case 'left':
        primary = -dx;
        secondary = Math.abs(dy);
        break;
      case 'down':
        primary = dy;
        secondary = Math.abs(dx);
        break;
      case 'up':
        primary = -dy;
        secondary = Math.abs(dx);
        break;
    }
    if (primary <= 0.5) continue;
    const score = primary + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/** Topmost node, ties broken by leftmost — the initial arrow-key focus target. */
export function topLeftMost(rects: ReadonlyMap<string, Rect>): string | null {
  let best: string | null = null;
  let bestRect: Rect | null = null;
  for (const [id, rect] of rects) {
    if (
      bestRect === null ||
      rect.y < bestRect.y ||
      (rect.y === bestRect.y && rect.x < bestRect.x)
    ) {
      best = id;
      bestRect = rect;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run tests — expect PASS (7 tests)**

```bash
npx vitest run src/components/FlowCanvas/spatialNav.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas/spatialNav.ts src/components/FlowCanvas/spatialNav.test.ts
git commit -m "feat(FlowCanvas): spatial arrow-key navigation module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: i18n keys (en + ru)

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts`
- Modify: `packages/design-system/src/i18n/en.ts`
- Modify: `packages/design-system/src/i18n/ru.ts`

- [ ] **Step 1: Read the three files** and mirror the existing structure exactly (nested object per namespace, JSDoc on every `Messages` key, `as string` / `as number` casts inside function leaves in the locale files — see `pagination.pageAriaLabel` for the pattern).

- [ ] **Step 2: Add to the `Messages` interface** (alphabetical position among namespaces, camelCase namespace `flowCanvas`):

```ts
flowCanvas: {
  /** aria-label for the canvas region when the consumer supplies none. */
  canvasLabel: string;
  /** Visually-hidden keyboard instructions referenced by aria-describedby. */
  instructions: string;
  /** aria-roledescription for node elements. */
  nodeRole: string;
  /** aria-roledescription for edge elements. */
  edgeRole: string;
  /** aria-label for the zoom-in control. */
  zoomIn: string;
  /** aria-label for the zoom-out control. */
  zoomOut: string;
  /** aria-label for the zoom-to-fit control. */
  zoomToFit: string;
  /** aria-label for an edge: "From X to Y". */
  edgeLabel: (params: { from: string; to: string }) => string;
  /** Live announcement when node focus moves. */
  nodeFocused: (params: { label: string; index: number; total: number }) => string;
  /** Live announcement when edge focus moves (E cycling). */
  edgeFocused: (params: { from: string; to: string; index: number; total: number }) => string;
  /** Live announcement when keyboard connect mode starts. */
  connectStart: (params: { label: string }) => string;
  /** Live announcement when the connect target changes. */
  connectTarget: (params: { label: string }) => string;
  /** Live announcement when a connection is requested. */
  connectDone: (params: { from: string; to: string }) => string;
  /** Live announcement when connect mode is cancelled. */
  connectCancelled: string;
  /** Live announcement after a node is moved (drag or keyboard nudge). */
  nodeMoved: (params: { label: string }) => string;
  /** Live announcement when the selection is cleared. */
  selectionCleared: string;
  /** Live announcement after zooming. */
  zoomLevel: (params: { percent: number }) => string;
}
```

- [ ] **Step 3: Add `en.ts` values**

```ts
flowCanvas: {
  canvasLabel: 'Flow canvas',
  instructions:
    'Use the arrow keys to move between nodes. Press Enter to open a node, Delete to delete it, and Shift plus an arrow key to move it. Press E to cycle through a node’s connections, C to start a new connection, plus and minus to zoom, and 0 to fit the diagram.',
  nodeRole: 'node',
  edgeRole: 'connection',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomToFit: 'Zoom to fit',
  edgeLabel: ({ from, to }) => `From ${from as string} to ${to as string}`,
  nodeFocused: ({ label, index, total }) =>
    `${label as string}, node ${index as number} of ${total as number}`,
  edgeFocused: ({ from, to, index, total }) =>
    `Connection from ${from as string} to ${to as string}, ${index as number} of ${total as number}`,
  connectStart: ({ label }) =>
    `Connecting from ${label as string}. Use the arrow keys to pick a target, Enter to confirm, Escape to cancel.`,
  connectTarget: ({ label }) => `Target: ${label as string}`,
  connectDone: ({ from, to }) => `Connected ${from as string} to ${to as string}`,
  connectCancelled: 'Connection cancelled',
  nodeMoved: ({ label }) => `${label as string} moved`,
  selectionCleared: 'Selection cleared',
  zoomLevel: ({ percent }) => `Zoom ${percent as number}%`,
},
```

- [ ] **Step 4: Add `ru.ts` values**

```ts
flowCanvas: {
  canvasLabel: 'Холст диаграммы',
  instructions:
    'Используйте стрелки для перехода между узлами. Enter — открыть узел, Delete — удалить, Shift со стрелкой — переместить. E — перебор связей узла, C — новая связь, плюс и минус — масштаб, 0 — вписать диаграмму.',
  nodeRole: 'узел',
  edgeRole: 'связь',
  zoomIn: 'Приблизить',
  zoomOut: 'Отдалить',
  zoomToFit: 'Показать всё',
  edgeLabel: ({ from, to }) => `Из «${from as string}» в «${to as string}»`,
  nodeFocused: ({ label, index, total }) =>
    `${label as string}, узел ${index as number} из ${total as number}`,
  edgeFocused: ({ from, to, index, total }) =>
    `Связь из «${from as string}» в «${to as string}», ${index as number} из ${total as number}`,
  connectStart: ({ label }) =>
    `Соединение из «${label as string}». Стрелки — выбор цели, Enter — подтвердить, Escape — отмена.`,
  connectTarget: ({ label }) => `Цель: ${label as string}`,
  connectDone: ({ from, to }) => `Соединено: «${from as string}» → «${to as string}»`,
  connectCancelled: 'Соединение отменено',
  nodeMoved: ({ label }) => `«${label as string}» перемещён`,
  selectionCleared: 'Выделение снято',
  zoomLevel: ({ percent }) => `Масштаб ${percent as number}%`,
},
```

- [ ] **Step 5: Typecheck (TS enforces en/ru parity) and run the i18n tests**

```bash
npm run typecheck && npx vitest run src/i18n
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/i18n && git commit -m "feat(FlowCanvas): i18n strings (en, ru)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Tokens + SCSS

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tokens.scss`
- Create: `packages/design-system/src/components/FlowCanvas/FlowCanvas.module.scss`

- [ ] **Step 1: Write `FlowCanvas.tokens.scss`** (every value references a primitive — all names below verified to exist in `src/styles/tokens.scss`):

```scss
// Component tokens for FlowCanvas. Every token defaults to a primitive so the
// resolved values match the global theme; consumers can retheme by overriding
// these custom properties.
:root {
  --flow-canvas-bg: var(--color-bg-sunken);
  --flow-canvas-grid-dot: var(--color-border);
  --flow-canvas-grid-size: var(--space-4);
  --flow-node-bg: var(--color-bg);
  --flow-node-border: var(--color-border);
  --flow-node-radius: var(--radius-md);
  --flow-node-shadow: var(--shadow-sm);
  --flow-node-accent-width: var(--space-1);
  --flow-node-color: var(--color-accent);
  --flow-node-gap: var(--space-2);
  --flow-node-padding-y: var(--space-2);
  --flow-node-padding-x: var(--space-3);
  --flow-edge-stroke: var(--color-fg-subtle);
  --flow-edge-stroke-active: var(--color-accent);
  --flow-edge-width: var(--border-width-emphasis);
  --flow-edge-hit-width: var(--space-3);
  --flow-chip-bg: var(--color-bg);
  --flow-chip-border: var(--color-border);
  --flow-chip-radius: var(--radius-full);
  --flow-handle-size: var(--space-3);
  --flow-handle-bg: var(--color-accent);
}
```

- [ ] **Step 2: Write `FlowCanvas.module.scss`**

```scss
@use './FlowCanvas.tokens';
@use '../../styles/mixins';

.root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--flow-canvas-bg);
  background-image: radial-gradient(var(--flow-canvas-grid-dot) 1px, transparent 1px);
  background-size: var(--flow-canvas-grid-size) var(--flow-canvas-grid-size);
  border-radius: var(--flow-node-radius);
  touch-action: none; // claim touch drags so the page doesn't scroll instead
  cursor: grab;

  &:focus-visible {
    outline: none;
    box-shadow: var(--ring-accent);
  }
}

.rootPanning {
  cursor: grabbing;
}

.stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.edges {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}

.edgePath {
  fill: none;
  pointer-events: none;
  stroke: var(--flow-edge-stroke);
  stroke-width: var(--flow-edge-width);
}

.edgePath[data-active='true'] {
  stroke: var(--flow-edge-stroke-active);
}

.edgeHit {
  fill: none;
  cursor: pointer;
  pointer-events: stroke;
  stroke: transparent;
  stroke-width: var(--flow-edge-hit-width);

  &:focus-visible {
    outline: none;
  }
}

.ghostEdge {
  fill: none;
  pointer-events: none;
  stroke: var(--flow-edge-stroke-active);
  stroke-dasharray: var(--space-1) var(--space-1);
  stroke-width: var(--flow-edge-width);
}

.node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: var(--flow-node-gap);
  padding: var(--flow-node-padding-y) var(--flow-node-padding-x);
  background: var(--flow-node-bg);
  border: var(--border-width) solid var(--flow-node-border);
  border-left: var(--flow-node-accent-width) solid var(--flow-node-color);
  border-radius: var(--flow-node-radius);
  box-shadow: var(--flow-node-shadow);
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:focus-visible {
    outline: none;
    box-shadow: var(--ring-accent);
  }
}

.node[data-selected='true'] {
  border-color: var(--color-accent);
  box-shadow: var(--ring-accent);
}

.node[data-dragging='true'] {
  cursor: grabbing;
  box-shadow: var(--shadow-lg);
}

.node[data-connect-target='true'] {
  box-shadow: var(--ring-success);
}

.nodeLabel {
  white-space: nowrap;
}

.handle {
  position: absolute;
  top: 50%;
  right: 0;
  width: var(--flow-handle-size);
  height: var(--flow-handle-size);
  background: var(--flow-handle-bg);
  border-radius: var(--radius-full);
  cursor: crosshair;
  opacity: var(--opacity-hidden);
  transform: translate(50%, -50%);
  transition: opacity var(--transition-fast);
}

.node:hover .handle,
.node:focus-visible .handle {
  opacity: var(--opacity-visible);
}

.chip {
  position: absolute;
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.controls {
  position: absolute;
  bottom: var(--space-3);
  left: var(--space-3);
  display: flex;
  gap: var(--space-1);
}

.srOnly {
  @include mixins.visually-hidden;
}

@media (prefers-reduced-motion: reduce) {
  .handle {
    /* stylelint-disable-next-line declaration-no-important */
    transition: none !important;
  }
}
```

Check `--font-size-sm` / `--font-weight-medium` exist in `tokens.scss` (`grep -- '--font' src/styles/tokens.scss`); substitute the actual small-size and medium-weight token names if they differ. If stylelint objects to `1px` inside `radial-gradient`, it is a color-function argument, not a declaration value — but if it still complains, add the dot size as `--flow-canvas-grid-dot-size: var(--border-width)` and interpolate.

- [ ] **Step 3: Lint**

```bash
cd /Users/dpws/projects/design-system && make lint
```

Expected: clean (structure test will still fail until Task 8 adds the remaining files — that's fine, don't run `make test` yet).

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas
git commit -m "feat(FlowCanvas): tokens and styles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Static rendering — FlowNode, FlowEdge, FlowControls, minimal FlowCanvas (TDD)

Renders nodes + edges from data with correct ARIA; no interactions yet. After this task `structure.test.ts`'s file-presence invariants for `FlowCanvas/` are satisfiable (all four required files exist).

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/FlowNode.tsx`
- Create: `packages/design-system/src/components/FlowCanvas/FlowEdge.tsx`
- Create: `packages/design-system/src/components/FlowCanvas/FlowControls.tsx`
- Create: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Create: `packages/design-system/src/components/FlowCanvas/index.ts`
- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests** (first slice of `FlowCanvas.test.tsx`; the file grows in later tasks):

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
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
```

Note: if `toBeInTheDocument` matchers aren't set up globally, mirror whatever the Kanban/Slider tests use (`expect(x).not.toBeNull()` style) — check `src/components/Kanban/Kanban.test.tsx` first and match it.

- [ ] **Step 2: Run — expect FAIL (components missing)**

```bash
npx vitest run src/components/FlowCanvas/FlowCanvas.test.tsx
```

- [ ] **Step 3: Implement `FlowNode.tsx`**

```tsx
import { memo } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { FlowCanvasNode, FlowCanvasPoint } from './types';
import styles from './FlowCanvas.module.scss';

interface FlowNodeProps {
  node: FlowCanvasNode;
  position: FlowCanvasPoint;
  selected: boolean;
  dragging: boolean;
  connectTarget: boolean;
  readOnly: boolean;
  roleDescription: string;
  registerEl: (id: string, el: HTMLDivElement | null) => void;
  onNodePointerDown: (id: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onNodeDoubleClick: (id: string) => void;
  onHandlePointerDown: (id: string, event: ReactPointerEvent<HTMLElement>) => void;
}

/** Internal: one node card. Positioned absolutely on the stage. */
export const FlowNode = memo(function FlowNode({
  node,
  position,
  selected,
  dragging,
  connectTarget,
  readOnly,
  roleDescription,
  registerEl,
  onNodePointerDown,
  onNodeDoubleClick,
  onHandlePointerDown,
}: FlowNodeProps) {
  const style: CSSProperties = { left: position.x, top: position.y };
  if (node.color) (style as Record<string, string | number>)['--flow-node-color'] = node.color;
  return (
    // role=button: activatable via Enter (open); roledescription localizes "node".
    <div
      ref={(el) => registerEl(node.id, el)}
      role="button"
      tabIndex={-1}
      aria-roledescription={roleDescription}
      aria-label={node.label}
      data-flow-node={node.id}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
      data-connect-target={connectTarget || undefined}
      className={styles.node}
      style={style}
      onPointerDown={(event) => onNodePointerDown(node.id, event)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onNodeDoubleClick(node.id);
      }}
    >
      <span className={styles.nodeLabel}>{node.label}</span>
      {node.adornment != null ? <span>{node.adornment}</span> : null}
      {!readOnly ? (
        <span
          aria-hidden="true"
          className={styles.handle}
          data-flow-handle=""
          onPointerDown={(event) => {
            event.stopPropagation();
            onHandlePointerDown(node.id, event);
          }}
        />
      ) : null}
    </div>
  );
});
```

- [ ] **Step 4: Implement `FlowEdge.tsx`**

```tsx
import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EdgeGeometry } from './edgePath';
import type { FlowCanvasEdge } from './types';
import styles from './FlowCanvas.module.scss';

interface FlowEdgeProps {
  edge: FlowCanvasEdge;
  geometry: EdgeGeometry;
  active: boolean; // selected or focused — thicker accent stroke
  markerId: string;
  markerActiveId: string;
  ariaLabel: string;
  roleDescription: string;
  registerEl: (id: string, el: SVGPathElement | null) => void;
  onEdgePointerDown: (id: string, event: ReactPointerEvent<SVGPathElement>) => void;
  onEdgeDoubleClick: (id: string) => void;
}

/** Internal: one edge — visible path plus a wide transparent hit/focus path. */
export const FlowEdge = memo(function FlowEdge({
  edge,
  geometry,
  active,
  markerId,
  markerActiveId,
  ariaLabel,
  roleDescription,
  registerEl,
  onEdgePointerDown,
  onEdgeDoubleClick,
}: FlowEdgeProps) {
  return (
    <g>
      <path
        className={styles.edgePath}
        d={geometry.path}
        data-active={active || undefined}
        markerEnd={`url(#${active ? markerActiveId : markerId})`}
      />
      <path
        ref={(el) => registerEl(edge.id, el)}
        className={styles.edgeHit}
        d={geometry.path}
        role="button"
        tabIndex={-1}
        aria-roledescription={roleDescription}
        aria-label={ariaLabel}
        data-flow-edge={edge.id}
        onPointerDown={(event) => onEdgePointerDown(edge.id, event)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEdgeDoubleClick(edge.id);
        }}
      />
    </g>
  );
});
```

- [ ] **Step 5: Implement `FlowControls.tsx`**

```tsx
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../Button';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './FlowCanvas.module.scss';

interface FlowControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

/** Internal: the bottom-left zoom control cluster. */
export function FlowControls({ onZoomIn, onZoomOut, onFit }: FlowControlsProps) {
  const t = useTranslation();
  return (
    <div className={styles.controls} data-flow-controls="">
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t('flowCanvas.zoomIn')}
        onClick={onZoomIn}
      >
        <ZoomIn size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t('flowCanvas.zoomOut')}
        onClick={onZoomOut}
      >
        <ZoomOut size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t('flowCanvas.zoomToFit')}
        onClick={onFit}
      >
        <Maximize size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
```

Check `ButtonProps` first (`grep -n "variant\|iconOnly\|size" src/components/Button/Button.tsx | head`) and match its actual variant/size union (e.g. `'secondary'` may be `'default'` — use whatever the neutral variant is called).

- [ ] **Step 6: Implement the minimal `FlowCanvas.tsx`**

This is the orchestrator skeleton later tasks extend. Full JSDoc lands in Task 13; write a short JSDoc now.

```tsx
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeAriaDescribedby, mergeRefs, sanitizeId } from '../_internal/refs';
import { useControllableState } from '../_internal/useControllableState';
import { computeLayout, ESTIMATED_NODE_SIZE } from './layout';
import type { NodeSize } from './layout';
import { edgeGeometry, selfLoopGeometry } from './edgePath';
import type { Rect } from './edgePath';
import { FlowControls } from './FlowControls';
import { FlowEdge } from './FlowEdge';
import { FlowNode } from './FlowNode';
import type { FlowCanvasEdge, FlowCanvasNode, FlowCanvasPoint, FlowCanvasSelection } from './types';
import styles from './FlowCanvas.module.scss';

export interface FlowCanvasProps extends HTMLAttributes<HTMLDivElement> {
  /** Nodes to render. The canvas never mutates this array. */
  nodes: FlowCanvasNode[];
  /** Directed edges between nodes. Edges referencing unknown ids are skipped (dev warning). */
  edges: FlowCanvasEdge[];
  /** Called when the user requests a node at a canvas point (double-click empty canvas). */
  onNodeCreate?: (position: FlowCanvasPoint) => void;
  /** Called when a node's position is committed (drag end, keyboard nudge). */
  onNodeMove?: (id: string, position: FlowCanvasPoint) => void;
  /** Called when a node is opened (Enter/Space or double-click). */
  onNodeOpen?: (id: string) => void;
  /** Called when deletion of the selected node is requested (Delete/Backspace). */
  onNodeDelete?: (id: string) => void;
  /** Called when the user draws or confirms a connection between two nodes. */
  onEdgeCreate?: (from: string, to: string) => void;
  /** Called when an edge is opened (Enter/Space or double-click). */
  onEdgeOpen?: (id: string) => void;
  /** Called when deletion of the selected edge is requested (Delete/Backspace). */
  onEdgeDelete?: (id: string) => void;
  /**
   * Live validation while drawing a connection. Invalid targets can't be
   * dropped on (pointer) and are skipped (keyboard).
   * @default rejects self-loops and duplicate (from, to) pairs
   */
  isValidConnection?: (from: string, to: string) => boolean;
  /** Controlled selection. Use with `onSelectionChange`. */
  selection?: FlowCanvasSelection;
  /** Initial selection when uncontrolled. @default null */
  defaultSelection?: FlowCanvasSelection;
  /** Fires whenever the selection changes (click, focus, Escape). */
  onSelectionChange?: (selection: FlowCanvasSelection) => void;
  /**
   * Render-only mode: create/move/connect/delete are disabled; selection and
   * open still work. @default false
   */
  readOnly?: boolean;
}

export const FlowCanvas = forwardRef<HTMLDivElement, FlowCanvasProps>(function FlowCanvas(
  {
    nodes,
    edges,
    onNodeCreate,
    onNodeMove,
    onNodeOpen,
    onNodeDelete,
    onEdgeCreate,
    onEdgeOpen,
    onEdgeDelete,
    isValidConnection,
    selection: selectionProp,
    defaultSelection = null,
    onSelectionChange,
    readOnly = false,
    className,
    'aria-describedby': ariaDescribedby,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const uid = sanitizeId(useId());
  const instructionsId = `flow-instructions-${uid}`;
  const markerId = `flow-arrow-${uid}`;
  const markerActiveId = `flow-arrow-active-${uid}`;

  const [selection, setSelection] = useControllableState<FlowCanvasSelection>({
    value: selectionProp,
    defaultValue: defaultSelection,
    onChange: onSelectionChange,
  });

  // --- node registry + measurement -----------------------------------------
  const nodeEls = useRef(new Map<string, HTMLDivElement>());
  const edgeEls = useRef(new Map<string, SVGPathElement>());
  const [sizes, setSizes] = useState<Map<string, NodeSize>>(new Map());
  const registerNodeEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeEls.current.set(id, el);
    else nodeEls.current.delete(id);
  }, []);
  const registerEdgeEl = useCallback((id: string, el: SVGPathElement | null) => {
    if (el) edgeEls.current.set(id, el);
    else edgeEls.current.delete(id);
  }, []);

  const nodeIdsKey = nodes.map((n) => n.id).join(' ');
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return; // jsdom — estimates are used
    const observer = new ResizeObserver(() => {
      const next = new Map<string, NodeSize>();
      for (const [id, el] of nodeEls.current) {
        next.set(id, { width: el.offsetWidth, height: el.offsetHeight });
      }
      setSizes(next);
    });
    for (const el of nodeEls.current.values()) observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-observe when the node set changes
  }, [nodeIdsKey]);

  // --- positions: explicit prop > session drag override > auto-layout ------
  const [dragOverrides, setDragOverrides] = useState<Map<string, FlowCanvasPoint>>(new Map());
  const layoutPositions = useMemo(() => computeLayout(nodes, edges, sizes), [nodes, edges, sizes]);
  const positionOf = useCallback(
    (node: FlowCanvasNode): FlowCanvasPoint =>
      node.position ?? dragOverrides.get(node.id) ?? layoutPositions.get(node.id) ?? { x: 0, y: 0 },
    [dragOverrides, layoutPositions],
  );
  const rects = useMemo(() => {
    const map = new Map<string, Rect>();
    for (const node of nodes) {
      const pos = positionOf(node);
      const size = sizes.get(node.id) ?? ESTIMATED_NODE_SIZE;
      map.set(node.id, { x: pos.x, y: pos.y, width: size.width, height: size.height });
    }
    return map;
  }, [nodes, positionOf, sizes]);

  // --- edges: resolve + skip broken ones (one-time dev warning) ------------
  const warnedEdges = useRef(new Set<string>());
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const resolvedEdges = useMemo(() => {
    const reverse = new Set(edges.map((e) => `${e.to} ${e.from}`));
    return edges.flatMap((edge) => {
      const source = rects.get(edge.from);
      const target = rects.get(edge.to);
      if (!source || !target) {
        if (process.env.NODE_ENV !== 'production' && !warnedEdges.current.has(edge.id)) {
          warnedEdges.current.add(edge.id);
          console.warn(
            `[FlowCanvas] edge "${edge.id}" references a missing node (${edge.from} → ${edge.to}) and was skipped.`,
          );
        }
        return [];
      }
      const geometry =
        edge.from === edge.to
          ? selfLoopGeometry(source)
          : edgeGeometry(
              source,
              target,
              reverse.has(`${edge.from} ${edge.to}`) ? (edge.from < edge.to ? 1 : -1) : 0,
            );
      return [{ edge, geometry }];
    });
  }, [edges, rects]);

  // Placeholder handlers — wired up in later tasks.
  const handleNodePointerDown = useCallback(
    (_id: string, _event: ReactPointerEvent<HTMLDivElement>) => {},
    [],
  );
  const handleHandlePointerDown = useCallback(
    (_id: string, _event: ReactPointerEvent<HTMLElement>) => {},
    [],
  );
  const handleEdgePointerDown = useCallback(
    (_id: string, _event: ReactPointerEvent<SVGPathElement>) => {},
    [],
  );
  const handleNodeDoubleClick = useCallback((id: string) => onNodeOpen?.(id), [onNodeOpen]);
  const handleEdgeDoubleClick = useCallback((id: string) => onEdgeOpen?.(id), [onEdgeOpen]);

  const setRootRef = useMemo(() => mergeRefs(rootRef, ref), [ref]);

  return (
    // aria-label before {...rest} so consumers can override it; role/tabIndex
    // after so the application-widget contract survives whatever is spread.
    <div
      aria-label={t('flowCanvas.canvasLabel')}
      {...rest}
      ref={setRootRef}
      role="application"
      tabIndex={0}
      aria-describedby={mergeAriaDescribedby(ariaDescribedby, instructionsId)}
      className={clsx(styles.root, className)}
    >
      <div
        className={styles.stage}
        data-flow-stage=""
        style={{ transform: 'translate(0px, 0px) scale(1)' }}
      >
        <svg className={styles.edges} aria-hidden={undefined}>
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={styles.markerFill} />
            </marker>
            <marker
              id={markerActiveId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={styles.markerFillActive} />
            </marker>
          </defs>
          {resolvedEdges.map(({ edge, geometry }) => (
            <FlowEdge
              key={edge.id}
              edge={edge}
              geometry={geometry}
              active={selection?.type === 'edge' && selection.id === edge.id}
              markerId={markerId}
              markerActiveId={markerActiveId}
              ariaLabel={t('flowCanvas.edgeLabel', {
                from: nodeById.get(edge.from)?.label ?? edge.from,
                to: nodeById.get(edge.to)?.label ?? edge.to,
              })}
              roleDescription={t('flowCanvas.edgeRole')}
              registerEl={registerEdgeEl}
              onEdgePointerDown={handleEdgePointerDown}
              onEdgeDoubleClick={handleEdgeDoubleClick}
            />
          ))}
        </svg>
        {resolvedEdges.map(({ edge, geometry }) =>
          edge.label != null ? (
            <div
              key={`chip-${edge.id}`}
              className={styles.chip}
              data-flow-chip={edge.id}
              style={{ left: geometry.midpoint.x, top: geometry.midpoint.y }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onEdgeOpen?.(edge.id);
              }}
            >
              {edge.label}
            </div>
          ) : null,
        )}
        {nodes.map((node) => (
          <FlowNode
            key={node.id}
            node={node}
            position={positionOf(node)}
            selected={selection?.type === 'node' && selection.id === node.id}
            dragging={false}
            connectTarget={false}
            readOnly={readOnly}
            roleDescription={t('flowCanvas.nodeRole')}
            registerEl={registerNodeEl}
            onNodePointerDown={handleNodePointerDown}
            onNodeDoubleClick={handleNodeDoubleClick}
            onHandlePointerDown={handleHandlePointerDown}
          />
        ))}
      </div>
      <FlowControls onZoomIn={() => {}} onZoomOut={() => {}} onFit={() => {}} />
      <div id={instructionsId} className={styles.srOnly}>
        {t('flowCanvas.instructions')}
      </div>
      <div role="status" className={styles.srOnly} />
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';
```

Add the two marker classes to `FlowCanvas.module.scss`:

```scss
.markerFill {
  fill: var(--flow-edge-stroke);
}

.markerFillActive {
  fill: var(--flow-edge-stroke-active);
}
```

- [ ] **Step 7: Write `index.ts`**

```ts
export { FlowCanvas } from './FlowCanvas';
export type { FlowCanvasProps } from './FlowCanvas';
export type { FlowCanvasNode, FlowCanvasEdge, FlowCanvasSelection, FlowCanvasPoint } from './types';
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
npx vitest run src/components/FlowCanvas/FlowCanvas.test.tsx && npm run typecheck
```

If `selection` (the `useControllableState` value) can be `undefined` when `defaultSelection` is omitted, the destructure default `defaultSelection = null` covers it — verify no TS complaints.

- [ ] **Step 9: Commit**

```bash
git add src/components/FlowCanvas
git commit -m "feat(FlowCanvas): static node/edge rendering with ARIA scaffolding

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: `useViewport` — pan/zoom/fit + wheel + controls (TDD)

**Files:**

- Create: `packages/design-system/src/components/FlowCanvas/useViewport.ts`
- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Test: append to `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests** (append):

```tsx
import { fireEvent } from '@testing-library/react';

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
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `useViewport.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface Viewport {
  tx: number;
  ty: number;
  z: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 1.2;
export const PAN_STEP = 40;

export interface FitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pan/zoom state for the canvas stage. Wheel: plain scroll pans, ctrl/cmd
 * zooms toward the cursor (native non-passive listener — React's onWheel
 * can't preventDefault reliably). Fit is a no-op when the root has no
 * measurable size (jsdom, display: none).
 */
export function useViewport(rootRef: RefObject<HTMLDivElement | null>) {
  const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, z: 1 });

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  }, []);

  const zoomBy = useCallback(
    (factor: number, clientCenter?: { x: number; y: number }) => {
      const rect = rootRef.current?.getBoundingClientRect();
      setViewport((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * factor));
        if (z === v.z) return v;
        const cx = clientCenter && rect ? clientCenter.x - rect.left : (rect?.width ?? 0) / 2;
        const cy = clientCenter && rect ? clientCenter.y - rect.top : (rect?.height ?? 0) / 2;
        // Keep the canvas point under (cx, cy) stationary while scaling.
        const px = (cx - v.tx) / v.z;
        const py = (cy - v.ty) / v.z;
        return { tx: cx - px * z, ty: cy - py * z, z };
      });
    },
    [rootRef],
  );

  const fitTo = useCallback(
    (bounds: FitBounds | null) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!bounds || !rect || rect.width === 0 || rect.height === 0) return;
      if (bounds.width === 0 || bounds.height === 0) return;
      const pad = 32;
      const z = Math.min(
        1,
        Math.max(
          MIN_ZOOM,
          Math.min((rect.width - pad * 2) / bounds.width, (rect.height - pad * 2) / bounds.height),
        ),
      );
      setViewport({
        tx: (rect.width - bounds.width * z) / 2 - bounds.x * z,
        ty: (rect.height - bounds.height * z) / 2 - bounds.y * z,
        z,
      });
    },
    [rootRef],
  );

  // Native wheel listener: React attaches wheel passively, so preventDefault
  // (needed to stop page scroll/browser zoom) requires a manual listener.
  const zoomByRef = useRef(zoomBy);
  zoomByRef.current = zoomBy;
  const panByRef = useRef(panBy);
  panByRef.current = panBy;
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomByRef.current(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, {
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        panByRef.current(-event.deltaX, -event.deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [rootRef]);

  return { viewport, panBy, zoomBy, fitTo, setViewport };
}
```

- [ ] **Step 4: Wire into `FlowCanvas.tsx`**

Add imports and hook usage:

```tsx
import { MAX_ZOOM, MIN_ZOOM, PAN_STEP, ZOOM_STEP, useViewport } from './useViewport';
```

Inside the component:

```tsx
const { viewport, panBy, zoomBy, fitTo } = useViewport(rootRef);
const [announcement, setAnnouncement] = useState('');
const announce = useCallback((message: string) => setAnnouncement(message), []);

const contentBounds = useMemo(() => {
  if (rects.size === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const rect of rects.values()) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}, [rects]);

// Fit once on mount (skipped when the root has no size, e.g. jsdom).
const didFit = useRef(false);
useEffect(() => {
  if (didFit.current || !contentBounds) return;
  didFit.current = true;
  fitTo(contentBounds);
}, [contentBounds, fitTo]);

const zoomIn = useCallback(() => {
  zoomBy(ZOOM_STEP);
}, [zoomBy]);
const zoomOut = useCallback(() => {
  zoomBy(1 / ZOOM_STEP);
}, [zoomBy]);
```

Announce the zoom level after changes — add an effect keyed on `viewport.z` (skip the initial render):

```tsx
const lastZoom = useRef(viewport.z);
useEffect(() => {
  if (viewport.z !== lastZoom.current) {
    lastZoom.current = viewport.z;
    announce(t('flowCanvas.zoomLevel', { percent: Math.round(viewport.z * 100) }));
  }
}, [viewport.z, announce, t]);
```

Background pan (replace nothing — add root handlers). Pan starts only when the press is on empty canvas (not node/edge/chip/controls):

```tsx
const panState = useRef<{
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
} | null>(null);
const isBackgroundTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  return !el?.closest?.(
    '[data-flow-node], [data-flow-edge], [data-flow-chip], [data-flow-controls], [data-flow-handle]',
  );
};

const handleRootPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
  if (event.button !== 0 || !isBackgroundTarget(event.target)) return;
  panState.current = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    /* jsdom */
  }
};
const handleRootPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
  const pan = panState.current;
  if (!pan || event.pointerId !== pan.pointerId) return;
  const dx = event.clientX - pan.startX;
  const dy = event.clientY - pan.startY;
  if (!pan.moved && Math.abs(dx) + Math.abs(dy) < 3) return; // click tolerance
  pan.moved = true;
  pan.startX = event.clientX;
  pan.startY = event.clientY;
  panBy(dx, dy);
};
const handleRootPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
  const pan = panState.current;
  if (!pan || event.pointerId !== pan.pointerId) return;
  panState.current = null;
  if (!pan.moved) {
    setSelection(null); // click on empty canvas clears selection
    announce(t('flowCanvas.selectionCleared'));
  }
};
```

Root keydown (this task adds only the viewport keys; later tasks extend the same handler):

```tsx
const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
  const { key, ctrlKey, metaKey } = event;
  if ((ctrlKey || metaKey) && key.startsWith('Arrow')) {
    event.preventDefault();
    if (key === 'ArrowRight') panBy(-PAN_STEP, 0);
    else if (key === 'ArrowLeft') panBy(PAN_STEP, 0);
    else if (key === 'ArrowDown') panBy(0, -PAN_STEP);
    else if (key === 'ArrowUp') panBy(0, PAN_STEP);
    return;
  }
  if (key === '+' || key === '=') {
    event.preventDefault();
    zoomIn();
    return;
  }
  if (key === '-' || key === '_') {
    event.preventDefault();
    zoomOut();
    return;
  }
  if (key === '0') {
    event.preventDefault();
    fitTo(contentBounds);
    return;
  }
};
```

Wire into JSX: root gets `onPointerDown={handleRootPointerDown}`, `onPointerMove={handleRootPointerMove}`, `onPointerUp={handleRootPointerUp}`, `onPointerCancel={handleRootPointerUp}`, `onKeyDown={handleRootKeyDown}`, and `className={clsx(styles.root, panState.current?.moved && styles.rootPanning, className)}`. The stage `style` becomes:

```tsx
style={{ transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.z})` }}
```

`FlowControls` gets real callbacks: `onZoomIn={zoomIn}`, `onZoomOut={zoomOut}`, `onFit={() => fitTo(contentBounds)}`. The live region renders the announcement: `<div role="status" className={styles.srOnly}>{announcement}</div>`.

Note on ctrl+arrow pan directions: panning moves the _stage_ opposite to the "look direction" — ArrowRight looks right, stage shifts left (`tx -40`). The test above asserts this.

- [ ] **Step 5: Run tests — expect PASS. Also re-run the full component suite.**

```bash
npx vitest run src/components/FlowCanvas && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/components/FlowCanvas
git commit -m "feat(FlowCanvas): pan/zoom viewport with wheel, keys, and controls

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Selection, click/double-click intents, Delete, create (TDD)

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Test: append to `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests** (append):

```tsx
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
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement in `FlowCanvas.tsx`**

Replace the placeholder pointer handlers. Node pointer-down: select immediately (drag logic arrives in Task 11 — structure the handler so Task 11 can extend it):

```tsx
const handleNodePointerDown = useCallback(
  (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelection({ type: 'node', id });
  },
  [setSelection],
);

const handleEdgePointerDown = useCallback(
  (id: string, event: ReactPointerEvent<SVGPathElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelection({ type: 'edge', id });
  },
  [setSelection],
);
```

Canvas-coordinate conversion + root double-click:

```tsx
const toCanvasPoint = useCallback(
  (clientX: number, clientY: number): FlowCanvasPoint => {
    const rect = rootRef.current?.getBoundingClientRect();
    const x = (clientX - (rect?.left ?? 0) - viewport.tx) / viewport.z;
    const y = (clientY - (rect?.top ?? 0) - viewport.ty) / viewport.z;
    return { x, y };
  },
  [viewport],
);

const handleRootDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
  if (readOnly || !isBackgroundTarget(event.target)) return;
  onNodeCreate?.(toCanvasPoint(event.clientX, event.clientY));
};
```

(add `MouseEvent as ReactMouseEvent` to the react type imports; wire `onDoubleClick={handleRootDoubleClick}` on the root).

Extend `handleRootKeyDown` — guard first so keys only act when the event target is the canvas itself, a node, or an edge (never the consumer's interactive adornment content):

```tsx
const targetEl = event.target as HTMLElement;
const isCanvasKeyTarget =
  targetEl === event.currentTarget ||
  targetEl.hasAttribute('data-flow-node') ||
  targetEl.hasAttribute('data-flow-edge');
if (!isCanvasKeyTarget) return;
```

then after the viewport keys:

```tsx
if (key === 'Delete' || key === 'Backspace') {
  if (readOnly || !selection) return;
  event.preventDefault();
  if (selection.type === 'node') onNodeDelete?.(selection.id);
  else onEdgeDelete?.(selection.id);
  return;
}
if (key === 'Escape') {
  if (selection) {
    setSelection(null);
    announce(t('flowCanvas.selectionCleared'));
  }
  return;
}
if (key === 'Enter' || key === ' ') {
  if (!selection) return;
  event.preventDefault();
  if (selection.type === 'node') onNodeOpen?.(selection.id);
  else onEdgeOpen?.(selection.id);
  return;
}
```

Also gate `handleNodeDoubleClick`'s create-path under `readOnly`? No — open stays allowed in readOnly (spec). Only `onNodeCreate` (above), delete, move, and connect are gated.

Chip pointer-down should select its edge too — add to the chip div:

```tsx
onPointerDown={(event) => {
  if (event.button !== 0) return;
  event.stopPropagation();
  setSelection({ type: 'edge', id: edge.id });
}}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/FlowCanvas && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas
git commit -m "feat(FlowCanvas): selection, open/create/delete intents

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Node dragging + keyboard nudge (TDD)

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Test: append to `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests** (append):

```tsx
const mockRootRect = (root: HTMLElement) => {
  root.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
};

describe('FlowCanvas node dragging', () => {
  it('drag commits onNodeMove with the delta in canvas units', () => {
    const onNodeMove = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onNodeMove={onNodeMove} />);
    mockRootRect(screen.getByRole('application'));
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

  it('positionless nodes keep their dragged position for the session', () => {
    render(<FlowCanvas nodes={[{ id: 'a', label: 'A' }]} edges={[]} />);
    mockRootRect(screen.getByRole('application'));
    const node = screen.getByLabelText('A');
    const startLeft = parseFloat(node.style.left);
    fireEvent.pointerDown(node, { clientX: 0, clientY: 0, pointerId: 1, button: 0 });
    fireEvent.pointerMove(node, { clientX: 25, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(node, { clientX: 25, clientY: 0, pointerId: 1 });
    expect(parseFloat(node.style.left)).toBe(startLeft + 25);
  });

  it('controlled nodes snap back unless the consumer persists the move', () => {
    render(<FlowCanvas nodes={NODES} edges={[]} />);
    mockRootRect(screen.getByRole('application'));
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
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Add drag state (live positions during the gesture) next to `dragOverrides`:

```tsx
const [liveDrag, setLiveDrag] = useState<{ id: string; position: FlowCanvasPoint } | null>(null);
const dragState = useRef<{
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: FlowCanvasPoint;
  moved: boolean;
} | null>(null);
```

Update `positionOf` so a live drag wins over everything:

```tsx
const positionOf = useCallback(
  (node: FlowCanvasNode): FlowCanvasPoint => {
    if (liveDrag?.id === node.id) return liveDrag.position;
    return (
      node.position ?? dragOverrides.get(node.id) ?? layoutPositions.get(node.id) ?? { x: 0, y: 0 }
    );
  },
  [liveDrag, dragOverrides, layoutPositions],
);
```

Extend `handleNodePointerDown` (keep the selection line) and add move/up handlers on the node element via FlowNode — simplest: attach `onPointerMove`/`onPointerUp` on the node div through new FlowNode props, or handle at the root (events bubble). **Handle at the root**: the existing `handleRootPointerMove/Up` already receive bubbled pointer events; branch on `dragState` first:

```tsx
const handleNodePointerDown = useCallback(
  (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelection({ type: 'node', id });
    if (readOnly) return;
    const node = nodeById.get(id);
    if (!node) return;
    const start = node.position ??
      dragOverrides.get(id) ??
      layoutPositions.get(id) ?? { x: 0, y: 0 };
    dragState.current = {
      id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: start,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom */
    }
  },
  [setSelection, readOnly, nodeById, dragOverrides, layoutPositions],
);
```

In `handleRootPointerMove`, before the pan branch:

```tsx
const drag = dragState.current;
if (drag && event.pointerId === drag.pointerId) {
  const dx = (event.clientX - drag.startClientX) / viewport.z;
  const dy = (event.clientY - drag.startClientY) / viewport.z;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3 / viewport.z) return;
  drag.moved = true;
  setLiveDrag({
    id: drag.id,
    position: { x: drag.startPosition.x + dx, y: drag.startPosition.y + dy },
  });
  return;
}
```

In `handleRootPointerUp`, before the pan branch:

```tsx
const drag = dragState.current;
if (drag && event.pointerId === drag.pointerId) {
  dragState.current = null;
  if (drag.moved) {
    const dx = (event.clientX - drag.startClientX) / viewport.z;
    const dy = (event.clientY - drag.startClientY) / viewport.z;
    const position = { x: drag.startPosition.x + dx, y: drag.startPosition.y + dy };
    const node = nodeById.get(drag.id);
    if (node && node.position === undefined) {
      // Session-local arrangement for auto-laid-out nodes.
      setDragOverrides((prev) => new Map(prev).set(drag.id, position));
    }
    onNodeMove?.(drag.id, position);
    announce(t('flowCanvas.nodeMoved', { label: node?.label ?? drag.id }));
  }
  setLiveDrag(null);
  return;
}
```

Pass `dragging={liveDrag?.id === node.id}` to `FlowNode`.

Keyboard nudge — in `handleRootKeyDown`, before the ctrl+arrow branch:

```tsx
if (event.shiftKey && key.startsWith('Arrow')) {
  if (readOnly) return;
  const nodeId =
    targetEl.getAttribute('data-flow-node') ?? (selection?.type === 'node' ? selection.id : null);
  if (!nodeId) return;
  event.preventDefault();
  const node = nodeById.get(nodeId);
  if (!node) return;
  const current = positionOf(node);
  const NUDGE = 8;
  const next = {
    x: current.x + (key === 'ArrowRight' ? NUDGE : key === 'ArrowLeft' ? -NUDGE : 0),
    y: current.y + (key === 'ArrowDown' ? NUDGE : key === 'ArrowUp' ? -NUDGE : 0),
  };
  if (node.position === undefined) {
    setDragOverrides((prev) => new Map(prev).set(nodeId, next));
  }
  onNodeMove?.(nodeId, next);
  announce(t('flowCanvas.nodeMoved', { label: node.label }));
  return;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/FlowCanvas && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas
git commit -m "feat(FlowCanvas): node dragging with session overrides and keyboard nudge

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Connections — pointer draw + keyboard connect mode (TDD)

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Test: append to `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests** (append):

```tsx
describe('FlowCanvas connections', () => {
  const getHandle = (label: string) =>
    screen.getByLabelText(label).querySelector('[data-flow-handle]') as HTMLElement;

  it('dragging from the handle onto a valid target fires onEdgeCreate', () => {
    const onEdgeCreate = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={[]} onEdgeCreate={onEdgeCreate} />);
    mockRootRect(screen.getByRole('application'));
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
    mockRootRect(screen.getByRole('application'));
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
    mockRootRect(screen.getByRole('application'));
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
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Connect state + validation:

```tsx
const [connect, setConnect] = useState<{
  from: string;
  mode: 'pointer' | 'keyboard';
  target: string | null;
  cursor: FlowCanvasPoint | null; // pointer mode ghost end
} | null>(null);

const defaultIsValid = useCallback(
  (from: string, to: string) => from !== to && !edges.some((e) => e.from === from && e.to === to),
  [edges],
);
const isValid = isValidConnection ?? defaultIsValid;

const nodeAtPoint = useCallback(
  (point: FlowCanvasPoint): string | null => {
    for (const [id, rect] of rects) {
      if (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
      ) {
        return id;
      }
    }
    return null;
  },
  [rects],
);
```

Handle pointer-down starts pointer connect (root captures the pointer so moves keep flowing):

```tsx
const handleHandlePointerDown = useCallback(
  (id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || readOnly) return;
    setConnect({ from: id, mode: 'pointer', target: null, cursor: null });
    try {
      rootRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom */
    }
  },
  [readOnly],
);
```

In `handleRootPointerMove`, before the drag branch:

```tsx
if (connect?.mode === 'pointer') {
  const point = toCanvasPoint(event.clientX, event.clientY);
  const over = nodeAtPoint(point);
  const target = over && over !== connect.from && isValid(connect.from, over) ? over : null;
  setConnect({ ...connect, target, cursor: point });
  return;
}
```

In `handleRootPointerUp`, before the drag branch:

```tsx
if (connect?.mode === 'pointer') {
  if (connect.target) {
    onEdgeCreate?.(connect.from, connect.target);
    announce(
      t('flowCanvas.connectDone', {
        from: nodeById.get(connect.from)?.label ?? connect.from,
        to: nodeById.get(connect.target)?.label ?? connect.target,
      }),
    );
  }
  setConnect(null);
  return;
}
```

Keyboard connect — extend `handleRootKeyDown`. FIRST branch (before everything else, right after the `isCanvasKeyTarget` guard) so mode keys take precedence:

```tsx
if (connect?.mode === 'keyboard') {
  event.preventDefault();
  if (key === 'Escape') {
    setConnect(null);
    announce(t('flowCanvas.connectCancelled'));
    return;
  }
  if (key === 'Enter') {
    if (connect.target) {
      onEdgeCreate?.(connect.from, connect.target);
      announce(
        t('flowCanvas.connectDone', {
          from: nodeById.get(connect.from)?.label ?? connect.from,
          to: nodeById.get(connect.target)?.label ?? connect.target,
        }),
      );
    }
    setConnect(null);
    return;
  }
  if (key.startsWith('Arrow')) {
    const candidates = new Map<string, Rect>();
    for (const [id, rect] of rects) {
      if (id !== connect.from && isValid(connect.from, id)) candidates.set(id, rect);
    }
    // navigate among candidates from the current target (or the source)
    candidates.set(connect.from, rects.get(connect.from)!);
    const fromId = connect.target ?? connect.from;
    const direction = key.replace('Arrow', '').toLowerCase() as NavDirection;
    const next = nearestInDirection(fromId, candidates, direction);
    if (next && next !== connect.from) {
      setConnect({ ...connect, target: next });
      announce(t('flowCanvas.connectTarget', { label: nodeById.get(next)?.label ?? next }));
    }
    return;
  }
  return; // swallow other keys while connecting
}
if (key === 'c' || key === 'C') {
  if (readOnly) return;
  const nodeId =
    targetEl.getAttribute('data-flow-node') ?? (selection?.type === 'node' ? selection.id : null);
  if (!nodeId) return;
  event.preventDefault();
  setConnect({ from: nodeId, mode: 'keyboard', target: null, cursor: null });
  announce(t('flowCanvas.connectStart', { label: nodeById.get(nodeId)?.label ?? nodeId }));
  return;
}
```

(import `nearestInDirection` and `NavDirection` from `./spatialNav`.)

Ghost edge rendering — inside the SVG, after the real edges:

```tsx
{
  connect
    ? (() => {
        const sourceRect = rects.get(connect.from);
        if (!sourceRect) return null;
        const targetRect = connect.target ? rects.get(connect.target) : null;
        const end: Rect = targetRect ?? {
          x: (connect.cursor?.x ?? sourceRect.x + sourceRect.width + 40) - 1,
          y: (connect.cursor?.y ?? sourceRect.y) - 1,
          width: 2,
          height: 2,
        };
        return <path className={styles.ghostEdge} d={edgeGeometry(sourceRect, end).path} />;
      })()
    : null;
}
```

Pass `connectTarget={connect?.target === node.id}` to `FlowNode`.

Escape-priority check: the plain `Escape` selection-clearing branch added in Task 10 must run AFTER the connect branch (connect swallows Escape first). Verify ordering.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/FlowCanvas && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas
git commit -m "feat(FlowCanvas): pointer edge drawing and keyboard connect mode

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Keyboard roving focus (arrows/Home/End/E) + focus-follows announcements (TDD)

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Test: append to `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests** (append):

```tsx
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
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Focus helpers + edge-cycle ref:

```tsx
const edgeCycle = useRef<{ nodeId: string; index: number } | null>(null);

const focusNode = useCallback(
  (id: string) => {
    const el = nodeEls.current.get(id);
    if (!el) return;
    edgeCycle.current = null;
    el.focus();
    const index = nodes.findIndex((n) => n.id === id);
    announce(
      t('flowCanvas.nodeFocused', {
        label: nodeById.get(id)?.label ?? id,
        index: index + 1,
        total: nodes.length,
      }),
    );
  },
  [nodes, nodeById, announce, t],
);

const focusEdge = useCallback(
  (id: string, index: number, total: number) => {
    const el = edgeEls.current.get(id);
    if (!el) return;
    el.focus();
    const edge = edges.find((e) => e.id === id);
    if (edge) {
      announce(
        t('flowCanvas.edgeFocused', {
          from: nodeById.get(edge.from)?.label ?? edge.from,
          to: nodeById.get(edge.to)?.label ?? edge.to,
          index,
          total,
        }),
      );
    }
  },
  [edges, nodeById, announce, t],
);
```

Selection-follows-focus — root `onFocusCapture`:

```tsx
const handleRootFocusCapture = (event: ReactFocusEvent<HTMLDivElement>) => {
  const el = event.target as HTMLElement;
  const nodeId = el.getAttribute?.('data-flow-node');
  const edgeId = el.getAttribute?.('data-flow-edge');
  if (nodeId) setSelection({ type: 'node', id: nodeId });
  else if (edgeId) setSelection({ type: 'edge', id: edgeId });
};
```

(add `FocusEvent as ReactFocusEvent` to react type imports; wire `onFocusCapture={handleRootFocusCapture}` on the root.)

Arrow/Home/End/E — extend `handleRootKeyDown` after the nudge/ctrl branches (plain arrows only reach here):

```tsx
const focusedNodeId = targetEl.getAttribute('data-flow-node');
const focusedEdgeId = targetEl.getAttribute('data-flow-edge');

if (key.startsWith('Arrow')) {
  event.preventDefault();
  if (focusedEdgeId && edgeCycle.current) {
    focusNode(edgeCycle.current.nodeId); // any arrow on an edge returns to its node
    return;
  }
  const direction = key.replace('Arrow', '').toLowerCase() as NavDirection;
  if (!focusedNodeId) {
    const first = topLeftMost(rects);
    if (first) focusNode(first);
    return;
  }
  const next = nearestInDirection(focusedNodeId, rects, direction);
  if (next) focusNode(next);
  return;
}
if (key === 'Home' || key === 'End') {
  event.preventDefault();
  const target = key === 'Home' ? nodes[0] : nodes[nodes.length - 1];
  if (target) focusNode(target.id);
  return;
}
if (key === 'e' || key === 'E') {
  const originId = focusedNodeId ?? edgeCycle.current?.nodeId;
  if (!originId) return;
  event.preventDefault();
  const attached = [
    ...edges.filter((e) => e.from === originId),
    ...edges.filter((e) => e.to === originId && e.from !== originId),
  ];
  if (attached.length === 0) return;
  const index = edgeCycle.current ? (edgeCycle.current.index + 1) % attached.length : 0;
  edgeCycle.current = { nodeId: originId, index };
  focusEdge(attached[index].id, index + 1, attached.length);
  return;
}
```

(import `topLeftMost` from `./spatialNav`.)

Update the `Enter`/`Delete` branches from Task 10 to act on the FOCUSED element when it's a node/edge, not just the selection — replace their bodies:

```tsx
if (key === 'Enter' || key === ' ') {
  const id = focusedNodeId ?? (selection?.type === 'node' ? selection.id : null);
  const edgeId = focusedEdgeId ?? (selection?.type === 'edge' ? selection.id : null);
  if (focusedNodeId ?? id) {
    if (id) {
      event.preventDefault();
      onNodeOpen?.(id);
      return;
    }
  }
  if (edgeId) {
    event.preventDefault();
    onEdgeOpen?.(edgeId);
  }
  return;
}
```

Simplify: prefer the focused element, fall back to the selection; same for Delete. (Focus and selection are normally in sync via focus-follows-selection, so this is belt-and-braces.)

- [ ] **Step 4: Run the FULL FlowCanvas suite — expect PASS, no regressions**

```bash
npx vitest run src/components/FlowCanvas && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowCanvas
git commit -m "feat(FlowCanvas): spatial roving focus, edge cycling, focus announcements

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Full JSDoc + `@remarks` + library export + manifest

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx` (component JSDoc)
- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`

- [ ] **Step 1: Write the component-function JSDoc** (replace the short one on `FlowCanvas`), following the library's Rule 7 style (description + `@remarks` anti-patterns + `@example` blocks):

````tsx
/**
 * A pan/zoom canvas for directed node-edge diagrams — the primitive behind
 * visual workflow builders. Nodes are draggable cards with a colored accent
 * bar and an adornment slot; edges are directed bezier curves with an
 * optional mid-edge chip slot. The canvas is events-only: it renders the
 * `nodes`/`edges` you pass and emits intent callbacks (`onNodeCreate`,
 * `onEdgeCreate`, …) — it never mutates data, so wire the callbacks to your
 * own state or server mutations and re-render.
 *
 * Nodes without `position` are auto-laid-out (layered, left → right) and stay
 * draggable for the session. Full keyboard support: arrows rove between
 * nodes, E cycles a node's connections, C starts a keyboard connect mode,
 * Shift+arrows nudge, +/−/0 zoom and fit, Ctrl+arrows pan.
 *
 * @remarks
 * When NOT to use:
 * - Large graphs (100+ nodes) — there is no virtualization; rendering and
 *   auto-layout are O(n·e) per change.
 * - Column/list reordering — use `Kanban` or `Sortable`; this is a 2D canvas,
 *   not a sortable list.
 * - Undirected or free-form drawing (mind maps, whiteboards) — edges here are
 *   directed with arrowheads and the interaction model assumes a digraph.
 * - As the only editing surface for critical flows — keep an accessible
 *   form-based alternative for complex attribute editing; the canvas's inline
 *   surface is selection + spatial arrangement only, editors belong to the
 *   consumer (anchor modals/popovers via the open callbacks).
 * - Rewiring an existing edge's endpoints by dragging — not supported;
 *   delete + recreate instead.
 *
 * @example
 * ```tsx
 * const [nodes, setNodes] = useState<FlowCanvasNode[]>([
 *   { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge>Initial</Badge> },
 *   { id: 'done', label: 'Done', color: '#1F845A' },
 * ]);
 * const [edges, setEdges] = useState<FlowCanvasEdge[]>([
 *   { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
 * ]);
 *
 * <div style={{ height: 480 }}>
 *   <FlowCanvas
 *     nodes={nodes}
 *     edges={edges}
 *     onEdgeCreate={(from, to) =>
 *       setEdges((prev) => [...prev, { id: crypto.randomUUID(), from, to }])
 *     }
 *     onNodeMove={(id, position) =>
 *       setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)))
 *     }
 *     onNodeOpen={(id) => openStateModal(id)}
 *   />
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // Read-only diagram (record page): no editing intents, still zoomable.
 * <FlowCanvas nodes={nodes} edges={edges} readOnly aria-label="Deal workflow" />
 * ```
 */
````

The canvas fills its parent — the PARENT owns sizing (give the wrapper a height), per the layout rule.

- [ ] **Step 2: Export from `src/index.ts`** (alphabetical position — check neighbors):

```ts
export { FlowCanvas } from './components/FlowCanvas';
export type {
  FlowCanvasProps,
  FlowCanvasNode,
  FlowCanvasEdge,
  FlowCanvasSelection,
  FlowCanvasPoint,
} from './components/FlowCanvas';
```

- [ ] **Step 3: Add the CLUSTERS entries — BOTH files, identical line**

In `src/_meta/manifest.ts` under the `// Display` comment block:

```ts
  FlowCanvas: 'Display',
```

In `scripts/generate-manifest.mjs` under the matching `// Display` block:

```js
  FlowCanvas: 'Display',
```

- [ ] **Step 4: Regenerate + verify**

```bash
npm run build:manifest
npx vitest run src/_meta/manifest.test.ts src/structure.test.ts
```

Expected: PASS. `src/components.manifest.json` gains `"FlowCanvas": { "tier": "primitive", "cluster": "Display", "composes": ["Button"], "composedBy": [] }` (composes contains `Button` via FlowControls).

- [ ] **Step 5: Run the full library gate**

```bash
npx vitest run && npm run typecheck
```

Expected: everything PASSES.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(FlowCanvas): full JSDoc, library export, manifest entry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/FlowCanvasDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/navItems.ts`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`
- Regenerate: `packages/playground/src/lib/props.manifest.json`

- [ ] **Step 1: Read one exemplar first** — `packages/playground/src/pages/components/KanbanDemo.tsx` — and `packages/playground/CLAUDE.md`. Match the `DemoLayout` + `Example` pattern exactly.

- [ ] **Step 2: Write `FlowCanvasDemo.tsx`**

Structure (adapt to the exemplar's exact imports; every `Example` `code` string is a self-contained copy-pasteable module starting with its own imports from `@eocrm/design-system`):

```tsx
import { useCallback, useState } from 'react';
import {
  Badge,
  FlowCanvas,
  Stack,
  Text,
  Title,
  type FlowCanvasEdge,
  type FlowCanvasNode,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

let nextId = 1;

const WORKFLOW_NODES: FlowCanvasNode[] = [
  { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
  { id: 'in-progress', label: 'In progress', color: '#E56910' },
  { id: 'on-hold', label: 'On hold', color: '#8590A2' },
  { id: 'resolved', label: 'Resolved', color: '#1F845A' },
];
const WORKFLOW_EDGES: FlowCanvasEdge[] = [
  { id: 'e1', from: 'open', to: 'in-progress' },
  { id: 'e2', from: 'in-progress', to: 'on-hold', label: <Badge tone="purple">Guard</Badge> },
  { id: 'e3', from: 'on-hold', to: 'in-progress' },
  { id: 'e4', from: 'in-progress', to: 'resolved', label: <Badge tone="purple">Guard</Badge> },
];

export function FlowCanvasDemo() {
  const [nodes, setNodes] = useState(WORKFLOW_NODES);
  const [edges, setEdges] = useState(WORKFLOW_EDGES);
  const [lastEvent, setLastEvent] = useState('—');

  const handleNodeCreate = useCallback((position: { x: number; y: number }) => {
    const id = `state-${nextId++}`;
    setNodes((prev) => [...prev, { id, label: `New state ${nextId - 1}`, position }]);
    setLastEvent(`onNodeCreate(${Math.round(position.x)}, ${Math.round(position.y)})`);
  }, []);
  const handleNodeMove = useCallback((id: string, position: { x: number; y: number }) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)));
    setLastEvent(`onNodeMove(${id})`);
  }, []);
  const handleNodeDelete = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setLastEvent(`onNodeDelete(${id})`);
  }, []);
  const handleEdgeCreate = useCallback((from: string, to: string) => {
    setEdges((prev) => [...prev, { id: `edge-${nextId++}`, from, to }]);
    setLastEvent(`onEdgeCreate(${from} → ${to})`);
  }, []);
  const handleEdgeDelete = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setLastEvent(`onEdgeDelete(${id})`);
  }, []);

  return (
    <DemoLayout
      name="FlowCanvas"
      description="Pan/zoom canvas for directed node-edge diagrams — the primitive behind visual workflow builders. Events-only: you own the data, it emits intents."
      files={getComponentFiles('FlowCanvas')}
      componentName="FlowCanvas"
    >
      <Example
        title="Workflow builder"
        description="Drag nodes, drag from a node's edge handle to connect, double-click empty space to add a state, Delete to remove the selection. Full keyboard support: arrows rove, E cycles edges, C connects, Shift+arrows nudge."
        code={`import { useState } from 'react';
import { Badge, FlowCanvas, type FlowCanvasEdge, type FlowCanvasNode } from '@eocrm/design-system';

export function Demo() {
  const [nodes, setNodes] = useState<FlowCanvasNode[]>([
    { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
    { id: 'done', label: 'Done', color: '#1F845A' },
  ]);
  const [edges, setEdges] = useState<FlowCanvasEdge[]>([
    { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
  ]);
  return (
    <div style={{ height: 420 }}>
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        onNodeCreate={(pos) =>
          setNodes((prev) => [...prev, { id: crypto.randomUUID(), label: 'New state', position: pos }])
        }
        onNodeMove={(id, position) =>
          setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)))
        }
        onNodeDelete={(id) => setNodes((prev) => prev.filter((n) => n.id !== id))}
        onEdgeCreate={(from, to) =>
          setEdges((prev) => [...prev, { id: crypto.randomUUID(), from, to }])
        }
        onEdgeDelete={(id) => setEdges((prev) => prev.filter((e) => e.id !== id))}
      />
    </div>
  );
}`}
      >
        <Stack gap="sm">
          <div style={{ height: 420 }}>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodeCreate={handleNodeCreate}
              onNodeMove={handleNodeMove}
              onNodeDelete={handleNodeDelete}
              onEdgeCreate={handleEdgeCreate}
              onEdgeDelete={handleEdgeDelete}
            />
          </div>
          <Text size="sm" tone="muted">
            Last intent: {lastEvent}
          </Text>
        </Stack>
      </Example>

      <Example
        title="Auto-layout"
        description="Nodes without position are laid out automatically — layered left to right from the sources. Drag still works; positions persist for the session."
        code={`import { FlowCanvas } from '@eocrm/design-system';

export function Demo() {
  return (
    <div style={{ height: 320 }}>
      <FlowCanvas
        nodes={[
          { id: 'a', label: 'Lead in' },
          { id: 'b', label: 'Qualify' },
          { id: 'c', label: 'Quote' },
          { id: 'd', label: 'Won' },
          { id: 'e', label: 'Lost' },
        ]}
        edges={[
          { id: '1', from: 'a', to: 'b' },
          { id: '2', from: 'b', to: 'c' },
          { id: '3', from: 'c', to: 'd' },
          { id: '4', from: 'b', to: 'e' },
          { id: '5', from: 'c', to: 'e' },
        ]}
      />
    </div>
  );
}`}
      >
        <div style={{ height: 320 }}>
          <FlowCanvas
            nodes={[
              { id: 'a', label: 'Lead in' },
              { id: 'b', label: 'Qualify' },
              { id: 'c', label: 'Quote' },
              { id: 'd', label: 'Won' },
              { id: 'e', label: 'Lost' },
            ]}
            edges={[
              { id: '1', from: 'a', to: 'b' },
              { id: '2', from: 'b', to: 'c' },
              { id: '3', from: 'c', to: 'd' },
              { id: '4', from: 'b', to: 'e' },
              { id: '5', from: 'c', to: 'e' },
            ]}
          />
        </div>
      </Example>

      <Example
        title="Read-only"
        description="readOnly renders the diagram without editing: no drag, no connect handles, no delete — selection and open still work, so it suits record pages."
        code={`import { FlowCanvas } from '@eocrm/design-system';

export function Demo() {
  return (
    <div style={{ height: 280 }}>
      <FlowCanvas
        readOnly
        nodes={[
          { id: 'todo', label: 'To do', color: '#8590A2', position: { x: 0, y: 60 } },
          { id: 'doing', label: 'Doing', color: '#0052CC', position: { x: 260, y: 0 } },
          { id: 'done', label: 'Done', color: '#1F845A', position: { x: 520, y: 60 } },
        ]}
        edges={[
          { id: '1', from: 'todo', to: 'doing' },
          { id: '2', from: 'doing', to: 'done' },
        ]}
      />
    </div>
  );
}`}
      >
        <div style={{ height: 280 }}>
          <FlowCanvas
            readOnly
            nodes={[
              { id: 'todo', label: 'To do', color: '#8590A2', position: { x: 0, y: 60 } },
              { id: 'doing', label: 'Doing', color: '#0052CC', position: { x: 260, y: 0 } },
              { id: 'done', label: 'Done', color: '#1F845A', position: { x: 520, y: 60 } },
            ]}
            edges={[
              { id: '1', from: 'todo', to: 'doing' },
              { id: '2', from: 'doing', to: 'done' },
            ]}
          />
        </div>
      </Example>

      <Stack gap="xs">
        <Title order={3} size="md">
          Implementation notes
        </Title>
        <Text size="sm" tone="muted">
          The canvas fills its parent — give the wrapper an explicit height. All mutations flow
          through intent callbacks; the canvas never changes your data. Keyboard: arrows rove
          between nodes, E cycles a node's connections, C starts connect mode, Shift+arrows nudge,
          +/−/0 zoom and fit, Ctrl+arrows pan.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
```

Verify `Badge` tones (`info`, `purple`) exist in `BadgeProps`; substitute valid tones if not.

- [ ] **Step 3: Wire the four registration points**

`App.tsx`:

```tsx
import { FlowCanvasDemo } from './pages/components/FlowCanvasDemo';
// inside <Routes>, alphabetically among /components routes:
<Route path="/components/flow-canvas" element={<FlowCanvasDemo />} />;
```

`layout/AppShell/navItems.ts` — Display group (import `Workflow` from `lucide-react`):

```ts
{ to: '/components/flow-canvas', label: 'FlowCanvas', icon: Workflow, end: false },
```

`ComponentsIndex.tsx` — grid card with a small live preview:

```tsx
{
  to: '/components/flow-canvas',
  name: 'FlowCanvas',
  description: 'Pan/zoom canvas for directed node-edge diagrams.',
  preview: (
    <div style={{ height: 120, width: '100%' }}>
      <FlowCanvas
        readOnly
        nodes={[
          { id: 'a', label: 'Open', color: '#0052CC', position: { x: 0, y: 8 } },
          { id: 'b', label: 'Done', color: '#1F845A', position: { x: 150, y: 48 } },
        ]}
        edges={[{ id: 'e', from: 'a', to: 'b' }]}
      />
    </div>
  ),
},
```

(add `FlowCanvas` to the `@eocrm/design-system` import in that file).

`pages/mockups/registry.ts` — extend the `ComponentName` union with `'FlowCanvas'` (alphabetical).

- [ ] **Step 4: Regenerate the props manifest + typecheck + build**

```bash
cd /Users/dpws/projects/design-system/packages/playground && npm run build:props
cd /Users/dpws/projects/design-system && make build
```

Expected: build passes; `props.manifest.json` now contains a `FlowCanvas` entry.

- [ ] **Step 5: Commit**

```bash
git add packages/playground
git commit -m "feat(playground): FlowCanvas demo page and wiring

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: AGENTS.md TL;DR + full gates

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Read AGENTS.md's structure** (one full component section, e.g. Kanban's) and add a matching `## FlowCanvas` section in the roster position that matches the file's ordering. Content:

````markdown
## FlowCanvas

Pan/zoom canvas for directed node-edge diagrams (workflow builders). Events-only: you own
`nodes`/`edges`; the canvas emits intents (`onNodeCreate`, `onNodeMove`, `onNodeOpen`,
`onNodeDelete`, `onEdgeCreate`, `onEdgeOpen`, `onEdgeDelete`) and never mutates data. Nodes
without `position` auto-layout left → right and stay draggable for the session. Selection is
single (`selection`/`defaultSelection`/`onSelectionChange`); `readOnly` disables editing but
keeps select/open. Validation of new connections via `isValidConnection` (default: no
self-loops, no duplicate pairs). The canvas fills its parent — give the wrapper a height.
Full keyboard: arrows rove nodes, E cycles a node's edges, C connect mode, Shift+arrows
nudge, +/−/0 zoom/fit, Ctrl+arrows pan, Delete deletes, Enter opens.

```tsx
const [nodes, setNodes] = useState<FlowCanvasNode[]>([
  { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
  { id: 'done', label: 'Done', color: '#1F845A' },
]);
const [edges, setEdges] = useState<FlowCanvasEdge[]>([
  { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
]);

<div style={{ height: 480 }}>
  <FlowCanvas
    nodes={nodes}
    edges={edges}
    onEdgeCreate={(from, to) => createTransition(from, to)}
    onNodeOpen={(id) => openStateModal(id)}
    onNodeDelete={(id) => confirmDeleteState(id)}
  />
</div>;
```

When NOT to use: >100-node graphs (no virtualization); list/column reordering (use
Kanban/Sortable); undirected/free-form drawing; as the only editing surface for complex
attributes (anchor your own modals via the open callbacks — keep a form-based fallback).
````

If AGENTS.md also has a roster/index list at the top, add FlowCanvas there too.

- [ ] **Step 2: Run ALL gates from the repo root**

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: all green; the grep prints `0`. If `format:check` fails, run `npx prettier --write .` and re-run.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(FlowCanvas): AGENTS.md TL;DR

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 17: Hard-rule-8 review-fix loop

Run the pre-push adversarial review loop per `packages/design-system/CLAUDE.md` Rule 8 (the orchestrating session handles this with fresh-context reviewers across correctness/types, tests, a11y, API/packaging; fix every Critical/Important; re-run gates; repeat until clean). Not a subagent implementation task — the orchestrator drives it.

---

## Self-review (done at planning time)

- **Spec coverage:** API (T2/T8/T14), semi-uncontrolled positions (T8/T11), rendering/viewport (T8/T9), pointer interactions (T10/T11/T12), full keyboard incl. connect + E-cycling (T9/T10/T11/T12/T13), ARIA/live region/i18n (T6/T8/T13), auto-layout (T3), theming (T7), files (T2-T13), testing (throughout), integration checklist (T14/T15/T16), out-of-scope respected. Reverse-pair offset + self-loop rendering: T4 + T8. One-time dev warning for broken edges: T8.
- **Type consistency:** `FlowCanvasPoint/Node/Edge/Selection` defined T2, used consistently; `NodeSize` from layout; `Rect` from edgePath; callbacks match the spec signatures.
- **Known judgment calls for implementers:** exact Button variant names, Badge tones, `--font-*` token names, and Kanban-test matcher style must be verified against the actual source before use (called out inline).
