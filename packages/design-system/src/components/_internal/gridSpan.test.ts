import { resolveCollapsedGridItemSpan } from './gridSpan';

describe('resolveCollapsedGridItemSpan (#318)', () => {
  it('returns auto for a span-less item', () => {
    expect(resolveCollapsedGridItemSpan(undefined, 6)).toBe('auto');
  });
  it('keeps spans smaller than the step columns', () => {
    expect(resolveCollapsedGridItemSpan(3, 6)).toBe('span 3');
    expect(resolveCollapsedGridItemSpan('25%', 6)).toBe('span 3');
  });
  it('clamps spans >= step columns to the full row', () => {
    expect(resolveCollapsedGridItemSpan(9, 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan('75%', 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan(6, 6)).toBe('1 / -1');
  });
  it('full-row spans and single-column steps are always 1 / -1', () => {
    expect(resolveCollapsedGridItemSpan('100%', 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan('full', 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan(3, 1)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan(undefined, 1)).toBe('auto');
  });
});
