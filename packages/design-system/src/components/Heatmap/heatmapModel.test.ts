import { scaleLinear } from 'd3-scale';
import { estimateTextWidth } from '../Chart/chartModel';
import { bucketOf, computeHeatmapLayout, heatmapBuckets, legendEntries } from './heatmapModel';

const finite = (rows: (number | null)[][]) =>
  rows.flat().filter((v): v is number => v !== null && Number.isFinite(v));

/** Every value lands in exactly one bucket; min in the first, max in the last. */
function expectCovers(rows: (number | null)[][]) {
  const b = heatmapBuckets(rows)!;
  const vals = finite(rows);
  const n = b.steps.length;
  for (const v of vals) {
    const i = bucketOf(v, b);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(n);
    // Inside its bucket's edges (the last bucket is closed).
    expect(v).toBeGreaterThanOrEqual(b.thresholds[i]);
    if (i < n - 1) expect(v).toBeLessThan(b.thresholds[i + 1]);
    else expect(v).toBeLessThanOrEqual(b.thresholds[n]);
  }
  expect(bucketOf(Math.min(...vals), b)).toBe(0);
  expect(bucketOf(Math.max(...vals), b)).toBe(n - 1);
  return b;
}

const unique = (xs: string[]) => new Set(xs).size === xs.length;

describe('heatmapBuckets', () => {
  it('gives small integer data one bucket per integer, spread over the ramp ends', () => {
    const b = expectCovers([
      [0, 1],
      [2, 3],
    ]);
    expect(b.integer).toBe(true);
    expect(b.steps).toEqual([1, 2, 4, 5]);
    expect(legendEntries(b, String).map((e) => e.text)).toEqual(['0', '1', '2', '3']);
    expect(legendEntries(b, String).map((e) => e.step)).toEqual([1, 2, 4, 5]);
  });

  it('puts all-equal values in one middle bucket', () => {
    const b = expectCovers([[5, 5]]);
    expect(b.steps).toEqual([3]);
    expect(legendEntries(b, String).map((e) => e.text)).toEqual(['5']);
    const frac = heatmapBuckets([[2.5, 2.5]])!;
    expect(frac.steps).toEqual([3]);
    expect(bucketOf(2.5, frac)).toBe(0);
    expect(legendEntries(frac, String).map((e) => e.text)).toEqual(['2.5']);
  });

  it('uses nice d3 ticks as boundaries for continuous data, at most five buckets', () => {
    const b = expectCovers([
      [0, 0.37],
      [12.5, 99.9],
    ]);
    expect(b.integer).toBe(false);
    expect(b.steps.length).toBeLessThanOrEqual(5);
    expect(b.steps[0]).toBe(1);
    expect(b.steps[b.steps.length - 1]).toBe(5);
    const lo = b.thresholds[0];
    const hi = b.thresholds[b.thresholds.length - 1];
    const step = b.thresholds[1] - b.thresholds[0];
    // Each boundary is a tick d3 itself produces for the nice domain.
    expect(b.thresholds).toEqual(
      scaleLinear()
        .domain([lo, hi])
        .ticks(Math.round((hi - lo) / step)),
    );
  });

  it('caps the bucket count when d3 would tick finer than five buckets', () => {
    // [0, 7] at a count of 5 ticks every 1 (eight buckets).
    const b = expectCovers([[0, 1, 2, 3, 4, 5, 6, 7]]);
    expect(b.steps.length).toBeLessThanOrEqual(5);
    expect(b.thresholds.every(Number.isInteger)).toBe(true);
  });

  it('spreads three buckets over steps 1, 3, 5 and two over 1, 5', () => {
    expect(heatmapBuckets([[1, 2, 3]])!.steps).toEqual([1, 3, 5]);
    expect(heatmapBuckets([[1, 2]])!.steps).toEqual([1, 5]);
  });

  it('keeps legend texts unique and non-overlapping after formatting', () => {
    const integerRows = [[0, 1, 2, 3, 4, 5, 6, 7]];
    const b = heatmapBuckets(integerRows)!;
    const texts = legendEntries(b, String).map((e) => e.text);
    expect(unique(texts)).toBe(true);
    // Integer buckets are closed ranges "lo–hi": each starts after the previous one ends.
    const ranges = texts.map((s) => s.split('–').map(Number));
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][0]).toBeGreaterThan(ranges[i - 1][ranges[i - 1].length - 1]);
    }
    expect(ranges[0][0]).toBe(0);
    // The last bucket ends on its nice edge, at or past the max.
    expect(ranges[ranges.length - 1].at(-1)).toBeGreaterThanOrEqual(7);

    const grams = legendEntries(heatmapBuckets([[0, 3, 1, 2]])!, (n) => `${n} g`);
    expect(grams.map((e) => e.text)).toEqual(['0 g', '1 g', '2 g', '3 g']);
  });

  it('ignores nulls and non-finite values, and is null without a finite value', () => {
    expect(heatmapBuckets([[null, NaN, 1, Infinity, 2]])!.steps).toEqual([1, 5]);
    expect(heatmapBuckets([[null], [null, null]])).toBeNull();
    expect(heatmapBuckets([])).toBeNull();
  });
});

describe('computeHeatmapLayout', () => {
  const rows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  it('fills the width with cells and thins column labels so they fit at 390px', () => {
    const l = computeHeatmapLayout({ rows, columns: hours, width: 390 });
    expect(l.plot.x).toBeGreaterThanOrEqual(estimateTextWidth('Mon'));
    // Fills the width, less room for the last label's right half.
    const right = l.plot.x + l.cellWidth * hours.length;
    expect(right).toBeLessThanOrEqual(390);
    expect(right).toBeGreaterThanOrEqual(390 - estimateTextWidth('23') / 2);
    expect(l.cellHeight).toBeGreaterThan(0);
    expect(l.height).toBeGreaterThanOrEqual(l.plot.y + l.cellHeight * rows.length);
    expect(l.columnLabels.length).toBeLessThan(hours.length);
    expect(l.columnLabels[0].index).toBe(0);
    // Kept labels never overlap.
    for (let i = 1; i < l.columnLabels.length; i++) {
      const gap = l.columnLabels[i].x - l.columnLabels[i - 1].x;
      expect(gap).toBeGreaterThanOrEqual(estimateTextWidth('00'));
    }
  });

  it('keeps every column label when they fit', () => {
    const l = computeHeatmapLayout({ rows, columns: ['A', 'B', 'C'], width: 600 });
    expect(l.columnLabels.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it('hit-tests a point to its cell and misses outside the grid', () => {
    const l = computeHeatmapLayout({ rows, columns: hours, width: 390 });
    const cx = l.plot.x + l.cellWidth * 5.5;
    const cy = l.plot.y + l.cellHeight * 2.5;
    expect(l.cellAt(cx, cy)).toEqual({ row: 2, col: 5 });
    expect(l.cellAt(l.plot.x - 1, cy)).toBeNull();
    expect(l.cellAt(cx, l.plot.y + l.cellHeight * rows.length + 1)).toBeNull();
  });
});
