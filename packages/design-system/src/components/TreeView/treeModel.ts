import type { ReactNode } from 'react';

/** One node of a TreeView. */
export interface TreeViewNode {
  /** Stable unique id. */
  id: string;
  /** Accessible name of the row and typeahead text; rendered when `content` is absent. */
  label: string;
  /** Whether the node can expand. Its children may not be loaded yet. */
  hasChildren: boolean;
  /** Rich, non-interactive row content. Visual only: the row is named by `label`. */
  content?: ReactNode;
}

/** Children of a node: the loaded array, `undefined` while loading, `{ error: true }` when the load failed. */
export type TreeViewChildren = TreeViewNode[] | undefined | { error: true };

/** "N more not shown" row at the end of a level. */
export interface TreeViewOverflow {
  /** Visible text and accessible name, e.g. "12 more not shown". */
  label: string;
  /** Makes the row actionable (Enter / click). */
  onLoadMore?: () => void;
  /** A load-more fetch is in flight: the row shows the translated loading text and is inert. */
  loading?: boolean;
}

/** Presentation of a TreeView. */
export type TreeViewView = 'list' | 'chart';

export type TreeItem =
  | {
      kind: 'node';
      key: string;
      node: TreeViewNode;
      level: number;
      parentId: string | null;
      setSize: number;
      posInSet: number;
      expanded: boolean;
      children: TreeItem[];
    }
  | { kind: 'loading' | 'error'; key: string; level: number; parentId: string }
  | {
      kind: 'overflow';
      key: string;
      level: number;
      parentId: string | null;
      overflow: TreeViewOverflow;
    };

export interface TreeModelInput {
  roots: TreeViewNode[];
  childrenOf: (id: string) => TreeViewChildren;
  expandedIds: ReadonlySet<string>;
  overflowOf?: (parentId: string | null) => TreeViewOverflow | null;
}

export type TreeAction =
  | { type: 'focus'; key: string }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  | { type: 'activate'; key: string };

export const nodeKey = (id: string) => `node:${id}`;

function level(
  nodes: TreeViewNode[],
  depth: number,
  parentId: string | null,
  input: TreeModelInput,
): TreeItem[] {
  const out: TreeItem[] = nodes.map((node, i) => {
    const expanded = node.hasChildren && input.expandedIds.has(node.id);
    let children: TreeItem[] = [];
    if (expanded) {
      const kids = input.childrenOf(node.id);
      if (kids === undefined) {
        children = [
          { kind: 'loading', key: `loading:${node.id}`, level: depth + 1, parentId: node.id },
        ];
      } else if (!Array.isArray(kids)) {
        children = [
          { kind: 'error', key: `error:${node.id}`, level: depth + 1, parentId: node.id },
        ];
      } else {
        children = level(kids, depth + 1, node.id, input);
      }
    }
    return {
      kind: 'node',
      key: nodeKey(node.id),
      node,
      level: depth,
      parentId,
      setSize: nodes.length,
      posInSet: i + 1,
      expanded,
      children,
    };
  });
  const overflow = input.overflowOf?.(parentId) ?? null;
  if (overflow) {
    out.push({
      kind: 'overflow',
      key: `overflow:${parentId ?? ''}`,
      level: depth,
      parentId,
      overflow,
    });
  }
  return out;
}

/** Nested items in render order: nodes, plus loading / error / overflow status rows. */
export function buildTree(input: TreeModelInput): TreeItem[] {
  return level(input.roots, 1, null, input);
}

/** Visible items in document order. */
export function flatten(items: TreeItem[]): TreeItem[] {
  return items.flatMap((item) =>
    item.kind === 'node' ? [item, ...flatten(item.children)] : [item],
  );
}

function enter(flat: TreeItem[], i: number): TreeAction | null {
  const item = flat[i];
  if (item.kind !== 'node' || !item.node.hasChildren) return null;
  if (!item.expanded) return { type: 'expand', id: item.node.id };
  const next = flat[i + 1];
  return next && next.parentId === item.node.id ? { type: 'focus', key: next.key } : null;
}

function leave(flat: TreeItem[], i: number): TreeAction | null {
  const item = flat[i];
  if (item.kind === 'node' && item.expanded) return { type: 'collapse', id: item.node.id };
  return item.parentId === null ? null : { type: 'focus', key: nodeKey(item.parentId) };
}

function sibling(flat: TreeItem[], i: number, step: 1 | -1): TreeAction | null {
  const item = flat[i];
  for (let j = i + step; j >= 0 && j < flat.length; j += step) {
    if (flat[j].level < item.level) return null;
    if (flat[j].level === item.level) return { type: 'focus', key: flat[j].key };
  }
  return null;
}

/** Resolves a keyboard key on the item `currentKey` to an action, or null when the key does nothing. */
export function keyAction(
  flat: TreeItem[],
  currentKey: string,
  key: string,
  view: TreeViewView,
): TreeAction | null {
  const i = flat.findIndex((item) => item.key === currentKey);
  if (i < 0) return null;
  const focus = (j: number): TreeAction | null =>
    flat[j] ? { type: 'focus', key: flat[j].key } : null;
  switch (key) {
    case 'Home':
      return focus(0);
    case 'End':
      return focus(flat.length - 1);
    case 'Enter':
    case ' ':
      return { type: 'activate', key: currentKey };
  }
  if (view === 'list') {
    switch (key) {
      case 'ArrowDown':
        return focus(i + 1);
      case 'ArrowUp':
        return i > 0 ? focus(i - 1) : null;
      case 'ArrowRight':
        return enter(flat, i);
      case 'ArrowLeft':
        return leave(flat, i);
    }
    return null;
  }
  switch (key) {
    case 'ArrowDown':
      return enter(flat, i);
    case 'ArrowUp':
      return leave(flat, i);
    case 'ArrowRight':
      return sibling(flat, i, 1);
    case 'ArrowLeft':
      return sibling(flat, i, -1);
  }
  return null;
}

/**
 * Next node whose label starts with `buffer` (case-insensitive), searching after the current item for a
 * single character and from the current item for a longer buffer, wrapping. Status rows are skipped.
 */
export function typeaheadMatch(
  flat: TreeItem[],
  currentKey: string,
  buffer: string,
): string | null {
  const i = Math.max(
    0,
    flat.findIndex((item) => item.key === currentKey),
  );
  const start = buffer.length > 1 ? i : i + 1;
  const needle = buffer.toLocaleLowerCase();
  for (let k = 0; k < flat.length; k++) {
    const item = flat[(start + k) % flat.length];
    if (item.kind === 'node' && item.node.label.toLocaleLowerCase().startsWith(needle))
      return item.key;
  }
  return null;
}
