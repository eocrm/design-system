import { edgeGeometry, selfLoopGeometry } from './edgePath';
import type { Rect } from './edgePath';

const rect = (x: number, y: number): Rect => ({ x, y, width: 100, height: 40 });

describe('edgeGeometry', () => {
  it('anchors horizontally when dx dominates (right side → left side)', () => {
    const g = edgeGeometry(rect(0, 0), rect(300, 0));
    expect(g.path).toMatch(/^M 100 20 C /); // source right-middle
    expect(g.path).toMatch(/300 20$/); // target left-middle
  });

  it('anchors vertically when dy dominates (bottom → top)', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 300));
    expect(g.path).toMatch(/^M 50 40 C /); // source bottom-middle
    expect(g.path).toMatch(/50 300$/); // target top-middle
  });

  it('flips anchors for right-to-left edges', () => {
    const g = edgeGeometry(rect(300, 0), rect(0, 0));
    expect(g.path).toMatch(/^M 300 20 C /); // source LEFT-middle
    expect(g.path).toMatch(/100 20$/); // target RIGHT-middle
  });

  it('midpoint is the true cubic midpoint (t = 0.5)', () => {
    const g = edgeGeometry(rect(0, 0), rect(300, 0));
    // symmetric horizontal curve → midpoint sits halfway between anchors
    expect(g.midpoint.x).toBe(200);
    expect(g.midpoint.y).toBe(20);
  });

  it('offsets a reverse pair so the two edges do not overlap', () => {
    const ab = edgeGeometry(rect(0, 0), rect(300, 0), 1);
    const ba = edgeGeometry(rect(300, 0), rect(0, 0), -1);
    expect(ab.path).not.toBe(ba.path);
    expect(ab.midpoint.y).not.toBe(ba.midpoint.y);
  });

  it('produces only finite numbers even for coincident rects', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 0));
    // Template interpolation stringifies broken math as 'NaN' / 'Infinity' —
    // catch those tokens directly (a digits-only regex would skip them).
    expect(g.path).not.toMatch(/NaN|Infinity/);
    for (const value of g.path.match(/-?\d+(\.\d+)?/g)!.map(Number)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('selfLoopGeometry', () => {
  it('starts on the top edge and ends on the right edge of the node', () => {
    const g = selfLoopGeometry(rect(0, 0));
    expect(g.path).toMatch(/^M 75 0 C /);
    expect(g.path).toMatch(/100 10$/);
    expect(g.midpoint.y).toBeLessThan(0); // chip floats above the node
  });
});

describe('edgeGeometry endpoints', () => {
  it('returns source/target points on the facing sides of the two rects', () => {
    const source = { x: 0, y: 0, width: 100, height: 40 };
    const target = { x: 300, y: 0, width: 100, height: 40 };
    const g = edgeGeometry(source, target);
    // horizontal layout: source anchor on source's right edge, target on target's left edge
    expect(g.source).toEqual({ x: 100, y: 20 });
    expect(g.target).toEqual({ x: 300, y: 20 });
  });

  it('selfLoopGeometry exposes its start/end points', () => {
    const g = selfLoopGeometry({ x: 0, y: 0, width: 100, height: 40 });
    expect(g.source).toEqual({ x: 75, y: 0 });
    expect(g.target).toEqual({ x: 100, y: 10 });
  });
});
