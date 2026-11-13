import { describe, expect, it } from 'vitest';
import { DOT_RADIUS, estimateTextWidth, MARKER_RADIUS } from '../Chart/chartModel';
import {
  computeScatterLayout,
  connectSegments,
  inspectionOrder,
  linearFit,
  markerPath,
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
  it('widens a single point (or a single x) to a readable window with distinct tick labels', () => {
    const t0 = Date.UTC(2026, 0, 1, 12);
    const l = computeScatterLayout({
      ...base,
      xScale: 'time',
      formatX: (ms) => new Date(ms).toISOString().slice(11, 16),
      series: resolve([{ x: new Date(t0), y: 3 }]),
    });
    const labels = l.xTicks.map((t) => t.label);
    expect(labels.length).toBeGreaterThan(1);
    expect(new Set(labels).size).toBe(labels.length);
    // Ticks a readable step apart, not milliseconds around the point.
    expect(l.xTicks[1].value - l.xTicks[0].value).toBeGreaterThanOrEqual(60_000);
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
    expect(r(2)).toBeCloseTo(12);
    expect(r(1)).toBeCloseTo(12 * Math.sqrt(0.25)); // area ∝ value: a quarter of the area
    expect(r(0)).toBeCloseTo(3); // 1.2px by area, floored at the min radius
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

describe('stems', () => {
  /** [x, baseline, y] per `M x,b V y` segment of a stem path. */
  const segments = (path: string) =>
    [...path.matchAll(/M(-?[\d.]+),(-?[\d.]+)V(-?[\d.]+)/g)].map((m) => m.slice(1).map(Number));
  const pts = [
    { x: 1, y: 10 },
    { x: 2, y: 30 },
  ];

  /** Every dot's stem segment, in x order. */
  const stemsOf = (l: ReturnType<typeof computeScatterLayout>) =>
    [...l.dots].sort((a, b) => a.cx - b.cx).flatMap((d) => segments(d.stem ?? ''));

  it('draws none unless asked', () => {
    const l = computeScatterLayout({ ...base, series: resolve(pts) });
    expect(l.dots.every((d) => d.stem === undefined)).toBe(true);
  });

  it('runs one segment per point from y = 0 up to the dot', () => {
    const l = computeScatterLayout({ ...base, series: resolve(pts), stems: true });
    const zero = l.yTicks.find((t) => t.value === 0)!.pos;
    const dots = [...l.dots].sort((a, b) => a.cx - b.cx);
    const segs = stemsOf(l);
    expect(segs).toHaveLength(2);
    segs.forEach(([x, b, y], i) => {
      expect(x).toBeCloseTo(dots[i].cx);
      expect(b).toBeCloseTo(zero);
      expect(y).toBeCloseTo(dots[i].cy);
    });
  });

  it('starts at the nearest plot edge when 0 is outside the y range', () => {
    const above = computeScatterLayout({
      ...base,
      series: resolve(pts),
      yDomain: [5, 40],
      stems: true,
    });
    for (const [, b] of stemsOf(above)) expect(b).toBeCloseTo(above.plot.y + above.plot.height);
    const below = computeScatterLayout({
      ...base,
      series: resolve([{ x: 1, y: -20 }]),
      yDomain: [-40, -5],
      stems: true,
    });
    const belowSegs = stemsOf(below);
    expect(belowSegs).toHaveLength(1);
    for (const [, b] of belowSegs) expect(b).toBeCloseTo(below.plot.y);
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
    expect(computeScatterLayout({ ...base, series }).references).toEqual([]);
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
    expect(l.references[0].path).toMatch(/^M[^L]+L[^L]+$/);
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
  it('scales from 0, so near-equal sizes look near-equal (DS-41)', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1, size: 20 },
        { x: 2, y: 2, size: 22 },
      ]),
    });
    const [big, small] = l.dots.map((d) => d.r);
    expect((small / big) ** 2).toBeCloseTo(20 / 22);
  });
  it('floors zero, negative and all-zero sizes at the min radius', () => {
    const l = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1, size: 0 },
        { x: 2, y: 2, size: -5 },
        { x: 3, y: 3, size: 100 },
      ]),
    });
    expect(l.dots.map((d) => d.r)).toEqual([12, 3, 3]);
    const zeros = computeScatterLayout({ ...base, series: resolve([{ x: 1, y: 1, size: 0 }]) });
    expect(zeros.dots[0].r).toBe(3);
  });
  it('gives equal or single sizes the max radius', () => {
    const eq = computeScatterLayout({
      ...base,
      series: resolve([
        { x: 1, y: 1, size: 5 },
        { x: 2, y: 2, size: 5 },
      ]),
    });
    expect(eq.dots.map((d) => d.r)).toEqual([12, 12]);
    const one = computeScatterLayout({ ...base, series: resolve([{ x: 1, y: 1, size: 5 }]) });
    expect(one.dots[0].r).toBe(12);
  });
  it('takes the size domain from sizeDomain so hiding a series keeps radii', () => {
    const a = resolve([{ x: 1, y: 1, size: 100 }], 'a');
    const b = resolve([{ x: 2, y: 2, size: 25 }], 'b');
    expect(scatterSizeDomain([...a, ...b])).toEqual([0, 100]);
    const l = computeScatterLayout({
      ...base,
      series: b,
      sizeDomain: scatterSizeDomain([...a, ...b]),
    });
    expect(l.dots[0].r).toBeCloseTo(6); // a quarter of the max area, not the max radius
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
    expect(l.references[0].path.match(/[ML]/g)).toHaveLength(2);
  });
});

describe('several references', () => {
  const pts = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ];
  const run = (reference: Parameters<typeof computeScatterLayout>[0]['reference']) =>
    computeScatterLayout({ ...base, series: resolve([{ x: 1, y: 1 }]), reference });
  it('gives each line its own dash, the first being 0', () => {
    const l = run([
      { label: 'a', points: pts },
      { label: 'b', points: pts },
    ]);
    expect(l.references).toHaveLength(2);
    expect(l.references[0].dash).toBe(0);
    expect(l.references[1].dash).not.toBe(0);
  });
  it('slot is the pinned colour, else 0', () => {
    const l = run([
      { label: 'a', points: pts, color: 3 },
      { label: 'b', points: pts },
    ]);
    expect(l.references.map((r) => r.slot)).toEqual([3, 0]);
  });
  it('omits a line without points', () => {
    const l = run([
      { label: 'a', points: [] },
      { key: 'b', label: 'b', points: pts },
    ]);
    expect(l.references).toHaveLength(1);
    expect(l.references[0].key).toBe('b');
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

describe('sized markers on narrow plots (DS-68)', () => {
  const meals = resolve([
    { x: 0, y: 10, size: 10 },
    { x: 5, y: 60, size: 50 },
    { x: 10, y: 100, size: 40 },
  ]);
  const largest = (l: { dots: { r: number }[] }) => Math.max(...l.dots.map((d) => d.r));
  it('caps the max radius at 1/25 of the chart width, never below the min', () => {
    const phone = {
      ...base,
      width: 250,
      height: 260,
      series: meals,
      sizeRange: [4, 16] as [number, number],
    };
    expect(largest(computeScatterLayout(phone))).toBeCloseTo(10);
    expect(largest(computeScatterLayout({ ...phone, width: 60 }))).toBe(4);
    // Height doesn't cap: a short, wide card keeps the token's max.
    expect(largest(computeScatterLayout({ ...phone, width: 800, height: 120 }))).toBe(16);
  });
  it('a legend toggle that changes the y-tick width does not resize the remaining dots', () => {
    const a = resolve([{ x: 0, y: 100000, size: 50 }], 'a');
    const b = resolve([{ x: 1, y: 5, size: 50 }], 'b');
    const common = { ...base, width: 200, height: 500, sizeRange: [4, 16] as [number, number] };
    const sizeDomain = scatterSizeDomain([...a, ...b]);
    const both = computeScatterLayout({ ...common, series: [...a, ...b], sizeDomain });
    const onlyB = computeScatterLayout({ ...common, series: b, sizeDomain });
    expect(onlyB.plot.width).not.toBe(both.plot.width); // the y labels did change
    expect(onlyB.dots[0].r).toBe(both.dots.find((d) => d.seriesKey === 'b')!.r);
  });
  it('keeps the largest dot’s hover ring (r + 1, plus the half-stroke outside it) inside the plot', () => {
    for (const series of [
      meals,
      resolve([
        { x: 0, y: 0 },
        { x: 10, y: 100 },
      ]),
    ]) {
      const l = computeScatterLayout({ ...base, xDomain: [0, 10], yDomain: [0, 100], series });
      for (const d of l.dots) {
        const ring = Math.max(d.r, MARKER_RADIUS) + 2;
        expect(d.cy - ring).toBeGreaterThanOrEqual(l.plot.y);
        expect(d.cy + ring).toBeLessThanOrEqual(l.plot.y + l.plot.height);
        expect(d.cx - ring).toBeGreaterThanOrEqual(l.plot.x);
        expect(d.cx + ring).toBeLessThanOrEqual(l.plot.x + l.plot.width);
      }
    }
  });
});

describe('markerPath', () => {
  const bbox = (d: string) => {
    // Absolute coords only for triangle/square? Parse by drawing: use numbers pairs via simple interpreter.
    const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    return nums;
  };
  it('returns distinct closed paths per shape', () => {
    const d = (['circle', 'square', 'triangle'] as const).map((s) => markerPath(s, 10, 20, 5));
    expect(new Set(d).size).toBe(3);
    expect(d[1].endsWith('Z')).toBe(true);
    expect(d[2].endsWith('Z')).toBe(true);
  });
  it('centres the square and triangle on (cx, cy)', () => {
    const sq = bbox(markerPath('square', 10, 20, 5));
    expect(sq.slice(0, 2)).toEqual([5, 15]); // top-left corner
    const tri = bbox(markerPath('triangle', 10, 20, 5));
    expect(tri).toEqual([10, 15, 15, 25, 5, 25]); // apex, then base corners around cx
  });
});

describe('emphasis strong', () => {
  const strong = resolveScatterSeries([
    {
      key: 'a',
      label: 'a',
      emphasis: 'strong',
      shape: 'square',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 2, size: 5 },
      ],
    },
  ]);
  it('resolves shape and strong onto the series and dots', () => {
    expect(strong[0].shape).toBe('square');
    const layout = computeScatterLayout({ ...base, series: strong, strongRadius: 8 });
    expect(layout.dots.every((d) => d.strong && d.shape === 'square')).toBe(true);
  });
  it('gives unsized strong dots the strong radius and keeps sized dots on the size scale', () => {
    const layout = computeScatterLayout({ ...base, series: strong, strongRadius: 8 });
    expect(layout.dots.find((d) => d.index === 0)!.r).toBe(8);
    expect(layout.dots.find((d) => d.index === 1)!.r).toBe(12);
  });
  it('leaves default dots alone', () => {
    const [s] = resolve([{ x: 1, y: 1 }]);
    const layout = computeScatterLayout({ ...base, series: [s], strongRadius: 8 });
    expect(layout.dots[0]).toMatchObject({ r: DOT_RADIUS, strong: false });
  });
});

describe('connectSegments', () => {
  const pts = (xs: number[]) => xs.map((x) => ({ x, y: x * 10 }));
  it('sorts unsorted input by x', () => {
    expect(connectSegments(pts([3, 1, 2]))[0].map((p) => p.x)).toEqual([1, 2, 3]);
  });
  it('splits where the gap exceeds maxGap', () => {
    expect(connectSegments(pts([0, 1, 3, 4]), 1).map((s) => s.map((p) => p.x))).toEqual([
      [0, 1],
      [3, 4],
    ]);
  });
  it('drops single-point segments', () => {
    expect(connectSegments(pts([0, 5, 6]), 1).map((s) => s.map((p) => p.x))).toEqual([[5, 6]]);
    expect(connectSegments(pts([1]))).toEqual([]);
  });
  it('uses ms gaps on a time series', () => {
    const [s] = resolve(
      [new Date(0), new Date(1000), new Date(10_000), new Date(11_000)].map((x) => ({ x, y: 1 })),
    );
    expect(connectSegments(s.points, 2000)).toHaveLength(2);
  });
});

describe('connect layout', () => {
  const mk = (connect: boolean | { maxGap: number }) =>
    resolveScatterSeries([
      { key: 'a', label: 'a', connect, points: [0, 1, 3, 4].map((x) => ({ x, y: x })) },
    ]);
  it('has one path per segment', () => {
    expect(computeScatterLayout({ ...base, series: mk(true) }).connects).toHaveLength(1);
    const split = computeScatterLayout({ ...base, series: mk({ maxGap: 1 }) }).connects;
    expect(split).toHaveLength(2);
    expect(split[0].path).toMatch(/^M[\d.]+,[\d.]+L/);
  });
  it('is empty without connect', () => {
    expect(
      computeScatterLayout({
        ...base,
        series: resolve([
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ]),
      }).connects,
    ).toEqual([]);
  });
});
