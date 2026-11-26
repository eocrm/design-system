import {
  buildTree,
  flatten,
  type TreeModelInput,
  type TreeViewChildren,
  type TreeViewNode,
} from './treeModel';
import { dropTarget, hitTest, keyboardMove, zoneAt } from './treeMove';

const n = (id: string, hasChildren = false): TreeViewNode => ({ id, label: id, hasChildren });
// a ─┬ a1
//    ├ a2 ─ a2x
//    └ a3
// b (collapsed) ─ b1, b2
// c (leaf)
const data: Record<string, TreeViewChildren> = {
  a: [n('a1'), n('a2', true), n('a3')],
  a2: [n('a2x')],
  b: [n('b1'), n('b2')],
};
const flatOf = (extra: Partial<TreeModelInput> = {}, expanded = ['a', 'a2']) =>
  flatten(
    buildTree({
      roots: [n('a', true), n('b', true), n('c')],
      childrenOf: (id) => data[id],
      expandedIds: new Set(expanded),
      ...extra,
    }),
  );
const flat = flatOf();
const moreOf = (parent: string | null) => (p: string | null) =>
  p === parent ? { label: 'more' } : null;

describe('keyboardMove', () => {
  it('swaps among siblings and refuses at the ends', () => {
    expect(keyboardMove(flat, 'a2', 'up')).toEqual({ move: { id: 'a2', parentId: 'a', index: 0 } });
    expect(keyboardMove(flat, 'a2', 'down')).toEqual({
      move: { id: 'a2', parentId: 'a', index: 2 },
    });
    expect(keyboardMove(flat, 'b', 'up')).toEqual({ move: { id: 'b', parentId: null, index: 0 } });
    expect(keyboardMove(flat, 'a1', 'up')).toEqual({ refusal: 'boundary' });
    expect(keyboardMove(flat, 'a3', 'down')).toEqual({ refusal: 'boundary' });
    expect(keyboardMove(flat, 'c', 'down')).toEqual({ refusal: 'boundary' });
  });

  it("indents into the previous sibling's end, expanding it when collapsed", () => {
    // expanded + loaded: index = its loaded child count
    expect(keyboardMove(flat, 'a3', 'indent')).toEqual({
      move: { id: 'a3', parentId: 'a2', index: 1 },
    });
    // collapsed: index unknown, expand it
    expect(keyboardMove(flat, 'c', 'indent')).toEqual({
      move: { id: 'c', parentId: 'b', index: null },
      expand: 'b',
    });
    // leaf: index 0, expand it so the moved node stays visible
    expect(keyboardMove(flat, 'a2', 'indent')).toEqual({
      move: { id: 'a2', parentId: 'a1', index: 0 },
      expand: 'a1',
    });
    // expanded but loading: index unknown, already expanded
    const loading = flatOf({ childrenOf: (id) => (id === 'b' ? undefined : data[id]) }, ['b']);
    expect(keyboardMove(loading, 'c', 'indent')).toEqual({
      move: { id: 'c', parentId: 'b', index: null },
    });
    expect(keyboardMove(flat, 'a', 'indent')).toEqual({ refusal: 'boundary' });
    expect(keyboardMove(flat, 'a1', 'indent')).toEqual({ refusal: 'boundary' });
  });

  it('outdents to the grandparent, right after the old parent', () => {
    expect(keyboardMove(flat, 'a2x', 'outdent')).toEqual({
      move: { id: 'a2x', parentId: 'a', index: 2 },
    });
    expect(keyboardMove(flat, 'a1', 'outdent')).toEqual({
      move: { id: 'a1', parentId: null, index: 1 },
    });
    expect(keyboardMove(flat, 'a', 'outdent')).toEqual({ refusal: 'boundary' });
  });

  it('is refused when canDrop says no', () => {
    const canDrop = vi.fn(() => false);
    expect(keyboardMove(flat, 'a3', 'indent', canDrop)).toEqual({ refusal: 'refused' });
    expect(canDrop).toHaveBeenCalledWith('a3', 'a2');
    expect(keyboardMove(flat, 'a1', 'up', canDrop)).toEqual({ refusal: 'boundary' });
  });
});

describe('zoneAt', () => {
  it('splits the row 25 / 50 / 25', () => {
    expect(zoneAt(0, 40)).toBe('before');
    expect(zoneAt(9.9, 40)).toBe('before');
    expect(zoneAt(10, 40)).toBe('inside');
    expect(zoneAt(29.9, 40)).toBe('inside');
    expect(zoneAt(30, 40)).toBe('after');
    expect(zoneAt(40, 40)).toBe('after');
  });
});

describe('dropTarget', () => {
  it('before / after among siblings, adjusting same-parent downward moves', () => {
    expect(dropTarget(flat, 'a1', 'node:a3', 'before')).toEqual({
      move: { id: 'a1', parentId: 'a', index: 1 },
      indicator: { key: 'node:a3', zone: 'before', level: 2 },
    });
    expect(dropTarget(flat, 'a3', 'node:a1', 'before')?.move).toEqual({
      id: 'a3',
      parentId: 'a',
      index: 0,
    });
    expect(dropTarget(flat, 'a3', 'node:a1', 'after')?.move).toEqual({
      id: 'a3',
      parentId: 'a',
      index: 1,
    });
    expect(dropTarget(flat, 'c', 'node:a1', 'after')).toEqual({
      move: { id: 'c', parentId: 'a', index: 1 },
      indicator: { key: 'node:a1', zone: 'after', level: 2 },
    });
    expect(dropTarget(flat, 'a1', 'node:c', 'after')?.move).toEqual({
      id: 'a1',
      parentId: null,
      index: 3,
    });
    // after a collapsed node is a plain sibling drop
    expect(dropTarget(flat, 'a1', 'node:b', 'after')?.move).toEqual({
      id: 'a1',
      parentId: null,
      index: 2,
    });
  });

  it('after an expanded node with visible children = index 0 inside it', () => {
    expect(dropTarget(flat, 'c', 'node:a2', 'after')).toEqual({
      move: { id: 'c', parentId: 'a2', index: 0 },
      indicator: { key: 'node:a2', zone: 'after', level: 3 },
    });
    expect(dropTarget(flat, 'c', 'node:a', 'after')?.move).toEqual({
      id: 'c',
      parentId: 'a',
      index: 0,
    });
  });

  it('inside appends: leaf 0, collapsed null, loaded count otherwise', () => {
    expect(dropTarget(flat, 'a1', 'node:c', 'inside')).toEqual({
      move: { id: 'a1', parentId: 'c', index: 0 },
      indicator: { key: 'node:c', zone: 'inside', level: 2 },
    });
    expect(dropTarget(flat, 'a1', 'node:b', 'inside')?.move).toEqual({
      id: 'a1',
      parentId: 'b',
      index: null,
    });
    expect(dropTarget(flat, 'c', 'node:a2', 'inside')?.move).toEqual({
      id: 'c',
      parentId: 'a2',
      index: 1,
    });
    // already a child: counted without itself
    expect(dropTarget(flat, 'a1', 'node:a', 'inside')?.move).toEqual({
      id: 'a1',
      parentId: 'a',
      index: 2,
    });
  });

  it('appending to a parent with an overflow row gives null', () => {
    const more = flatOf({ overflowOf: moreOf('a') });
    expect(dropTarget(more, 'c', 'node:a', 'inside')?.move.index).toBeNull();
    // after the last loaded child is still an explicit position
    expect(dropTarget(more, 'c', 'node:a3', 'after')?.move.index).toBe(3);
    const rootMore = flatOf({ overflowOf: moreOf(null) });
    expect(dropTarget(rootMore, 'a1', null, 'after')?.move).toEqual({
      id: 'a1',
      parentId: null,
      index: null,
    });
  });

  it('never targets itself, its rendered descendants or pseudo-rows', () => {
    expect(dropTarget(flat, 'a', 'node:a', 'inside')).toBeNull();
    expect(dropTarget(flat, 'a', 'node:a2x', 'before')).toBeNull();
    const more = flatOf({ overflowOf: moreOf('a') });
    expect(dropTarget(more, 'c', 'overflow:a', 'before')).toBeNull();
    expect(dropTarget(flat, 'missing', 'node:c', 'before')).toBeNull();
  });

  it('returns null for a no-op', () => {
    expect(dropTarget(flat, 'a2', 'node:a3', 'before')).toBeNull();
    expect(dropTarget(flat, 'a2', 'node:a1', 'after')).toBeNull();
    expect(dropTarget(flat, 'a3', 'node:a', 'inside')).toBeNull();
    expect(dropTarget(flat, 'c', null, 'after')).toBeNull();
  });

  it('overKey null = after the last root, indicated on that root (not its last visible descendant)', () => {
    expect(dropTarget(flat, 'a1', null, 'after')).toEqual({
      move: { id: 'a1', parentId: null, index: 3 },
      indicator: { key: 'node:c', zone: 'after', level: 1 },
    });
    const onlyA = flatten(
      buildTree({
        roots: [n('a', true)],
        childrenOf: (id) => data[id],
        expandedIds: new Set(['a']),
      }),
    );
    expect(dropTarget(onlyA, 'a1', null, 'after')).toEqual({
      move: { id: 'a1', parentId: null, index: 1 },
      indicator: { key: 'node:a', zone: 'after', level: 1 },
    });
  });

  it('honours canDrop', () => {
    const canDrop = vi.fn(() => false);
    expect(dropTarget(flat, 'c', 'node:a2', 'inside', canDrop)).toBeNull();
    expect(canDrop).toHaveBeenCalledWith('c', 'a2');
  });
});

describe('hitTest', () => {
  const rows = [
    { key: 'r0', top: 0, bottom: 20 },
    { key: 'r1', top: 20, bottom: 40 },
  ];
  const tree = { top: 0, bottom: 80, left: 0, right: 100 };
  it('maps the pointer to the row under it and its zone', () => {
    expect(hitTest(rows, tree, 10, 2)).toEqual({ key: 'r0', zone: 'before' });
    expect(hitTest(rows, tree, 10, 30)).toEqual({ key: 'r1', zone: 'inside' });
    expect(hitTest(rows, tree, 10, 39)).toEqual({ key: 'r1', zone: 'after' });
  });
  it('below the last row inside the tree = null key (after the last root)', () => {
    expect(hitTest(rows, tree, 10, 60)).toEqual({ key: null, zone: 'after' });
  });
  it('keeps about one row below the last row reachable when the tree is exactly as tall as its rows', () => {
    const tight = { ...tree, bottom: 40 };
    expect(hitTest(rows, tight, 10, 50)).toEqual({ key: null, zone: 'after' });
    expect(hitTest(rows, tight, 10, 61)).toBeNull();
  });
  it('outside the tree is no target', () => {
    expect(hitTest(rows, tree, 150, 10)).toBeNull();
    expect(hitTest(rows, tree, 10, 90)).toBeNull();
    expect(hitTest(rows, { ...tree, top: -10 }, 10, -5)).toBeNull();
    expect(hitTest([], tree, 10, 10)).toBeNull();
  });
});
