import { describe, expect, it } from 'vitest';
import { DOT_RADIUS, estimateTextWidth } from '../Chart/chartModel';
import {
  computeScatterLayout,
  inspectionOrder,
  linearFit,
  nearestDot,
  resolveScatterSeries,
  scatterSizeDomain,
  type ResolvedScatterSeries,
} from './scatterModel';

const fmt = (n: number) => String(n);
const base = {
  xScale: 'number' as const,
  width: 400,
  height: 240,
  formatX: fmt,
  formatY: fmt,
  sizeRange: [3, 12] as [number, number],
};
const resolve = (pts: { x: number | Date; y: number; size?: number }[], key = 'a') =>
  resolveScatterSeries([{ key, label: key, points: pts }]);

describe('linearFit', () => {
  it('fits a line', () => {
    expect(
      linearFit([
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ]),
    ).toEqual({ slope: 2, intercept: 1 });
  });
  it('is null without two distinct x', () => {
    expect(
      linearFit([
        { x: 1, y: 1 },
        { x: 1, y: 3 },
      ]),
    ).toBeNull();
    expect(linearFit([{ x: 1, y: 1 }])).toBeNull();
  });
});

describe('resolveScatterSeries', () => {
  it('drops non-finite points and normalizes Date x to epoch ms', () => {
    const [s] = resolve([
      { x: new Date(1000), y: 1 },
      { x: NaN, y: 1 },
      { x: 2, y: Infinity },
      { x: 3, y: 2 },
    ]);
    expect(s.points.map((p) => p.x)).toEqual([1000, 3]);
    expect(s.slot).toBe(1);
  });
});

describe('computeScatterLayout domains', () => {
  it('starts y at 0 and nice-rounds when all y >= 0', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 3 },
        { x: 2, y: 47 },
      ]),
    });
    expect(l.yTicks[0].value).toBe(0);
    expect(l.yTicks[l.yTicks.length - 1].value).toBeGreaterThanOrEqual(47);
  });
  it('includes negative min', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: -13 },
        { x: 2, y: 5 },
      ]),
    });
    expect(l.yTicks[0].value).toBeLessThanOrEqual(-13);
  });
  it('honors explicit yDomain', () => {
    const l = computeScatterLayout({
      ...base,
      yDomain: [10, 20],
      series: resolve([
        { x: 1, y: 12 },
        { x: 2, y: 18 },
      ]),
    });
    expect(l.yTicks[0].value).toBe(10);
    expect(l.yTicks[l.yTicks.length - 1].value).toBe(20);
  });
});

describe('time axis', () => {
  it('formats via formatX(epochMs) with non-overlapping labels at 390px', () => {
    const day = 86_400_000;
    const t0 = Date.UTC(2026, 0, 1);
    const l = computeScatterLayout({
      ...base,
      width: 390,
      xScale: 'time',
      formatX: (ms) => `D${(ms - t0) / day}`,
      series: resolve(Array.from({ length: 30 }, (_, i) => ({ x: new Date(t0 + i * day), y: i }))),
    });
    expect(l.xTicks.length).toBeGreaterThan(1);
    expect(l.xTicks[0].label).toMatch(/^D-?\d+(\.\d+)?$/);
    for (let i = 1; i < l.xTicks.length; i++) {
      const a = l.xTicks[i - 1];
      const b = l.xTicks[i];
      expect(b.pos - estimateTextWidth(b.label) / 2).toBeGreaterThanOrEqual(
        a.pos + estimateTextWidth(a.label) / 2,
      );
    }
  });
});

describe('size and paint order', () => {
  it('maps sizes through a sqrt scale; default radius without size', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1, size: 1 },
        { x: 2, y: 2, size: 25 },
        { x: 3, y: 3, size: 100 },
      ]),
    });
    const r = (i: number) => l.dots.find((d) => d.index === i)!.r;
    expect(r(0)).toBeCloseTo(3);
    expect(r(2)).toBeCloseTo(12);
    expect(r(1)).toBeCloseTo(3 + ((Math.sqrt(25) - 1) / 9) * 9);
    const plain = computeScatterLayout({ ...base, series: resolve([{ x: 1, y: 1 }]) });
    expect(plain.dots[0].r).toBe(DOT_RADIUS);
  });
  it('paints larger dots first', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1, size: 1 },
        { x: 2, y: 2, size: 100 },
      ]),
    });
    expect(l.dots.map((d) => d.r)).toEqual([12, 3]);
  });
});

describe('trend and reference', () => {
  it('skips 1-point series and spans the series own x extent', () => {
    const series = [
      ...resolve([{ x: 5, y: 5 }], 'one'),
      ...resolveScatterSeries([
        {
          key: 'two',
          label: 'two',
          points: [
            { x: 2, y: 1 },
            { x: 4, y: 3 },
            { x: 3, y: 2 },
          ],
        },
      ]),
    ];
    const l = computeScatterLayout({ ...base, xDomain: [0, 10], series, trendLine: true });
    expect(l.trends.map((t) => t.seriesKey)).toEqual(['two']);
    const xs = l.trends[0].path.match(/-?\d+(\.\d+)?(?=,)/g)!.map(Number);
    const d = l.dots.filter((x) => x.seriesKey === 'two').map((x) => x.cx);
    expect(xs[0]).toBeCloseTo(Math.min(...d));
    expect(xs[1]).toBeCloseTo(Math.max(...d));
  });
  it('builds a reference path only when given', () => {
    const series = resolve([{ x: 1, y: 1 }]);
    expect(computeScatterLayout({ ...base, series }).referencePath).toBeUndefined();
    const l = computeScatterLayout({
      ...base,
      series,
      reference: {
        label: 'r',
        points: [
          { x: 2, y: 2 },
          { x: 1, y: 1 },
        ],
      },
    });
    expect(l.referencePath).toMatch(/^M[^L]+L[^L]+$/);
  });
});

describe('inspectionOrder and nearestDot', () => {
  it('sorts by x, ties by series order then index', () => {
    const s: ResolvedScatterSeries[] = [
      ...resolve(
        [
          { x: 2, y: 1 },
          { x: 1, y: 1 },
        ],
        'a',
      ),
      ...resolve([{ x: 1, y: 5 }], 'b'),
    ];
    expect(inspectionOrder(s)).toEqual([
      { seriesKey: 'a', index: 1 },
      { seriesKey: 'b', index: 0 },
      { seriesKey: 'a', index: 0 },
    ]);
  });
  it('finds the nearest dot within range', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1 },
        { x: 9, y: 9 },
      ]),
    });
    const d = l.dots[0];
    expect(nearestDot(l, d.cx + 2, d.cy, 10)).toBe(d);
    expect(nearestDot(l, d.cx + 50, d.cy + 50, 10)).toBeNull();
  });
});

describe('fix round 1', () => {
  const sized = resolve([
    { x: 0, y: 0, size: 1 },
    { x: 10, y: 50, size: 100 },
  ]);
  it('keeps edge dots inside the svg', () => {
    const l = computeScatterLayout({ ...base, xDomain: [0, 10], yDomain: [0, 50], series: sized });
    const big = l.dots.find((d) => d.r === 12)!;
    expect(big.cx + big.r).toBeLessThanOrEqual(base.width);
    expect(big.cy - big.r).toBeGreaterThanOrEqual(0);
    const small = l.dots.find((d) => d.r === 3)!;
    expect(small.cx - small.r).toBeGreaterThanOrEqual(l.plot.x);
  });
  it('uses the midpoint radius for equal or single sizes', () => {
    const eq = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1, size: 5 },
        { x: 2, y: 2, size: 5 },
      ]),
    });
    expect(eq.dots.map((d) => d.r)).toEqual([7.5, 7.5]);
    const one = computeScatterLayout({ ...base, series: resolve([{ x: 1, y: 1, size: 5 }]) });
    expect(one.dots[0].r).toBe(7.5);
  });
  it('takes the size domain from sizeDomain so hiding a series keeps radii', () => {
    const a = resolve([{ x: 1, y: 1, size: 1 }], 'a');
    const b = resolve([{ x: 2, y: 2, size: 100 }], 'b');
    expect(scatterSizeDomain([...a, ...b])).toEqual([1, 100]);
    const l = computeScatterLayout({
      ...base,
      series: b,
      sizeDomain: scatterSizeDomain([...a, ...b]),
    });
    expect(l.dots[0].r).toBeCloseTo(12);
  });
  it('drops non-finite reference points', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([{ x: 1, y: 1 }]),
      reference: {
        label: 'r',
        points: [
          { x: 1, y: 1 },
          { x: NaN, y: 2 },
          { x: 3, y: Infinity },
          { x: 2, y: 2 },
        ],
      },
    });
    expect(l.referencePath!.match(/[ML]/g)).toHaveLength(2);
  });
});

describe('axis titles', () => {
  const layout = computeScatterLayout({
    ...base,
    series: resolve([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]),
  });

  it('reserves a row above the plot for the y title, at the y-axis start', () => {
    expect(layout.yTitle.x).toBe(0);
    // Baseline above the plot top, below the svg top.
    expect(layout.yTitle.y).toBeGreaterThan(0);
    expect(layout.yTitle.y).toBeLessThan(layout.plot.y);
  });

  it('reserves a row below the x tick labels for the x title, at the plot end', () => {
    const plotBottom = layout.plot.y + layout.plot.height;
    expect(layout.xTickBaseline).toBeGreaterThan(plotBottom);
    expect(layout.xTitle.y).toBeGreaterThan(layout.xTickBaseline);
    expect(layout.xTitle.y).toBeLessThanOrEqual(base.height);
    expect(layout.xTitle.x).toBe(layout.plot.x + layout.plot.width);
  });
});
