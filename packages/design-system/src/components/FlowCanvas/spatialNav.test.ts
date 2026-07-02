import { nearestInDirection, topLeftMost } from './spatialNav';
import type { Rect } from './edgePath';

const rects = new Map<string, Rect>([
  ['a', { x: 0, y: 0, width: 100, height: 40 }],
  ['b', { x: 200, y: 0, width: 100, height: 40 }],
  ['c', { x: 200, y: 200, width: 100, height: 40 }],
  ['d', { x: 0, y: 200, width: 100, height: 40 }],
]);

describe('nearestInDirection', () => {
  it('finds the node to the right', () => {
    expect(nearestInDirection('a', rects, 'right')).toBe('b');
  });
  it('finds the node below', () => {
    expect(nearestInDirection('a', rects, 'down')).toBe('d');
  });
  it('prefers the aligned candidate over a closer diagonal one', () => {
    expect(nearestInDirection('d', rects, 'right')).toBe('c');
  });
  it('returns null at the boundary', () => {
    expect(nearestInDirection('b', rects, 'right')).toBeNull();
  });
  it('returns null for an unknown id', () => {
    expect(nearestInDirection('ghost', rects, 'left')).toBeNull();
  });
});

describe('topLeftMost', () => {
  it('picks the topmost-leftmost rect', () => {
    expect(topLeftMost(rects)).toBe('a');
  });
  it('returns null for an empty map', () => {
    expect(topLeftMost(new Map())).toBeNull();
  });
});
