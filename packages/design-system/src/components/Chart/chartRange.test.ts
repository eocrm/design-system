import { describe, expect, it } from 'vitest';
import { rangeFromIndices, resolveRange, sliceForZoom } from './chartRange';
import type { ChartMarker, ChartSeries } from './chartModel';

describe('resolveRange', () => {
  it('orders reversed bounds', () => {
    expect(resolveRange({ from: 'Wed', to: 'Mon' }, ['Mon', 'Tue', 'Wed'])).toEqual({
      from: 0,
      to: 2,
    });
  });
  it('returns null for unknown or missing ranges', () => {
    expect(resolveRange({ from: 'Mon', to: 'Nope' }, ['Mon', 'Tue'])).toBeNull();
    expect(resolveRange(null, ['Mon'])).toBeNull();
    expect(resolveRange(undefined, ['Mon'])).toBeNull();
  });
  it('uses the first match for duplicate categories', () => {
    expect(resolveRange({ from: 'a', to: 'b' }, ['a', 'b', 'a'])).toEqual({ from: 0, to: 1 });
  });
});

describe('rangeFromIndices', () => {
  it('orders the indices', () => {
    expect(rangeFromIndices(3, 1, ['a', 'b', 'c', 'd'])).toEqual({ from: 'b', to: 'd' });
  });
});

describe('sliceForZoom', () => {
  const categories = ['c0', 'c1', 'c2', 'c3', 'c4'];
  const series: ChartSeries[] = [
    { key: 's', label: 'S', values: [1, 2, 3, 4, 5], color: 3 },
    { key: 'p', label: 'P', values: [5, null, 3, 2, 1], comparisonOf: 's' },
  ];
  const markers: ChartMarker[] = [
    { key: 'span', from: 'c0', to: 'c2' },
    { key: 'rev', from: 'c4', to: 'c3' },
    { key: 'in', at: 'c2' },
    { key: 'out', at: 'c4' },
    { key: 'outSpan', from: 'c4', to: 'c4' },
  ];
  const r = sliceForZoom(categories, series, markers, { from: 1, to: 3 });

  it('slices categories and every series, keeping metadata', () => {
    expect(r.categories).toEqual(['c1', 'c2', 'c3']);
    expect(r.series[0]).toEqual({ ...series[0], values: [2, 3, 4] });
    expect(r.series[1]).toEqual({ ...series[1], values: [null, 3, 2] });
  });
  it('maps back to original indices', () => {
    expect(r.originalIndex(0)).toBe(1);
    expect(r.originalIndex(2)).toBe(3);
  });
  it('clips spans, keeps inside points, drops outside markers', () => {
    expect(r.markers).toEqual([
      { key: 'span', from: 'c1', to: 'c2' },
      { key: 'rev', from: 'c3', to: 'c3' },
      { key: 'in', at: 'c2' },
    ]);
  });
});
