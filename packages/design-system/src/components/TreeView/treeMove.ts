import type { TreeItem } from './treeModel';

/** A move of one node, as reported by TreeView's `onMove`. */
export interface TreeViewMove {
  /** The moved node. */
  id: string;
  /** New parent, or null for the root level. */
  parentId: string | null;
  /**
   * Final 0-based position among the new parent's loaded children AFTER the move (the node removed from its
   * old place first). `null` = append at the end; the true end position is not known.
   */
  index: number | null;
}

/** Keyboard move: swap up / down among siblings, indent into the previous sibling, outdent to the grandparent. */
export type MoveDirection = 'up' | 'down' | 'indent' | 'outdent';

/** Why a keyboard move did nothing: at the edge of the tree, or vetoed by `canDrop`. */
export type MoveRefusal = 'boundary' | 'refused';

/** Where a pointer drop lands relative to the row under it. */
export type DropZone = 'before' | 'inside' | 'after';

/** A resolved pointer drop: the move, and where to draw its indicator (`level` = the depth it lands at). */
export interface DropTarget {
  /** The move a drop here fires. */
  move: TreeViewMove;
  /** The row that draws the indicator, which edge / tint, and the target depth for indentation. */
  indicator: { key: string; zone: DropZone; level: number };
}

type NodeItem = Extract<TreeItem, { kind: 'node' }>;
type CanDrop = (id: string, parentId: string | null) => boolean;

const findNode = (flat: TreeItem[], id: string | null) =>
  flat.find((i): i is NodeItem => i.kind === 'node' && i.node.id === id);

/** Rows of one level: the parent's children, or the root rows. */
const levelRows = (flat: TreeItem[], parentId: string | null) =>
  parentId === null
    ? flat.filter((i) => i.parentId === null)
    : (findNode(flat, parentId)?.children ?? []);

/** Append position among loaded rows (without `activeId`), or null when more may exist (loading / error / overflow). */
const appendAt = (rows: TreeItem[], activeId: string) =>
  rows.some((r) => r.kind !== 'node')
    ? null
    : rows.filter((r) => r.kind === 'node' && r.node.id !== activeId).length;

/** Append position inside `target`: leaf 0, collapsed unknown, else its loaded children. */
const appendInside = (target: NodeItem, activeId: string) =>
  !target.node.hasChildren ? 0 : target.expanded ? appendAt(target.children, activeId) : null;

/** Keyboard move of the node `id` within the visible rows `flat` (flatten(buildTree(...))). */
export function keyboardMove(
  flat: TreeItem[],
  id: string,
  dir: MoveDirection,
  canDrop?: CanDrop,
): { move: TreeViewMove; expand?: string } | { refusal: MoveRefusal } {
  const item = findNode(flat, id);
  if (!item) return { refusal: 'refused' };
  const pos = item.posInSet - 1;
  let result: { move: TreeViewMove; expand?: string };
  if (dir === 'up' || dir === 'down') {
    const index = dir === 'up' ? pos - 1 : pos + 1;
    if (index < 0 || index >= item.setSize) return { refusal: 'boundary' };
    result = { move: { id, parentId: item.parentId, index } };
  } else if (dir === 'indent') {
    const prev = levelRows(flat, item.parentId).filter((r) => r.kind === 'node')[pos - 1] as
      | NodeItem
      | undefined;
    if (!prev) return { refusal: 'boundary' };
    result = { move: { id, parentId: prev.node.id, index: appendInside(prev, id) } };
    // A leaf is expanded too, so the moved node stays visible once the app marks it hasChildren.
    if (!prev.expanded) result.expand = prev.node.id;
  } else {
    const parent = findNode(flat, item.parentId);
    if (!parent) return { refusal: 'boundary' };
    result = { move: { id, parentId: parent.parentId, index: parent.posInSet } };
  }
  return canDrop && !canDrop(id, result.move.parentId) ? { refusal: 'refused' } : result;
}

/** Hit zone by y within the row: top 25% before, bottom 25% after, else inside. */
export function zoneAt(offsetY: number, height: number): DropZone {
  if (offsetY < height * 0.25) return 'before';
  return offsetY >= height * 0.75 ? 'after' : 'inside';
}

/** Pointer target: the row under the pointer, the zone by y within it (top 25% before, bottom 25% after, else inside). */
export function dropTarget(
  flat: TreeItem[],
  activeId: string,
  overKey: string | null,
  zone: DropZone,
  canDrop?: CanDrop,
): DropTarget | null {
  const active = findNode(flat, activeId);
  if (!active) return null;
  let target: DropTarget;
  if (overKey === null) {
    // Below the last row: after the last root (indicated after that root's whole subtree).
    const roots = levelRows(flat, null);
    target = {
      move: { id: activeId, parentId: null, index: appendAt(roots, activeId) },
      indicator: { key: roots[roots.length - 1].key, zone: 'after', level: 1 },
    };
  } else {
    const over = flat.find((i) => i.key === overKey);
    if (over?.kind !== 'node') return null;
    for (let p: NodeItem | undefined = over; p; p = findNode(flat, p.parentId))
      if (p.node.id === activeId) return null;
    const into = (index: number | null): DropTarget => ({
      move: { id: activeId, parentId: over.node.id, index },
      indicator: { key: over.key, zone, level: over.level + 1 },
    });
    if (zone === 'inside') target = into(appendInside(over, activeId));
    // "After" an expanded node with visible children reads as "before its first child".
    else if (zone === 'after' && over.expanded && over.children.length > 0) target = into(0);
    else {
      let index = zone === 'before' ? over.posInSet - 1 : over.posInSet;
      if (active.parentId === over.parentId && active.posInSet - 1 < index) index -= 1;
      target = {
        move: { id: activeId, parentId: over.parentId, index },
        indicator: { key: over.key, zone, level: over.level },
      };
    }
  }
  const { parentId, index } = target.move;
  if (parentId === active.parentId && index === active.posInSet - 1) return null;
  return canDrop && !canDrop(activeId, parentId) ? null : target;
}

/** A rendered row's vertical extent in viewport px, in tree order. */
export interface RowRect {
  key: string;
  top: number;
  bottom: number;
}

/**
 * The row under the pointer and its zone; `key` null = the empty space below the last row (after the last
 * root). `null` outside `bounds` (the tree's visible box) or in a gap above the rows.
 */
export function hitTest(
  rows: RowRect[],
  bounds: { top: number; bottom: number; left: number; right: number },
  x: number,
  y: number,
): { key: string | null; zone: DropZone } | null {
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
  const row = rows.find((r) => y >= r.top && y < r.bottom);
  if (row) return { key: row.key, zone: zoneAt(y - row.top, row.bottom - row.top) };
  const last = rows[rows.length - 1];
  return last && y >= last.bottom ? { key: null, zone: 'after' } : null;
}
