import { gapIndexFromY } from './blockDrop';

describe('gapIndexFromY', () => {
  const rects = [
    { top: 0, height: 20 },
    { top: 20, height: 20 },
    { top: 40, height: 20 },
  ];
  it('returns 0 above the first block midpoint', () => {
    expect(gapIndexFromY(rects, 5)).toBe(0);
  });
  it('returns 1 between the first and second midpoints', () => {
    expect(gapIndexFromY(rects, 25)).toBe(1);
  });
  it('returns 2 between the second and third midpoints', () => {
    expect(gapIndexFromY(rects, 45)).toBe(2);
  });
  it('returns rects.length past the last block', () => {
    expect(gapIndexFromY(rects, 100)).toBe(3);
  });
  it('handles an empty list', () => {
    expect(gapIndexFromY([], 10)).toBe(0);
  });
});
