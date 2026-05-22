import type { ColumnOrderState, ColumnPinningState } from './types';

/**
 * True when both columns are on the same pin "side": both unpinned, both
 * left-pinned, or both right-pinned. Used to reject cross-pin-boundary drag
 * drops. A column can be pinned to at most one side; if data is malformed
 * (in both lists), the function treats it as left-pinned (left checked first).
 */
export function sameSide(a: string, b: string, pinning: ColumnPinningState): boolean {
  const aSide = pinning.left.includes(a) ? 'left' : pinning.right.includes(a) ? 'right' : 'unpinned';
  const bSide = pinning.left.includes(b) ? 'left' : pinning.right.includes(b) ? 'right' : 'unpinned';
  return aSide === bSide;
}

export interface ReorderArgs {
  prev: ColumnOrderState;
  activeId: string;
  overId: string;
  visibleIds: string[];
  pinning: ColumnPinningState;
}

/**
 * Reorder columns within their pin side. Returns the new `ColumnOrderState`,
 * or `null` if the move should be rejected:
 *
 * - active and over are not on the same pin side (cross-boundary drag)
 * - active === over (no-op)
 * - active or over not found in `prev`
 *
 * The reorder operates on the visible-column slice and then re-slots the
 * reordered ids back into `prev` at the same absolute positions, so hidden
 * columns retain their positions in `columnOrder`. (Same algorithm as Phase 1's
 * inline reorder; just adds the same-side check.)
 */
export function reorderRespectingPins(args: ReorderArgs): ColumnOrderState | null {
  const { prev, activeId, overId, visibleIds, pinning } = args;
  if (activeId === overId) return null;
  if (!prev.includes(activeId) || !prev.includes(overId)) return null;
  if (!sameSide(activeId, overId, pinning)) return null;

  const visible = prev.filter((id) => visibleIds.includes(id));
  const fromIdx = visible.indexOf(activeId);
  const toIdx = visible.indexOf(overId);
  if (fromIdx === -1 || toIdx === -1) return null;

  const reorderedVisible = [...visible];
  const [moved] = reorderedVisible.splice(fromIdx, 1);
  reorderedVisible.splice(toIdx, 0, moved!);

  let cursor = 0;
  return prev.map((id) => {
    if (visibleIds.includes(id)) {
      return reorderedVisible[cursor++]!;
    }
    return id;
  });
}
