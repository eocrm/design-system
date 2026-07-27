// Container-aware collision detection for multi-container sortable boards
// (Kanban, SortableGroup). Pure function so it's unit-testable with synthetic
// rects; imported by both components' DndContexts.
import { closestCorners, pointerWithin, type CollisionDetection } from '@dnd-kit/core';

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

  const containers = droppableContainers.filter((d) => d.data.current?.sortable == null);
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
