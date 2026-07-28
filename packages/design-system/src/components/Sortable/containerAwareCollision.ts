// Container-aware collision detection for multi-container sortable boards
// (Kanban, SortableGroup). Pure function so it's unit-testable with synthetic
// rects; imported by both components' DndContexts.
import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DroppableContainer,
} from '@dnd-kit/core';

/**
 * A CONTAINER droppable (a `<Kanban.Column>` / `<SortableGroup.Group>`) as
 * opposed to an ITEM droppable (a card). Containers register via plain
 * `useDroppable`, so they carry no `data.sortable`; items register via
 * `useSortable`, which adds it.
 */
const isContainer = (droppable: DroppableContainer) => droppable.data.current?.sortable == null;

/**
 * `closestCorners`, but the pointer's containing container wins first.
 *
 * Why: with plain `closestCorners`, every card registers as a droppable
 * alongside the column containers, and ranking is by corner distance of the
 * DRAGGED RECT — not by where the pointer is. Next to a tall column, an
 * empty/sparse sibling column stretches (flex align-items: stretch) far
 * beyond its content, so its corners sit hundreds of pixels from the dragged
 * card while a same-Y card in the SOURCE column sits one column-gap away.
 * The source card out-ranks the geometrically-containing target column, the
 * cross-column transit is never detected, and the drop silently resolves as
 * a same-column no-op (#367).
 *
 * Strategy:
 * 1. No pointer (keyboard drags pass `pointerCoordinates: null`) → plain
 *    `closestCorners` over everything — keyboard behavior unchanged.
 * 2. Find the container droppable the pointer is inside (`pointerWithin`
 *    over containers only). Containers are droppables registered via plain
 *    `useDroppable` — they carry no `data.sortable`; card/item droppables
 *    registered via `useSortable` do.
 * 3. Pointer inside a container → rank with `closestCorners` restricted to
 *    that container plus the droppables whose center lies inside it (its own
 *    cards). An empty column is its only candidate, so it wins; over a card,
 *    the card wins; below the last card, the nearest of card/column wins —
 *    both resolve to "append" downstream.
 * 4. Pointer in no container (board gap / outside) → plain `closestCorners`.
 */
export const containerAwareClosestCorners: CollisionDetection = (args) => {
  const { droppableContainers, droppableRects, pointerCoordinates } = args;
  if (!pointerCoordinates) return closestCorners(args);

  const containers = droppableContainers.filter(isContainer);
  const within = pointerWithin({ ...args, droppableContainers: containers });
  const containerId = within[0]?.id;
  const containerRect = containerId != null ? droppableRects.get(containerId) : undefined;
  if (containerId == null || !containerRect) return closestCorners(args);

  const candidates = droppableContainers.filter((d) => {
    if (d.id === containerId) return true;
    const rect = droppableRects.get(d.id);
    if (!rect) return false;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (
      cx >= containerRect.left &&
      cx <= containerRect.right &&
      cy >= containerRect.top &&
      cy <= containerRect.bottom
    );
  });
  return closestCorners({ ...args, droppableContainers: candidates });
};

/**
 * True when the pointer sits outside the collective bounding box of every
 * CONTAINER droppable — i.e. the drag is over unrelated page content rather
 * than over the board. Callers use it to reject a drop that collision
 * detection nonetheless resolved to a container (#387).
 *
 * It has to be asked separately because no collision detector can answer it:
 * `closestCorners` — which `containerAwareClosestCorners` falls back to
 * whenever the pointer is in no container — pushes a collision for EVERY
 * measured droppable and uses distance only to rank them, never to reject. So
 * `over` is never null, and "released nowhere" is indistinguishable from
 * "released on the nearest column" from the drop handler's side.
 *
 * Collective bounding box, not each container's own rect: a board with a `gap`
 * between columns has pointer positions inside the board but inside no column.
 * Per-rect testing would cancel those, and a release in a 12px gutter means the
 * column beside it — which is exactly what `closestCorners` returns. Only
 * leaving the band of columns entirely is a cancel. Containers only (never the
 * cards') so a pointer in a sparse column's empty space stays a valid drop,
 * which is the whole point of #367.
 *
 * Returns false whenever it cannot tell — no pointer (keyboard drags pass
 * `pointerCoordinates: null`) or nothing measured (jsdom lays nothing out) —
 * so an unmeasurable board keeps committing to the nearest container instead of
 * cancelling every drop.
 */
export function isPointerOutsideContainers({
  droppableContainers,
  droppableRects,
  pointerCoordinates,
}: Pick<
  Parameters<CollisionDetection>[0],
  'droppableContainers' | 'droppableRects' | 'pointerCoordinates'
>): boolean {
  if (!pointerCoordinates) return false;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const droppable of droppableContainers) {
    if (!isContainer(droppable)) continue;
    const rect = droppableRects.get(droppable.id);
    if (!rect) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (left === Infinity) return false;

  const { x, y } = pointerCoordinates;
  return x < left || x > right || y < top || y > bottom;
}
