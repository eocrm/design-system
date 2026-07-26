/**
 * Pure geometry engine for DashboardCanvas: 12-column snap-grid placement with
 * Datadog-style push-down collision and vertical compaction. No React, no DOM
 * mutation — every function is deterministic and returns fresh objects,
 * never mutating its inputs.
 */

/** One placed item: grid units within its container. */
export interface DashboardPlacement {
  id: string | number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A full-width collapsible band with its own sub-grid of items. */
export interface DashboardSection {
  id: string | number;
  title: string;
  collapsed: boolean;
  items: DashboardPlacement[];
}

/** Controlled value. Section array order = band order; top-level items render above the first section. */
export interface DashboardCanvasValue {
  items: DashboardPlacement[];
  sections: DashboardSection[];
}

/** Per-item size constraints, by item id. */
export interface DashboardItemConstraints {
  minW?: number;
  minH?: number;
  maxH?: number;
}

/** Identifies a placement container: the top-level canvas or one section's sub-grid. */
export type ContainerRef = { kind: 'top' } | { kind: 'section'; id: string | number };

/** Fixed column count of every container grid. */
export const DASHBOARD_COLUMNS = 12;

/**
 * Clamps a placement into the grid: `w`/`h` at least 1 (and `minW`/`minH` when
 * set), `h` capped at `maxH`, `w` capped at 12 columns, then `x` pulled back so
 * `x + w <= 12` and `x`/`y` floored at 0.
 */
export function clampPlacement(
  p: DashboardPlacement,
  c: DashboardItemConstraints | undefined,
): DashboardPlacement {
  const w = Math.min(Math.max(p.w, c?.minW ?? 1, 1), DASHBOARD_COLUMNS);
  let h = Math.max(p.h, c?.minH ?? 1, 1);
  if (c?.maxH !== undefined) h = Math.max(Math.min(h, c.maxH), 1);
  const x = Math.min(Math.max(p.x, 0), DASHBOARD_COLUMNS - w);
  const y = Math.max(p.y, 0);
  return { ...p, x, y, w, h };
}

/** True when the two rects overlap; rects that merely touch edges do NOT collide. */
export function collides(a: DashboardPlacement, b: DashboardPlacement): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Stable (y, then x) processing order; ties keep input order (Array.sort is stable). */
function sortByPosition(items: readonly DashboardPlacement[]): DashboardPlacement[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Core packing pass: settles `items` (in stable (y, x) order) each to the
 * lowest collision-free y at its own x-span, treating `obstacles` as fixed.
 * With `fromCurrentY`, an item never rises — it only moves down when it
 * collides (the push-down phase); without it, items drop to the lowest free y
 * (the compaction phase). Returns new placements keyed by id.
 */
function settle(
  items: readonly DashboardPlacement[],
  obstacles: DashboardPlacement[],
  fromCurrentY = false,
): Map<string | number, DashboardPlacement> {
  const placed = [...obstacles];
  const settled = new Map<string | number, DashboardPlacement>();
  for (const item of sortByPosition(items)) {
    let y = fromCurrentY ? item.y : 0;
    for (;;) {
      const probe = { ...item, y };
      const hit = placed.find((other) => collides(probe, other));
      if (!hit) break;
      y = hit.y + hit.h; // just below the collider; y strictly grows, so this terminates
    }
    const next = { ...item, y };
    placed.push(next);
    settled.set(item.id, next);
  }
  return settled;
}

/**
 * Pulls every item up to the lowest free y at its own x-span. Stable (y, then
 * x) processing; never changes x; also resolves any pre-existing overlaps
 * deterministically (later item in processing order lands below). Output
 * preserves the input array order.
 */
export function compact(items: DashboardPlacement[]): DashboardPlacement[] {
  const settled = settle(items, []);
  return items.map((item) => settled.get(item.id)!);
}

/**
 * Datadog push-down drop: `moved` claims its dropped cell for collision
 * resolution — colliding items are pushed down just enough (chains
 * recursively), never sideways — and then the WHOLE layout, `moved` included,
 * compacts vertically, so no placement ever floats over free space. When the
 * drop is collision-free this equals `compact([...others, moved])`. An
 * existing item with `moved.id` is replaced in place; otherwise `moved` is
 * appended.
 */
export function placeWithPushDown(
  items: DashboardPlacement[],
  moved: DashboardPlacement,
): DashboardPlacement[] {
  const rest = items.filter((item) => item.id !== moved.id);
  const pushed = settle(rest, [moved], true);
  const intermediate = items.map((item) =>
    item.id === moved.id ? { ...moved } : pushed.get(item.id)!,
  );
  if (!items.some((item) => item.id === moved.id)) intermediate.push({ ...moved });
  return compact(intermediate);
}

/** Item ids must be unique per container; duplicate ids produce undefined layouts. */
function containerItems(
  value: DashboardCanvasValue,
  ref: ContainerRef,
): DashboardPlacement[] | undefined {
  if (ref.kind === 'top') return value.items;
  return value.sections.find((section) => section.id === ref.id)?.items;
}

/** Item ids must be unique per container; duplicate ids produce undefined layouts. */
function withContainerItems(
  value: DashboardCanvasValue,
  ref: ContainerRef,
  items: DashboardPlacement[],
): DashboardCanvasValue {
  if (ref.kind === 'top') return { ...value, items };
  return {
    ...value,
    sections: value.sections.map((section) =>
      section.id === ref.id ? { ...section, items } : section,
    ),
  };
}

function sameContainer(a: ContainerRef, b: ContainerRef): boolean {
  return a.kind === 'top' ? b.kind === 'top' : b.kind === 'section' && a.id === b.id;
}

/**
 * Index-wise placement equality — lets `applyMove`/`applyResize` return their
 * input by reference when a gesture resolves to the current layout, so
 * callers can gate commits on `next !== value` alone.
 */
function samePlacements(
  a: readonly DashboardPlacement[],
  b: readonly DashboardPlacement[],
): boolean {
  return (
    a.length === b.length &&
    a.every((p, i) => {
      const q = b[i];
      return p.id === q.id && p.x === q.x && p.y === q.y && p.w === q.w && p.h === q.h;
    })
  );
}

/**
 * Moves an item to cell (x, y) of the `to` container (which may equal `from`).
 * The source compacts after removal; the item is push-down-placed in the
 * target with its coordinates clamped to the grid. Unknown item, missing
 * target container, or a same-container move that resolves to the current
 * layout returns the value unchanged (same reference).
 */
export function applyMove(
  value: DashboardCanvasValue,
  from: ContainerRef,
  to: ContainerRef,
  id: string | number,
  x: number,
  y: number,
): DashboardCanvasValue {
  const source = containerItems(value, from);
  const item = source?.find((candidate) => candidate.id === id);
  if (!source || !item || containerItems(value, to) === undefined) return value;
  const dropped = clampPlacement({ ...item, x, y }, undefined);
  if (sameContainer(from, to)) {
    const placed = placeWithPushDown(source, dropped);
    return samePlacements(source, placed) ? value : withContainerItems(value, from, placed);
  }
  const removed = withContainerItems(
    value,
    from,
    compact(source.filter((candidate) => candidate.id !== id)),
  );
  return withContainerItems(removed, to, placeWithPushDown(containerItems(removed, to)!, dropped));
}

/**
 * Resizes an item in place (`x` is kept, `y` moves only through the shared
 * vertical compaction): `w`/`h` are clamped by the constraints and by the
 * columns remaining right of `x`, then the layout resettles around it —
 * growing pushes neighbors down, shrinking lets them compact back up.
 * Unknown item, or a resize whose clamped dimensions resolve to the current
 * layout, returns the value unchanged (same reference).
 */
export function applyResize(
  value: DashboardCanvasValue,
  container: ContainerRef,
  id: string | number,
  w: number,
  h: number,
  c?: DashboardItemConstraints,
): DashboardCanvasValue {
  const items = containerItems(value, container);
  const item = items?.find((candidate) => candidate.id === id);
  if (!items || !item) return value;
  // Outermost floor: an invalid controlled x >= 12 must not yield w <= 0.
  const nextW = Math.max(1, Math.min(Math.max(w, c?.minW ?? 1), DASHBOARD_COLUMNS - item.x));
  let nextH = Math.max(h, c?.minH ?? 1, 1);
  if (c?.maxH !== undefined) nextH = Math.max(Math.min(nextH, c.maxH), 1);
  const placed = placeWithPushDown(items, { ...item, w: nextW, h: nextH });
  return samePlacements(items, placed) ? value : withContainerItems(value, container, placed);
}

/** Flips one section's `collapsed` flag; everything else is untouched (same refs). */
export function toggleSection(
  value: DashboardCanvasValue,
  sectionId: string | number,
): DashboardCanvasValue {
  if (!value.sections.some((section) => section.id === sectionId)) return value;
  return {
    ...value,
    sections: value.sections.map((section) =>
      section.id === sectionId ? { ...section, collapsed: !section.collapsed } : section,
    ),
  };
}

/** Moves a section band to `toIndex` (clamped into range). Unknown id or no-op index returns the value unchanged. */
export function reorderSection(
  value: DashboardCanvasValue,
  sectionId: string | number,
  toIndex: number,
): DashboardCanvasValue {
  const fromIndex = value.sections.findIndex((section) => section.id === sectionId);
  if (fromIndex === -1) return value;
  const target = Math.min(Math.max(toIndex, 0), value.sections.length - 1);
  if (target === fromIndex) return value;
  const sections = [...value.sections];
  const [moved] = sections.splice(fromIndex, 1);
  sections.splice(target, 0, moved);
  return { ...value, sections };
}

/**
 * Flattened below-`md` stacking order: top-level items first, then each
 * section's items in band order; within a container by (y, then x). Collapsed
 * sections are included — the renderer decides whether to show their bodies.
 */
export function stackOrder(
  value: DashboardCanvasValue,
): { container: ContainerRef; id: string | number }[] {
  const out: { container: ContainerRef; id: string | number }[] = [];
  for (const item of sortByPosition(value.items)) {
    out.push({ container: { kind: 'top' }, id: item.id });
  }
  for (const section of value.sections) {
    for (const item of sortByPosition(section.items)) {
      out.push({ container: { kind: 'section', id: section.id }, id: item.id });
    }
  }
  return out;
}

/**
 * Snaps a viewport point to a grid cell of the container: each cell owns its
 * trailing gap, x is clamped to [0, 11], y is floored at 0 but unbounded above
 * (the grid grows downward). Zero/negative cell sizes (jsdom) yield cell 0.
 */
export function cellFromPoint(
  px: number,
  py: number,
  containerRect: DOMRect,
  colWidth: number,
  rowHeight: number,
  gap: number,
): { x: number; y: number } {
  const colPitch = colWidth + gap;
  const rowPitch = rowHeight + gap;
  const rawX = colPitch > 0 ? Math.floor((px - containerRect.left) / colPitch) : 0;
  const rawY = rowPitch > 0 ? Math.floor((py - containerRect.top) / rowPitch) : 0;
  return {
    x: Math.min(Math.max(rawX, 0), DASHBOARD_COLUMNS - 1),
    y: Math.max(rawY, 0),
  };
}
