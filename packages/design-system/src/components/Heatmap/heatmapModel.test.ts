import { scaleLinear } from 'd3-scale';
import { estimateTextWidth } from '../Chart/chartModel';
import {
  bucketOf,
  CELL_MIN,
  computeHeatmapLayout,
  heatmapBuckets,
  heatmapLegend,
  type HeatmapBuckets,
  type HeatmapLegend,
} from './heatmapModel';

type Fmt = (n: number) => string;

const finite = (rows: (number | null)[][]) =>
  rows.flat().filter((v): v is number => v !== null && Number.isFinite(v));

/** Every value lands in exactly one bucket; min in the first, max in the last; the ends are the data's. */
function expectCovers(rows: (number | null)[][], fmt: Fmt = String) {
  const b = heatmapBuckets(rows, fmt)!;
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
  expect(b.thresholds[0]).toBe(Math.min(...vals));
  expect(b.thresholds[n]).toBe(Math.max(...vals));
  expect(bucketOf(Math.min(...vals), b)).toBe(0);
  expect(bucketOf(Math.max(...vals), b)).toBe(n - 1);
  return b;
}

const texts = (l: HeatmapLegend) => {
  if (l.kind !== 'ranges') throw new Error(`expected ranges, got ${l.kind}`);
  return l.items.map((e) => e.text);
};

/** Integer legend: first starts at min, last ends at max, ranges disjoint and increasing. */
function expectDisjointRanges(b: HeatmapBuckets, min: number, max: number) {
  const ranges = texts(heatmapLegend(b, String)).map((s) => s.split('–').map(Number));
  expect(ranges[0][0]).toBe(min);
  expect(ranges[ranges.length - 1].at(-1)).toBe(max);
  for (const r of ranges) expect(r[0]).toBeLessThanOrEqual(r[r.length - 1]);
  for (let i = 1; i < ranges.length; i++) {
    expect(ranges[i][0]).toBe(ranges[i - 1][ranges[i - 1].length - 1] + 1);
  }
  return ranges;
}

/** Every value printed in the legend: range ends and boundaries, split on the range dash. */
const legendPieces = (l: HeatmapLegend) =>
  l.kind === 'scale' ? l.boundaries : l.items.flatMap((e) => e.text.split('–'));

const intRange = (lo: number, hi: number) => [
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
];

describe('heatmapBuckets / heatmapLegend', () => {
  it('gives small integer data one bucket per integer, spread over the ramp ends', () => {
    const b = expectCovers([
      [0, 1],
      [2, 3],
    ]);
    expect(b.integer).toBe(true);
    expect(b.steps).toEqual([1, 2, 4, 5]);
    const l = heatmapLegend(b, String);
    expect(texts(l)).toEqual(['0', '1', '2', '3']);
    expect(l.kind === 'ranges' && l.items.map((e) => e.step)).toEqual([1, 2, 4, 5]);
  });

  it('puts all-equal values in one middle bucket with one label', () => {
    const b = expectCovers([[5, 5]]);
    expect(b.steps).toEqual([3]);
    expect(texts(heatmapLegend(b, String))).toEqual(['5']);
    const frac = heatmapBuckets([[2.5, 2.5]], String)!;
    expect(frac.steps).toEqual([3]);
    expect(bucketOf(2.5, frac)).toBe(0);
    expect(texts(heatmapLegend(frac, String))).toEqual(['2.5']);
  });

  it('uses nice d3 ticks between the data ends for continuous data, at most five buckets', () => {
    const b = expectCovers([
      [0, 0.37],
      [12.5, 99.9],
    ]);
    expect(b.integer).toBe(false);
    expect(b.steps.length).toBeLessThanOrEqual(5);
    expect(b.steps[0]).toBe(1);
    expect(b.steps[b.steps.length - 1]).toBe(5);
    // Interior boundaries are ticks d3 itself produces for the nice domain.
    const interior = b.thresholds.slice(1, -1);
    const step = interior[1] - interior[0];
    const all = scaleLinear()
      .domain([0, 100])
      .ticks(Math.round(100 / step));
    for (const t of interior) expect(all).toContain(t);
  });

  it('draws continuous data as a stepped bar, each boundary printed once', () => {
    const b = heatmapBuckets([[0, 99.9]], String)!;
    const l = heatmapLegend(b, String);
    expect(l.kind).toBe('scale');
    if (l.kind !== 'scale') return;
    expect(l.boundaries).toHaveLength(l.steps.length + 1);
    expect(new Set(l.boundaries).size).toBe(l.boundaries.length);
    expect(l.boundaries[0]).toBe('0');
    expect(l.boundaries.at(-1)).toBe('99.9');
  });

  it('drops buckets until the formatted boundaries are distinct', () => {
    const fmt: Fmt = (n) => n.toFixed(0);
    const b = expectCovers([[0, 0.9]], fmt);
    const l = heatmapLegend(b, fmt);
    const labels = l.kind === 'scale' ? l.boundaries : l.items.map((e) => e.text);
    expect(new Set(labels).size).toBe(labels.length);
    expect(b.steps.length).toBeLessThanOrEqual(2);
    if (l.kind === 'scale') expect(l.boundaries).toEqual(['0', '1']);
    // Too close to tell apart at all: one bucket, step 3, one label.
    const tight = heatmapBuckets([[0.1, 0.2]], fmt)!;
    expect(tight.steps).toEqual([3]);
    expect(texts(heatmapLegend(tight, fmt))).toEqual(['0']);
  });

  it('caps the bucket count when d3 would tick finer than five buckets', () => {
    // [0, 7] at a count of 5 ticks every 1 (eight buckets).
    const b = expectCovers(intRange(0, 7));
    expect(b.steps.length).toBeLessThanOrEqual(5);
    expect(b.thresholds.every(Number.isInteger)).toBe(true);
  });

  it('spreads three buckets over steps 1, 3, 5 and two over 1, 5', () => {
    expect(heatmapBuckets([[1, 2, 3]], String)!.steps).toEqual([1, 3, 5]);
    expect(heatmapBuckets([[1, 2]], String)!.steps).toEqual([1, 5]);
  });

  it('clamps integer legend ranges to the data, disjoint, never sharing an endpoint', () => {
    const r07 = expectDisjointRanges(expectCovers(intRange(0, 7)), 0, 7);
    expect(r07.at(-1)).toEqual([6, 7]);
    expectDisjointRanges(expectCovers(intRange(1, 9)), 1, 9);
    expectDisjointRanges(expectCovers(intRange(3, 11)), 3, 11);
    const grams = heatmapLegend(heatmapBuckets([[0, 3, 1, 2]], String)!, (n) => `${n} g`);
    expect(texts(grams)).toEqual(['0 g', '1 g', '2 g', '3 g']);
  });

  it('falls back to the stepped bar when a coarse formatter would make integer ranges touch', () => {
    const hundreds: Fmt = (n) => String(Math.round(n / 100) * 100);
    const b = expectCovers(intRange(0, 1000), hundreds);
    const pieces = legendPieces(heatmapLegend(b, hundreds));
    expect(pieces.length).toBeGreaterThan(1);
    expect(new Set(pieces).size).toBe(pieces.length);

    const thousands: Fmt = (n) => `${Math.round(n / 1000)}k`;
    const tiny = expectCovers(intRange(0, 10), thousands);
    expect(tiny.steps).toEqual([3]);
    expect(texts(heatmapLegend(tiny, thousands))).toEqual(['0k']);
  });

  it('never prints "-0" next to "0"', () => {
    const fmt: Fmt = (n) => n.toFixed(0);
    const b = expectCovers([[-0.4, 0.4]], fmt);
    const pieces = legendPieces(heatmapLegend(b, fmt));
    expect(pieces).not.toContain('-0');
    expect(new Set(pieces).size).toBe(pieces.length);
  });

  it('never prints "-0" through a prefixed formatter', () => {
    const fmt: Fmt = (n) => '$' + n.toFixed(0);
    const b = expectCovers([[-0.4, 0.4]], fmt);
    const pieces = legendPieces(heatmapLegend(b, fmt));
    expect(pieces).not.toContain('$-0');
    expect(new Set(pieces).size).toBe(pieces.length);
  });

  it('ignores nulls and non-finite values, and is null without a finite value', () => {
    expect(heatmapBuckets([[null, NaN, 1, Infinity, 2]], String)!.steps).toEqual([1, 5]);
    expect(heatmapBuckets([[null], [null, null]], String)).toBeNull();
    expect(heatmapBuckets([], String)).toBeNull();
  });
});

describe('computeHeatmapLayout', () => {
  const rows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  it('fills the width with cells and thins column labels so they fit at 390px', () => {
    const l = computeHeatmapLayout({ rows, columns: hours, width: 390 });
    expect(l.plot.x).toBeGreaterThanOrEqual(estimateTextWidth('Mon'));
    // Fills the width, less room for the last label's right half.
    const right = l.plot.x + l.cell * hours.length;
    expect(right).toBeLessThanOrEqual(390);
    expect(right).toBeGreaterThanOrEqual(390 - estimateTextWidth('23') / 2);
    expect(l.cell).toBeGreaterThan(0);
    expect(l.height).toBeGreaterThanOrEqual(l.plot.y + l.cell * rows.length);
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

  it('square cells: the width limits them without a height, the tighter of width and height with one', () => {
    const side = (width: number, height?: number) =>
      computeHeatmapLayout({ rows, columns: hours, width, height }).cell;
    const auto = computeHeatmapLayout({ rows, columns: hours, width: 390 });
    expect(auto.height).toBeCloseTo(auto.cell * rows.length + 20);
    expect(auto.naturalHeight).toBeCloseTo(auto.height);
    // A tall box: still width-limited, the leftover height stays empty.
    expect(side(390, 1000)).toBeCloseTo(auto.cell);
    // A short, wide box: height-limited, the leftover width stays empty.
    const wide = computeHeatmapLayout({ rows, columns: hours, width: 1200, height: 160 });
    expect(wide.cell).toBeCloseTo((160 - 20) / rows.length);
    expect(wide.height).toBeCloseTo(160);
    expect(wide.plot.x + wide.cell * hours.length).toBeLessThan(1200 / 2);
    expect(wide.naturalHeight).toBeGreaterThan(wide.height);
    // Never below the minimum side: the grid overflows instead.
    expect(side(1200, 50)).toBe(CELL_MIN);
    expect(side(100)).toBe(CELL_MIN);
  });

  it('minWidth fits minimum cells and the last column label', () => {
    const l = computeHeatmapLayout({ rows, columns: hours, width: 100 });
    const at = computeHeatmapLayout({ rows, columns: hours, width: l.minWidth });
    expect(at.cell).toBeGreaterThanOrEqual(CELL_MIN);
    expect(at.plot.x + at.cell * hours.length).toBeLessThanOrEqual(l.minWidth);
  });

  it('hit-tests a point to its cell and misses outside the grid', () => {
    const l = computeHeatmapLayout({ rows, columns: hours, width: 390 });
    const cx = l.plot.x + l.cell * 5.5;
    const cy = l.plot.y + l.cell * 2.5;
    expect(l.cellAt(cx, cy)).toEqual({ row: 2, col: 5 });
    expect(l.cellAt(l.plot.x - 1, cy)).toBeNull();
    expect(l.cellAt(cx, l.plot.y + l.cell * rows.length + 1)).toBeNull();
  });
});
