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
