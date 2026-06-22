// moveSortableItem.ts — pure, immutable cross/within-container move for the
// controlled state behind <SortableGroup>. Operates by index, so it's generic
// over the item type (id arrays or whole objects). Owns the SortableMoveEvent
// type (SortableGroup.tsx imports + re-exports it) so this module is self-contained.

/** A move within or across containers — fired by `SortableGroup.onMove`. */
export interface SortableMoveEvent {
  /** The dragged item's id. */
  id: string | number;
  /** Where it came from. */
  from: { container: string | number; index: number };
  /** Where it goes. `from.container === to.container` is a within-list reorder. */
  to: { container: string | number; index: number };
}

/**
 * Apply a `SortableMoveEvent` to a `{ containerId: items[] }` map, immutably.
 * Splices the item out of `from` and into `to` by index — supports within-
 * container reorder, cross-container moves, and an empty target. Returns the
 * input unchanged when `from.index` is out of range.
 *
 * @example
 * <SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
 */
export function moveSortableItem<T>(
  containers: Record<string, T[]>,
  { from, to }: SortableMoveEvent,
): Record<string, T[]> {
  const fromKey = String(from.container);
  const toKey = String(to.container);
  const fromArr = (containers[fromKey] ?? []).slice();
  const [moved] = fromArr.splice(from.index, 1);
  if (moved === undefined) return containers; // out-of-range → no-op
  const next = { ...containers, [fromKey]: fromArr };
  const toArr = fromKey === toKey ? fromArr : (containers[toKey] ?? []).slice();
  toArr.splice(to.index, 0, moved);
  next[toKey] = toArr;
  return next;
}
