import { arrangeNodes, computeLayout, ESTIMATED_NODE_SIZE } from './layout';
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

  it('ranks a cycle disconnected from the sources left to right', () => {
    // `a` is a source, so the source pass never reaches the b⇄c cycle —
    // the cycle must still be ranked so its edge flows left → right.
    const pos = computeLayout([n('a'), n('b'), n('c')], [e('b', 'c'), e('c', 'b')]);
    expect(pos.size).toBe(3);
    expect(pos.get('b')!.x).toBeLessThan(pos.get('c')!.x);
  });

  it('ignores self-loops for ranking', () => {
    const pos = computeLayout([n('a'), n('b')], [e('a', 'a'), e('a', 'b')]);
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
  });

  it('ignores edges referencing unknown nodes', () => {
    const pos = computeLayout([n('a')], [e('a', 'ghost')]);
    expect(pos.size).toBe(1);
  });

  it('reorders a rank by predecessor position to reduce crossings', () => {
    // Input order lists x before y, but b→x and a→y with rank-0 order [a, b]
    // means y must be placed above x or the two edges cross.
    const pos = computeLayout([n('a'), n('b'), n('x'), n('y')], [e('b', 'x'), e('a', 'y')]);
    expect(pos.get('x')!.x).toBe(pos.get('y')!.x);
    expect(pos.get('y')!.y).toBeLessThan(pos.get('x')!.y);
  });

  it('vertically centers a shorter rank against the tallest rank', () => {
    // Rank 0 has three stacked nodes; rank 1 has one. The lone node's center
    // must sit at the vertical midpoint of the three-node column.
    const pos = computeLayout(
      [n('a'), n('b'), n('c'), n('z')],
      [e('a', 'z'), e('b', 'z'), e('c', 'z')],
    );
    const { height } = ESTIMATED_NODE_SIZE;
    const rank0Mid = (pos.get('a')!.y + pos.get('c')!.y + height) / 2;
    expect(pos.get('z')!.y + height / 2).toBe(rank0Mid);
    expect(pos.get('z')!.y).toBeGreaterThan(pos.get('a')!.y);
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

  it('ignores pinned nodes (explicit position) — absent from the result', () => {
    const pos = computeLayout(
      [n('a'), n('b'), { id: 'pinned', label: 'P', position: { x: 5, y: 5 } }],
      [e('a', 'b')],
    );
    expect(pos.has('pinned')).toBe(false);
    expect(pos.has('a')).toBe(true);
    expect(pos.has('b')).toBe(true);
  });

  it('lays out auto nodes independently of pinned nodes', () => {
    const autoOnly = computeLayout([n('a'), n('b'), n('c')], [e('a', 'b'), e('b', 'c')]);
    const withPinned = computeLayout(
      [n('a'), n('b'), n('c'), { id: 'd', label: 'D', position: { x: 9, y: 9 } }],
      [e('a', 'b'), e('b', 'c')],
    );
    expect(withPinned.get('a')).toEqual(autoOnly.get('a'));
    expect(withPinned.get('b')).toEqual(autoOnly.get('b'));
    expect(withPinned.get('c')).toEqual(autoOnly.get('c'));
  });

  it('treats an auto node fed only by a pinned node as a source (edge to pinned skipped)', () => {
    const pos = computeLayout(
      [{ id: 'p', label: 'P', position: { x: 0, y: 0 } }, n('b')],
      [e('p', 'b')],
    );
    expect(pos.has('p')).toBe(false);
    expect(pos.get('b')!.x).toBe(0); // rank-0 source, no incoming
  });

  it('returns an empty map when every node is pinned', () => {
    const pos = computeLayout(
      [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 1, y: 1 } },
      ],
      [e('a', 'b')],
    );
    expect(pos.size).toBe(0);
  });
});

describe('arrangeNodes', () => {
  it('gives every node a position and lays the graph out left → right', () => {
    const result = arrangeNodes([n('a'), n('b'), n('c')], [e('a', 'b'), e('b', 'c')]);
    expect(result.every((node) => node.position !== undefined)).toBe(true);
    const x = (id: string) => result.find((node) => node.id === id)!.position!.x;
    expect(x('a')).toBeLessThan(x('b'));
    expect(x('b')).toBeLessThan(x('c'));
  });

  it('overwrites existing (pinned) positions — it re-flows ALL nodes', () => {
    const result = arrangeNodes(
      [{ id: 'a', label: 'A', position: { x: 999, y: 999 } }, n('b')],
      [e('a', 'b')],
    );
    expect(result.find((node) => node.id === 'a')!.position).not.toEqual({ x: 999, y: 999 });
    expect(result.find((node) => node.id === 'b')!.position).toBeDefined();
  });

  it('preserves all other node fields', () => {
    const result = arrangeNodes([{ id: 'a', label: 'A', color: '#123456', adornment: 'x' }], []);
    const a = result.find((node) => node.id === 'a')!;
    expect(a.label).toBe('A');
    expect(a.color).toBe('#123456');
    expect(a.adornment).toBe('x');
  });

  it('is deterministic', () => {
    const nodes = [n('a'), n('b'), n('c')];
    const edges = [e('a', 'b')];
    expect(arrangeNodes(nodes, edges)).toEqual(arrangeNodes(nodes, edges));
  });
});
