import {
  assignSlots,
  barPath,
  categoryIndexAt,
  computeLayout,
  estimateTextWidth,
  LABEL_GAP,
  fitLegend,
  isEmpty,
  layoutMarkers,
  smoothStack,
  markerGutterRows,
  markerLabelsAt,
  markerPath,
  markerShape,
  resolveMarkers,
  resolveSeries,
  thinLabels,
  visibleSeries,
  type ChartSeries,
  type ChartSeriesColor,
  type LayoutInput,
} from './chartModel';

const fmt = (n: number) => String(n);
const s = (key: string, values: (number | null)[], comparisonOf?: string): ChartSeries => ({
  key,
  label: key.toUpperCase(),
  values,
  comparisonOf,
});
const layout = (over: Partial<LayoutInput> & Pick<LayoutInput, 'type' | 'series'>) =>
  computeLayout({
    categories: ['a', 'b', 'c', 'd'],
    width: 400,
    height: 200,
    formatValue: fmt,
    ...over,
  });

describe('assignSlots', () => {
  const slots = (c: (ChartSeriesColor | undefined)[]) => assignSlots(c).map((x) => x.slot);
  it('lets unset entries skip explicitly claimed slots', () => {
    expect(slots([undefined, 1])).toEqual([2, 1]);
  });
  it('allows explicit sharing', () => {
    expect(assignSlots([3, 3])).toEqual([
      { slot: 3, overflow: false },
      { slot: 3, overflow: false },
    ]);
  });
  it('wraps unset entries past eight and flags overflow', () => {
    const r = assignSlots(Array(9).fill(undefined));
    expect(r.slice(0, 8).map((x) => x.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.slice(0, 8).every((x) => !x.overflow)).toBe(true);
    expect(r[8]).toEqual({ slot: 1, overflow: true });
  });
  it('wraps an unset entry when every slot is claimed', () => {
    expect(assignSlots([1, 2, 3, 4, 5, 6, 7, 8, undefined])[8]).toEqual({
      slot: 1,
      overflow: true,
    });
  });
});

describe('resolveSeries', () => {
  it('honours color on primaries and ignores it on comparisons', () => {
    const r = resolveSeries(
      'line',
      [{ ...s('a', [1]) }, { ...s('b', [1]), color: 1 }, { ...s('b-prev', [1], 'b'), color: 5 }],
      1,
    );
    expect(r.series.map((x) => [x.key, x.slot])).toEqual([
      ['a', 2],
      ['b', 1],
      ['b-prev', 1],
    ]);
  });

  it('orders comparisons after their parent and inherits the slot', () => {
    const r = resolveSeries('line', [s('a', [1]), s('b', [2]), s('a-prev', [1], 'a')], 1);
    expect(r.series.map((x) => x.key)).toEqual(['a', 'a-prev', 'b']);
    expect(r.series.map((x) => x.slot)).toEqual([1, 1, 2]);
    expect(r.dropped).toEqual([]);
  });

  it('puts total comparisons last with the neutral slot, stacked types only', () => {
    const r = resolveSeries('stacked-bar', [s('t', [3], 'total'), s('a', [1]), s('b', [2])], 1);
    expect(r.series.map((x) => [x.key, x.slot])).toEqual([
      ['a', 1],
      ['b', 2],
      ['t', 0],
    ]);
  });

  it('drops mismatched comparisons', () => {
    expect(resolveSeries('stacked-bar', [s('a', [1]), s('p', [1], 'a')], 1).dropped).toEqual(['p']);
    expect(resolveSeries('line', [s('a', [1]), s('t', [1], 'total')], 1).dropped).toEqual(['t']);
    expect(resolveSeries('bar', [s('a', [1]), s('x', [1], 'nope')], 1).dropped).toEqual(['x']);
  });

  it('reuses the palette past eight series and flags overflow', () => {
    const many = Array.from({ length: 10 }, (_, i) => s(`k${i}`, [i]));
    const r = resolveSeries('line', many, 1);
    expect(r.series[8]).toMatchObject({ slot: 1, overflow: true });
    expect(r.series[7]).toMatchObject({ slot: 8, overflow: false });
    expect(r.overflowCount).toBe(2);
  });

  it('treats missing values as gaps and ignores extras', () => {
    const r = resolveSeries('line', [s('a', [1]), s('b', [1, 2, 3, 4])], 3);
    expect(r.series[0].values).toEqual([1, null, null]);
    expect(r.series[1].values).toEqual([1, 2, 3]);
  });
});

describe('visibleSeries', () => {
  const r = resolveSeries('line', [s('a', [1]), s('a-prev', [1], 'a'), s('b', [1])], 1).series;

  it('hides a parent together with its comparison', () => {
    expect(visibleSeries(r, ['a']).map((x) => x.key)).toEqual(['b']);
  });

  it('ignores hidden keys that no longer exist', () => {
    expect(visibleSeries(r, ['gone']).map((x) => x.key)).toEqual(['a', 'a-prev', 'b']);
  });
});

describe('isEmpty', () => {
  const res = (series: ChartSeries[]) => resolveSeries('line', series, 2).series;
  it('is empty with no categories, no series, or all null/zero', () => {
    expect(isEmpty([], res([s('a', [1, 2])]))).toBe(true);
    expect(isEmpty(['x', 'y'], [])).toBe(true);
    expect(isEmpty(['x', 'y'], res([s('a', [0, null])]))).toBe(true);
  });
  it('is not empty when any series (comparisons included) has a non-zero value', () => {
    expect(isEmpty(['x', 'y'], res([s('a', [0, 0]), s('p', [0, 4], 'a')]))).toBe(false);
  });
});

describe('thinLabels', () => {
  it('keeps every label when there is room', () => {
    expect(thinLabels(['a', 'b', 'c'], 100)).toEqual([0, 1, 2]);
  });
  it('keeps first and last and never overlaps (90 daily points, narrow plot)', () => {
    const cats = Array.from({ length: 90 }, (_, i) => `${i + 1} Jan`);
    const step = 300 / 90;
    const kept = thinLabels(cats, step);
    expect(kept[0]).toBe(0);
    expect(kept[kept.length - 1]).toBe(89);
    const labelWidth = 6 * 7 + 8;
    for (let i = 1; i < kept.length; i++) {
      expect((kept[i] - kept[i - 1]) * step).toBeGreaterThanOrEqual(labelWidth);
    }
  });
  it('keeps only the first label when even two do not fit', () => {
    expect(thinLabels(['long label', 'other label'], 10)).toEqual([0]);
  });
});

describe('fitLegend', () => {
  it('fits all items when wide enough', () => {
    expect(fitLegend(['A', 'B'], 1000)).toBe(2);
  });
  it('keeps at least one item and reserves room for the +N counter', () => {
    expect(fitLegend(['Alpha', 'Beta', 'Gamma'], 10)).toBe(1);
    const n = fitLegend(['Alpha', 'Beta', 'Gamma', 'Delta'], 160);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThan(4);
  });
});

describe('barPath / markers', () => {
  it('rounds only the data end, clamped to the bar size', () => {
    expect(barPath({ x: 0, y: 0, width: 10, height: 20 }, null)).toBe('M0,0h10v20h-10Z');
    expect(barPath({ x: 0, y: 0, width: 10, height: 20 }, 'top')).toContain('Q0,0 4,0');
    expect(barPath({ x: 0, y: 0, width: 4, height: 20 }, 'top')).toContain('Q0,0 2,0');
  });
  it('cycles four marker shapes across the palette', () => {
    expect([1, 2, 3, 4, 5].map(markerShape)).toEqual([
      'circle',
      'square',
      'triangle',
      'diamond',
      'circle',
    ]);
    for (const shape of ['circle', 'square', 'triangle', 'diamond'] as const) {
      expect(markerPath(shape, 10, 10, 4)).toMatch(/^M/);
    }
  });
});

describe('grouped bars', () => {
  const extent = (d: string): [number, number] => {
    const left = Number(/^M([^,]+),/.exec(d)![1]);
    const w = /h([^v]+)v/.exec(d);
    if (w) return [left, left + Number(w[1])];
    return [left, Number([...d.matchAll(/Q([^,]+),/g)][1][1])];
  };
  it.each([
    [90, 2],
    [90, 8],
    [30, 8],
  ])('keeps %i categories x %i series inside their slot at 340px', (cats, groups) => {
    const categories = Array.from({ length: cats }, (_, i) => `c${i}`);
    const series = Array.from({ length: groups }, (_, j) =>
      s(
        `s${j}`,
        categories.map((_, i) => i + j + 1),
      ),
    );
    const l = layout({
      type: 'bar',
      categories,
      series: resolveSeries('bar', series, cats).series,
      width: 340,
    });
    const eps = 1e-6;
    for (const m of l.marks) {
      m.bars!.forEach((d, i) => {
        const [a, b] = extent(d!);
        expect(a).toBeGreaterThanOrEqual(l.categoryX[i] - l.bandWidth / 2 - eps);
        expect(b).toBeLessThanOrEqual(l.categoryX[i] + l.bandWidth / 2 + eps);
      });
    }
  });
});

describe('computeLayout', () => {
  const one = (values: (number | null)[]) =>
    resolveSeries('line', [s('a', values)], values.length).series;

  it('includes zero in the domain and labels nice ticks with formatValue', () => {
    const l = layout({ type: 'line', series: one([50, 60, 70, 80]), formatValue: (n) => `€${n}` });
    expect(l.yTicks[0].value).toBe(0);
    expect(l.yTicks.every((t) => t.label.startsWith('€'))).toBe(true);
    expect(l.yTicks[l.yTicks.length - 1].value).toBeGreaterThanOrEqual(80);
  });

  it('sizes the y axis from the widest tick label', () => {
    const narrow = layout({ type: 'line', series: one([1, 2, 3, 4]) });
    const wide = layout({
      type: 'line',
      series: one([1, 2, 3, 4]),
      formatValue: (n) => `${n} 000 000 €`,
    });
    expect(wide.plot.x).toBeGreaterThan(narrow.plot.x);
  });

  it('breaks lines at null and dots isolated points', () => {
    const l = layout({ type: 'line', series: one([1, null, 3, null]) });
    const m = l.marks[0];
    expect(m.kind).toBe('line');
    expect(m.points[1]).toBeNull();
    // Both defined points are isolated: no path, a dot each.
    expect(m.line).toBe('');
    expect(m.dots).toHaveLength(2);
    expect(m.line).not.toContain('NaN');
  });

  // Largest vertical gap between two sampled paths over the same x samples.
  const gap = (a: string, b: string) => {
    const ya = ys(a);
    const yb = ys(b);
    expect(ya).toHaveLength(yb.length);
    return Math.max(...ya.map((y, i) => Math.abs(y - yb[i])));
  };
  // y of every vertex in an M/L path
  const ys = (d: string) =>
    (d.match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2);

  it('smooths lines (the stacked-bar total included) without overshooting the data', () => {
    const values = [0, 10, 10, 0];
    const l = layout({ type: 'line', series: one(values) });
    // Many short segments, not 3 straight ones; and no bulge above the two equal 10s.
    expect(ys(l.marks[0].line!).length).toBeGreaterThan(values.length * 2);
    expect(Math.min(...ys(l.marks[0].line!))).toBeCloseTo(l.marks[0].points[1]!.y, 6);
    // A step between flat runs neither dips before it nor bumps after it.
    const step = layout({
      type: 'line',
      categories: ['a', 'b', 'c', 'd', 'e', 'f'],
      series: one([1, 1, 1, 2, 2, 2]),
    });
    const lineYs = ys(step.marks[0].line!);
    expect(Math.max(...lineYs)).toBeCloseTo(step.marks[0].points[0]!.y, 6);
    expect(Math.min(...lineYs)).toBeCloseTo(step.marks[0].points[5]!.y, 6);
    const stacked = layout({
      type: 'stacked-bar',
      series: resolveSeries('stacked-bar', [s('a', values), s('p', values, 'total')], 4).series,
    });
    expect(ys(stacked.marks.find((m) => m.kind === 'line')!.line!).length).toBeGreaterThan(8);
  });

  it('keeps lines inside the plot', () => {
    for (const values of [
      [0, 10, 10, 0],
      [10, 0, 0, 10],
    ]) {
      const l = layout({ type: 'line', series: one(values) });
      for (const y of ys(l.marks[0].line!)) {
        expect(y).toBeGreaterThanOrEqual(l.plot.y - 1e-6);
        expect(y).toBeLessThanOrEqual(l.plot.y + l.plot.height + 1e-6);
      }
    }
  });

  it('never smooths below 0 between non-negative values: no negative axis on counts', () => {
    for (const type of ['line', 'area'] as const) {
      for (const values of [
        [5, 0, 0, 3],
        [10, 0, 0, 10],
      ]) {
        const l = layout({ type, series: one(values) });
        expect(l.yTicks[0].value).toBeGreaterThanOrEqual(0);
        const zeroY = l.yTicks.find((t) => t.value === 0)!.y;
        for (const y of ys(l.marks[0].line!)) expect(y).toBeLessThanOrEqual(zeroY + 1e-6);
      }
    }
    // the same clamp keeps a single-layer area and its equal total on one curve
    const values = [0, 0, 10, 10];
    const l = layout({
      type: 'area',
      series: resolveSeries('area', [s('a', values), s('t', values, 'total')], 4).series,
    });
    expect(l.marks[1].line).toBe(l.marks[0].line);
  });

  it('a total equal to a multi-layer stack stays close to its top where a layer is clamped', () => {
    const series = resolveSeries(
      'area',
      [s('a', [0, 5, 0, 0]), s('b', [10, 10, 10, 10]), s('t', [10, 15, 10, 10], 'total')],
      4,
    ).series;
    const l = layout({ type: 'area', series });
    // Smoothed separately: drifts next to spikes and zeros (fuzzed worst case ~10% of plot height).
    expect(gap(l.marks[2].line!, l.marks[1].line!)).toBeLessThan(0.1 * l.plot.height);
  });

  it('the stack top stays close to the smoothed total when an empty layer rides over a peak', () => {
    const series = resolveSeries(
      'area',
      [s('a', [0, 10, 10, 0]), s('b', [10, 0, 0, 10]), s('t', [10, 10, 10, 10], 'total')],
      4,
    ).series;
    const l = layout({ type: 'area', series });
    // Smoothed separately: drifts next to spikes and zeros (fuzzed worst case ~10% of plot height).
    expect(gap(l.marks[2].line!, l.marks[1].line!)).toBeLessThan(0.1 * l.plot.height);
    // and the lower layer never pokes above it
    const S = 12;
    const tops = smoothStack(
      [
        [0, 10, 10, 0],
        [10, 0, 0, 10],
      ],
      S,
    );
    for (let i = 0; i < 3; i++)
      for (let k = 0; k <= S; k++) expect(tops[0][i][k]).toBeLessThanOrEqual(tops[1][i][k]);
  });

  it('keeps a 0 to 0 segment flat, so all-negative data gets no positive tick', () => {
    for (const values of [
      [-5, 0, 0, -3],
      [-10, 0, 0, -10],
    ]) {
      const l = layout({ type: 'line', series: one(values) });
      expect(l.yTicks[l.yTicks.length - 1].value).toBeLessThanOrEqual(0);
    }
  });

  it('a total equal to the stack stays close to it when the top layer has interior zeros', () => {
    for (const [a, b] of [
      [
        [5, 5, 5, 5],
        [10, 0, 0, 10],
      ],
      [
        [20, 20, 20, 20],
        [0, 0, 30, 0],
      ],
    ]) {
      const total = a.map((v, i) => v + b[i]);
      const series = resolveSeries(
        'area',
        [s('a', a), s('b', b), s('t', total, 'total')],
        4,
      ).series;
      const l = layout({ type: 'area', series });
      // Smoothed separately: drifts next to spikes and zeros (fuzzed worst case ~10% of plot height).
      expect(gap(l.marks[2].line!, l.marks[1].line!)).toBeLessThan(0.1 * l.plot.height);
    }
  });

  it('a stacked layer that is 0 at both ends of a segment has no thickness there', () => {
    const S = 12;
    const layers = [
      [31, 80, 42, 31, 44, 0],
      [2, 0, 64, 13, 0, 94],
      [38, 0, 86, 0, 0, 0],
      [0, 0, 0, 0, 23, 0],
    ];
    const tops = smoothStack(layers, S);
    for (let k = 1; k < layers.length; k++)
      for (let i = 0; i < layers[k].length - 1; i++)
        if (layers[k][i] === 0 && layers[k][i + 1] === 0)
          for (let s = 0; s <= S; s++) expect(tops[k][i][s]).toBe(tops[k - 1][i][s]);
  });

  it('a steady top layer keeps its thickness over a spiky layer below', () => {
    const S = 12;
    const tops = smoothStack(
      [
        [5, 0, 10, 399, 0, 6, 8],
        [4, 4, 4, 4, 4, 4, 4],
      ],
      S,
    );
    for (let i = 0; i < 6; i++)
      for (let k = 0; k <= S; k++) expect(tops[1][i][k] - tops[0][i][k]).toBeCloseTo(4, 9);
  });

  it('a steady layer is not crushed by a huge one-off spike in the layer above', () => {
    const S = 12;
    const tops = smoothStack(
      [
        [10, 10, 10, 10, 10, 10, 10],
        [0, 0, 0, 500, 0, 0, 0],
      ],
      S,
    );
    for (const seg of tops[0]) for (const t of seg) expect(t).toBeGreaterThanOrEqual(9);
    for (let i = 0; i < 6; i++)
      for (let k = 0; k <= S; k++) expect(tops[1][i][k]).toBeGreaterThanOrEqual(tops[0][i][k]);
  });

  it('a steep first step keeps its slope at the run end', () => {
    // The run end keeps half its own slope; a flatter end tangent would bow this start.
    const l = layout({ type: 'line', series: one([5, 60, 70, 80]) });
    const pts = l.marks[0]
      .line!.slice(1)
      .split('L')
      .map((p) => p.split(',').map(Number));
    const [x0, y0] = pts[0];
    const [x1, y1] = [l.categoryX[1], l.marks[0].points[1]!.y];
    const dev = Math.max(
      ...pts
        .filter(([x]) => x <= x1)
        .map(([x, y]) => Math.abs(y - (y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)))),
    );
    expect(dev).toBeLessThan(0.05 * l.plot.height);
  });

  it('smooths stacked areas too, without bulging between equal values', () => {
    const l = layout({ type: 'area', series: one([0, 10, 10, 0]) });
    expect(ys(l.marks[0].line!).length).toBeGreaterThan(8);
    expect(Math.min(...ys(l.marks[0].line!))).toBeCloseTo(l.marks[0].points[1]!.y, 6);
  });

  it('a climb from 0 at the start of a run is not bowed', () => {
    const l = layout({ type: 'line', series: one([0, 10, 20, 30]) });
    const pts = l.marks[0]
      .line!.slice(1)
      .split('L')
      .map((p) => p.split(',').map(Number));
    const [x0, y0] = pts[0];
    const [x1, y1] = [l.categoryX[1], l.marks[0].points[1]!.y];
    for (const [x, y] of pts.filter(([x]) => x <= x1))
      // ~3px of ordinary end easing; a flat start tangent bows it ~7px.
      expect(Math.abs(y - (y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)))).toBeLessThan(5);
  });

  it('a sharp spike does not drag a flat neighbourhood far past its value', () => {
    const S = 12;
    // Uncapped Catmull-Rom dips the flat 10s to ~2.6 before the spike; the monotone curve doesn't dip.
    const l = layout({ type: 'line', series: one([10, 10, 110, 10]) });
    const y10 = l.marks[0].points[0]!.y;
    for (const y of ys(l.marks[0].line!)) expect(y).toBeLessThanOrEqual(y10 + 0.01); // path coords round to 0.01px
    // In a stack, the steady layer under a one-off spike keeps most of its thickness.
    const tops = smoothStack(
      [
        [10, 10, 10, 10],
        [0, 0, 100, 0],
      ],
      S,
    );
    for (const k of tops[0][0]) expect(k).toBeCloseTo(10, 6);
  });

  it('eases into a 0 floor without a corner', () => {
    // [5, 0, 0, 3]: the curve reaches 0 flat (no kink), so the sample just before 0 is near 0.
    const l = layout({ type: 'line', series: one([5, 0, 0, 3]) });
    const zeroY = l.yTicks.find((t) => t.value === 0)!.y;
    const pts = l.marks[0]
      .line!.slice(1)
      .split('L')
      .map((p) => p.split(',').map(Number));
    const atFirstZero = pts.findIndex(([x]) => Math.abs(x - l.categoryX[1]) < 0.01);
    const [x0, y0] = pts[atFirstZero - 1];
    const slopeIn = (zeroY - y0) / (l.categoryX[1] - x0);
    const firstStep = (zeroY - l.marks[0].points[0]!.y) / (l.categoryX[1] - l.categoryX[0]);
    // ~0.11x with the flat tangent; without it the capped tangent still gives ~0.3x.
    expect(Math.abs(slopeIn)).toBeLessThan(Math.abs(firstStep) / 4);
  });

  it('draws a two-point run straight', () => {
    const l = layout({ type: 'line', series: one([0, 10, null, null]) });
    const pts = l.marks[0]
      .line!.slice(1)
      .split('L')
      .map((p) => p.split(',').map(Number));
    const [[x0, y0], [x1, y1]] = [pts[0], pts[pts.length - 1]];
    for (const [x, y] of pts) expect(y).toBeCloseTo(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0), 1);
  });

  it('keeps areas inside the plot', () => {
    const l = layout({ type: 'area', series: one([0, 10, 10, 0]) });
    for (const y of ys(l.marks[0].line!)) expect(y).toBeGreaterThanOrEqual(l.plot.y - 1e-6);
    // Layers trading places lift the stacked top past the largest real total; the axis covers it.
    const traded = layout({
      type: 'area',
      categories: ['a', 'b', 'c', 'd', 'e'],
      series: resolveSeries(
        'area',
        [s('a', [0, 0, 3, 17, 0]), s('b', [7, 4, 0, 0, 0]), s('c', [0, 0, 17, 3, 0])],
        5,
      ).series,
    });
    for (const m of traded.marks)
      for (const y of ys(m.line!)) expect(y).toBeGreaterThanOrEqual(traded.plot.y - 1e-6);
  });

  it('breaks smoothed lines at gaps without NaN', () => {
    const l = layout({ type: 'line', series: one([1, 2, null, 3]) });
    expect(l.marks[0].line!.match(/M/g)).toHaveLength(1); // [3] is isolated: a dot, not a path
    expect(l.marks[0].line).not.toContain('NaN');
  });

  it('a total comparison equal to the stack follows the area top', () => {
    const values = [0, 10, 2, 8];
    const l = layout({
      type: 'area',
      series: resolveSeries('area', [s('a', values), s('t', values, 'total')], 4).series,
    });
    expect(l.marks[1].line).toBe(l.marks[0].line);
  });

  it('smoothed stacked layers hit the data exactly and never cross', () => {
    const S = 12;
    const tops = smoothStack(
      [
        [0, 5, 10, 10],
        [5, 0, 0, 5],
      ],
      S,
    );
    // s = 0 is the category itself: exact cumulative values.
    expect(tops[0].map((seg) => seg[0])).toEqual([0, 5, 10]);
    expect(tops[1].map((seg) => seg[0])).toEqual([5, 5, 10]);
    expect(tops[1][2][S]).toBe(15);
    // B is 0 at categories 1 and 2: its band may be empty, never inverted.
    for (let i = 0; i < 3; i++)
      for (let k = 0; k <= S; k++) expect(tops[1][i][k]).toBeGreaterThanOrEqual(tops[0][i][k]);
    const l = layout({ type: 'area', series: one([0, 10, 10, 0]) });
    expect(l.marks[0].area).toMatch(/Z$/);
    expect(l.marks[0].line).not.toContain('NaN');
  });

  it('drops null and zero bars, keeps the rest', () => {
    const l = layout({ type: 'bar', series: one([1, null, 0, 4]) });
    expect(l.marks[0].bars!.map((b) => b !== null)).toEqual([true, false, false, true]);
  });

  it('negative bars grow down from zero', () => {
    const l = layout({ type: 'bar', series: one([-2, 3, 1, 1]) });
    const zeroY = l.yTicks.find((t) => t.value === 0)!.y;
    // the negative bar's path starts at the zero line (rounded end at the bottom)
    expect(l.marks[0].bars![0]).toContain(`M${l.categoryX[0] - l.bandWidth / 2},${zeroY}`);
  });

  it('stacks primaries, excludes the total comparison from the stack', () => {
    const series = resolveSeries(
      'stacked-bar',
      [s('a', [1, 1, 1, 1]), s('b', [2, 2, 2, 2]), s('t', [9, 9, 9, 9], 'total')],
      4,
    ).series;
    const l = layout({ type: 'stacked-bar', series });
    expect(l.marks.map((m) => m.kind)).toEqual(['bars', 'bars', 'line']);
    expect(l.marks[2].comparison).toBe(true);
    // the domain covers the comparison (9) even though the stack only reaches 3
    expect(l.yTicks[l.yTicks.length - 1].value).toBeGreaterThanOrEqual(9);
  });

  it('diverging stack keeps negatives below zero', () => {
    const series = resolveSeries(
      'stacked-bar',
      [s('a', [2, 2, 2, 2]), s('b', [-1, -1, -1, -1])],
      4,
    ).series;
    const l = layout({ type: 'stacked-bar', series });
    expect(l.yTicks[0].value).toBeLessThan(0);
  });

  it('builds stacked areas with a top line', () => {
    const series = resolveSeries('area', [s('a', [1, 2, 3, 4]), s('b', [1, 1, 1, 1])], 4).series;
    const l = layout({ type: 'area', series });
    expect(l.marks.every((m) => m.kind === 'area' && m.area && m.line)).toBe(true);
    // b sits on top of a: its top point is higher (smaller y) than a's
    expect(l.marks[1].points[0]!.y).toBeLessThan(l.marks[0].points[0]!.y);
  });

  it('area points follow the drawn top line for negative values', () => {
    const series = resolveSeries(
      'area',
      [s('a', [2, 2, 2, 2]), s('b', [-1, -1, -1, -1])],
      4,
    ).series;
    const m = layout({ type: 'area', series }).marks[1];
    const topY = Number(m.line!.match(/^M[^,]+,([^A-Za-z]+)/)![1]);
    expect(m.points[0]!.y).toBeCloseTo(topY, 5);
  });

  it('handles a single category', () => {
    const l = computeLayout({
      type: 'line',
      categories: ['only'],
      series: one([5]),
      width: 200,
      height: 120,
      formatValue: fmt,
    });
    expect(l.categoryX).toHaveLength(1);
    expect(l.marks[0].dots).toHaveLength(1);
    expect(l.xLabels.map((x) => x.index)).toEqual([0]);
  });

  it('maps an x coordinate to the nearest category, clamped', () => {
    const l = layout({ type: 'line', series: one([1, 2, 3, 4]) });
    expect(categoryIndexAt(l, -50)).toBe(0);
    expect(categoryIndexAt(l, l.categoryX[2])).toBe(2);
    expect(categoryIndexAt(l, 10_000)).toBe(3);
  });

  it('clamps x labels inside the svg width', () => {
    const l = computeLayout({
      type: 'line',
      categories: ['a very long first label', 'b'],
      series: one([1, 2]),
      width: 220,
      height: 120,
      formatValue: fmt,
    });
    for (const x of l.xLabels) {
      const half = (x.label.length * 7) / 2;
      expect(x.x - half).toBeGreaterThanOrEqual(0);
      expect(x.x + half).toBeLessThanOrEqual(220);
    }
  });

  it('never overlaps x labels after clamping', () => {
    for (let n = 2; n <= 30; n++)
      for (const width of [120, 170, 240, 400])
        for (const len of [3, 8, 14]) {
          const categories = Array.from({ length: n }, (_, i) =>
            String(i).padEnd(len, 'x').slice(0, len),
          );
          const l = computeLayout({
            type: 'line',
            categories,
            series: resolveSeries(
              'line',
              [
                s(
                  'a',
                  categories.map((_, i) => i),
                ),
              ],
              n,
            ).series,
            width,
            height: 120,
            formatValue: fmt,
          });
          expect(l.xLabels[0].index).toBe(0);
          for (let k = 1; k < l.xLabels.length; k++) {
            const a = l.xLabels[k - 1];
            const b = l.xLabels[k];
            expect(b.x - (len * 7) / 2).toBeGreaterThanOrEqual(a.x + (len * 7) / 2 + 8);
          }
        }
  });

  it('keeps zeros in stacked areas on the series below', () => {
    const series = resolveSeries('area', [s('a', [1, 1, 1]), s('b', [1, 0, 1])], 3).series;
    const l = layout({ type: 'area', categories: ['a', 'b', 'c'], series });
    const zeroY = l.yTicks.find((t) => t.value === 0)!.y;
    expect(l.marks[1].points[1]!.y).toBeCloseTo(l.marks[0].points[1]!.y);
    expect(l.marks[1].line).not.toContain(`,${zeroY}`);
  });

  it('turns NaN into a gap', () => {
    const l = layout({ type: 'line', series: one([1, NaN, 3, 4]) });
    expect(l.marks[0].points[1]).toBeNull();
    expect(l.marks[0].line).not.toContain('NaN');
  });

  it('rescales y when the large series is hidden', () => {
    const all = resolveSeries(
      'line',
      [s('a', [1, 2, 3, 4]), s('big', [100, 200, 300, 400])],
      4,
    ).series;
    const full = layout({ type: 'line', series: all });
    const some = layout({ type: 'line', series: visibleSeries(all, ['big']) });
    expect(some.yTicks[some.yTicks.length - 1].value).toBeLessThan(
      full.yTicks[full.yTicks.length - 1].value,
    );
  });

  it('rounds only the outermost stacked segment and leaves a 2px joint', () => {
    const series = resolveSeries(
      'stacked-bar',
      [s('a', [2, 2, 2, 2]), s('b', [2, 2, 2, 2])],
      4,
    ).series;
    const l = layout({ type: 'stacked-bar', series });
    expect(l.marks[0].bars![0]).not.toContain('Q');
    expect(l.marks[1].bars![0]).toContain('Q');
    const aTop = Number(/^M[^,]+,([\d.]+)h/.exec(l.marks[0].bars![0]!)![1]);
    const bBottom = Number(/V([\d.]+)Z$/.exec(l.marks[1].bars![0]!)![1]);
    expect(aTop - bBottom).toBeCloseTo(2);
  });

  it('categoryIndexAt is 0 with no categories', () => {
    const l = layout({ type: 'line', categories: [], series: [] });
    expect(categoryIndexAt(l, 50)).toBe(0);
  });
});

describe('markers', () => {
  const cats = ['a', 'b', 'c', 'd'];

  it('resolves at/from/to to category indices, normalising order and dropping unknowns', () => {
    const r = resolveMarkers(
      [
        { key: 'l', label: 'L', at: 'b' },
        { key: 'r', from: 'd', to: 'c', tone: 'subtle' },
        { key: 'x', at: 'zz' },
        { key: 'e', label: '', at: 'a' },
      ],
      cats,
    );
    expect(r.markers).toEqual([
      {
        key: 'l',
        label: 'L',
        tone: 'neutral',
        kind: 'line',
        from: 1,
        to: 1,
        slot: 0,
        placement: 'beside',
      },
      {
        key: 'r',
        label: undefined,
        tone: 'subtle',
        kind: 'band',
        from: 2,
        to: 3,
        slot: 0,
        placement: 'beside',
      },
      {
        key: 'e',
        label: undefined,
        tone: 'neutral',
        kind: 'line',
        from: 0,
        to: 0,
        slot: 0,
        placement: 'beside',
      },
    ]);
    expect(r.dropped).toEqual(['x']);
    expect(markerLabelsAt(r.markers, 1)).toEqual(['L']);
    expect(markerLabelsAt(r.markers, 3)).toEqual([]);
  });

  it('places lines on the category centre and bands over whole buckets', () => {
    const l = layout({ type: 'line', series: [] });
    const { markers } = resolveMarkers(
      [
        { key: 'l', at: 'b' },
        { key: 'r', from: 'b', to: 'c' },
      ],
      cats,
    );
    const [line, band] = layoutMarkers(markers, l);
    expect(line.x).toBe(l.categoryX[1]);
    expect(line.width).toBe(0);
    expect(band.x).toBeCloseTo(l.categoryX[1] - l.step / 2);
    expect(band.width).toBeCloseTo(2 * l.step);
  });

  it('drops labels that collide; flips a line label near the right edge', () => {
    const l = layout({ type: 'line', series: [] });
    const { markers } = resolveMarkers(
      [
        { key: 'a', label: 'First event', at: 'b' },
        { key: 'b', label: 'Clashing', at: 'b' },
        { key: 'c', label: 'Late', at: 'd' },
      ],
      cats,
    );
    const g = layoutMarkers(markers, l);
    expect(g[0].label?.text).toBe('First event');
    expect(g[1].label).toBeUndefined();
    // 'd' sits half a step from the right edge (~42px at width 400) — "Late" (28px) fits right of it.
    expect(g[2].label?.anchor).toBe('start');
    const narrow = layoutMarkers(
      resolveMarkers([{ key: 'z', label: 'Quarter end', at: 'd' }], cats).markers,
      l,
    );
    expect(narrow[0].label?.anchor).toBe('end');
    expect(narrow[0].label!.x).toBeLessThan(l.categoryX[3]);
  });
});

describe('marker colour, icon and top labels (DS-47)', () => {
  const cats = ['a', 'b', 'c', 'd'];
  const l = layout({ type: 'line', series: [] });
  const iconHalf = (icon: string) => Math.max(18, (estimateTextWidth(icon) * 14) / 12) / 2;

  it('resolves colour to a slot, icon and placement (default beside)', () => {
    const { markers } = resolveMarkers(
      [
        { key: 'f', label: 'Fed', at: 'b', color: 2, icon: '🐱', labelPlacement: 'top' },
        { key: 'g', at: 'c' },
      ],
      cats,
    );
    expect(markers[0]).toMatchObject({ slot: 2, icon: '🐱', placement: 'top' });
    expect(markers[1]).toMatchObject({ slot: 0, placement: 'beside' });
    expect(markers[1].icon).toBeUndefined();
  });

  it('counts gutter rows: none 0, icon 1, top label 1, icon + top label 2', () => {
    const rows = (m: Parameters<typeof resolveMarkers>[0]) =>
      markerGutterRows(resolveMarkers(m, cats).markers);
    expect(rows([{ key: 'a', label: 'A', at: 'a' }])).toBe(0);
    expect(rows([{ key: 'a', label: 'A', at: 'a', icon: '🐱' }])).toBe(1);
    expect(rows([{ key: 'a', label: 'A', at: 'a', labelPlacement: 'top' }])).toBe(1);
    expect(
      rows([
        { key: 'a', at: 'a', icon: '🐱' },
        { key: 'b', label: 'B', at: 'c', icon: '🐱', labelPlacement: 'top' },
      ]),
    ).toBe(2);
  });

  it('reserves the top gutter above the plot; topGutter 0 equals omitted', () => {
    expect(layout({ type: 'line', series: [], topGutter: 0 }).plot).toEqual(l.plot);
    const g = layout({ type: 'line', series: [], topGutter: 24 });
    expect(g.plot.y).toBe(l.plot.y + 24);
    expect(g.plot.y + g.plot.height).toBe(l.plot.y + l.plot.height);
  });

  it('shifts top items inward at the plot edges', () => {
    const tight = layout({ type: 'line', series: [], categories: cats, width: 160 });
    const tr = tight.plot.x + tight.plot.width;
    const [first, last] = layoutMarkers(
      resolveMarkers(
        [
          { key: 'a', at: 'a', icon: '🐱', label: 'Breakfast', labelPlacement: 'top' },
          { key: 'd', at: 'd', icon: 'Done!' },
        ],
        cats,
      ).markers,
      tight,
    );
    expect(first.top!.x).toBeGreaterThanOrEqual(tight.plot.x + estimateTextWidth('Breakfast') / 2);
    expect(first.top!.x).toBeGreaterThan(tight.categoryX[0]);
    expect(last.top!.x).toBeLessThanOrEqual(tr - iconHalf('Done!'));
    expect(last.top!.x).toBeLessThan(tight.categoryX[3]);
  });

  it('drops a later top item that collides with an earlier one', () => {
    const many = layout({ type: 'line', series: [], categories: 'abcdefghijklmnopqrst'.split('') });
    const g = layoutMarkers(
      resolveMarkers(
        [
          { key: 'x', at: 'c', icon: '🐱' },
          { key: 'y', at: 'd', icon: '🐱' },
        ],
        'abcdefghijklmnopqrst'.split(''),
      ).markers,
      many,
    );
    expect(g[0].top?.icon).toBe('🐱');
    expect(g[1].top).toBeUndefined();
  });

  it('a top marker has no beside label; a beside marker with an icon keeps both', () => {
    const [top, beside] = layoutMarkers(
      resolveMarkers(
        [
          { key: 't', at: 'a', label: 'Fed', labelPlacement: 'top' },
          { key: 'b', at: 'c', label: 'Fed', icon: '🐱' },
        ],
        cats,
      ).markers,
      l,
    );
    expect(top.label).toBeUndefined();
    expect(top.top).toEqual({ x: l.categoryX[0], label: 'Fed' });
    expect(beside.top).toEqual({ x: l.categoryX[2], icon: '🐱' });
    expect(beside.label?.text).toBe('Fed');
  });

  it('centres a band icon on the band, and carries the slot', () => {
    const [band] = layoutMarkers(
      resolveMarkers([{ key: 'r', from: 'b', to: 'c', icon: '🐱', color: 3 }], cats).markers,
      l,
    );
    expect(band.top!.x).toBeCloseTo((l.categoryX[1] + l.categoryX[2]) / 2);
    expect(band.slot).toBe(3);
  });
});

describe('estimateTextWidth (DS-20)', () => {
  it('measures % wider than the digits it follows', () => {
    expect(estimateTextWidth('100%')).toBeGreaterThan(estimateTextWidth('40 g'));
  });
  it('widens m, w and East Asian characters', () => {
    expect(estimateTextWidth('m')).toBe(9);
    expect(estimateTextWidth('w')).toBe(9);
    expect(estimateTextWidth('漢')).toBe(12);
    // DS-41: wide capitals; "Wed" renders ~25px at 12px system-ui and clipped at 23.
    expect(estimateTextWidth('W')).toBe(12);
    expect(estimateTextWidth('M')).toBe(12);
    expect(estimateTextWidth('М')).toBe(12); // Cyrillic Em, as in "Май"
    expect(estimateTextWidth('Wed')).toBeGreaterThanOrEqual(25);
    expect(estimateTextWidth('か')).toBe(12);
    expect(estimateTextWidth('カ')).toBe(12);
    expect(estimateTextWidth('한')).toBe(12);
  });
  it('gives a % y gutter room for the full label', () => {
    const l = layout({
      type: 'line',
      series: resolveSeries('line', [s('a', [0, 50, 100, 80])], 4).series,
      formatValue: (n) => `${n}%`,
    });
    expect(l.plot.x).toBeGreaterThanOrEqual(estimateTextWidth('100%') + LABEL_GAP);
  });
});

describe('curve (DS-36)', () => {
  const run = (type: 'line' | 'area', values: (number | null)[][], curve?: 'linear') =>
    layout({
      type,
      curve,
      series: resolveSeries(
        type,
        values.map((v, i) => s(`k${i}`, v)),
        values[0].length,
      ).series,
    });

  it('smooth output is unchanged without curve', () => {
    expect(run('line', [[3, 9, 4, 8]]).marks[0].line).toMatchInlineSnapshot(
      `"M68.25,128.4L71.95,126.02L75.65,123.03L79.35,119.5L83.05,115.49L86.75,111.06L90.45,106.27L94.15,101.17L97.85,95.83L101.55,90.3L105.25,84.64L108.95,78.92L112.65,73.2L116.35,67.52L120.05,61.96L123.75,56.57L127.45,51.41L131.15,46.55L134.85,42.03L138.55,37.92L142.25,34.28L145.95,31.17L149.65,28.65L153.35,26.77L157.05,25.6L160.75,25.2L164.45,25.6L168.15,26.76L171.85,28.62L175.55,31.1L179.25,34.14L182.95,37.68L186.65,41.65L190.35,45.98L194.05,50.61L197.75,55.47L201.45,60.5L205.15,65.62L208.85,70.78L212.55,75.9L216.25,80.93L219.95,85.79L223.65,90.42L227.35,94.75L231.05,98.72L234.75,102.26L238.45,105.3L242.15,107.78L245.85,109.64L249.55,110.8L253.25,111.2L256.95,110.93L260.65,110.15L264.35,108.9L268.05,107.22L271.75,105.15L275.45,102.72L279.15,99.98L282.85,96.97L286.55,93.72L290.25,90.28L293.95,86.69L297.65,82.98L301.35,79.2L305.05,75.38L308.75,71.57L312.45,67.8L316.15,64.12L319.85,60.55L323.55,57.16L327.25,53.96L330.95,51L334.65,48.33L338.35,45.98L342.05,43.99L345.75,42.4"`,
    );
  });
  it('linear lines are straight between category values', () => {
    const l = run('line', [[2, 10, 4, 8]], 'linear');
    const pts = l.marks[0]
      .line!.slice(1)
      .split('L')
      .map((p) => p.split(',').map(Number));
    const cx = l.categoryX;
    for (const [x, y] of pts) {
      const i = Math.min(2, Math.max(0, cx.filter((c) => c <= x + 1e-9).length - 1));
      const [, ya] = pts.find(([px]) => Math.abs(px - cx[i]) < 0.01)!;
      const [, yb] = pts.find(([px]) => Math.abs(px - cx[i + 1]) < 0.01)!;
      const t = (x - cx[i]) / (cx[i + 1] - cx[i]);
      expect(y).toBeCloseTo(ya + (yb - ya) * t, 1);
    }
  });
  it('linear stacked tops equal cumulative straight lines', () => {
    const tops = smoothStack(
      [
        [1, 3],
        [2, 4],
      ],
      4,
      true,
    );
    expect(tops[1][0]).toEqual([3, 3.25, 3.5, 3.75, 4].map((_, s) => 3 + (7 - 3) * (s / 4)));
  });
  it('null gaps still split runs under linear', () => {
    const d = run('line', [[1, null, 5, 7]], 'linear').marks[0].line!;
    expect(d.match(/M/g)).toHaveLength(1);
    expect(run('line', [[1, 2, null, 5, 7]], 'linear').marks[0].line!.match(/M/g)).toHaveLength(2);
  });
});

describe('valueLabels (DS-12b)', () => {
  const g = (v: string) => `${v} g`;
  const bar = (values: (number | null)[], over: Partial<LayoutInput> = {}) =>
    layout({
      type: 'bar',
      categories: ['a', 'b'],
      series: resolveSeries('bar', [s('x', values)], 2).series,
      formatValue: (n) => g(String(n)),
      valueLabels: true,
      ...over,
    });

  it('labels each bar above its top, centred on the bar', () => {
    const l = bar([52, 48]);
    expect(l.valueLabels.map((v) => v.text)).toEqual(['52 g', '48 g']);
    l.valueLabels.forEach((v, i) => {
      expect(v.x).toBeCloseTo(l.categoryX[i]);
      expect(v.anchor).toBe('above');
    });
    expect(l.valueLabels[0].y).toBeLessThan(l.marks[0].points[0]!.y);
  });

  it('puts negative labels below the bar end', () => {
    const l = bar([-5, 3]);
    expect(l.valueLabels[0].anchor).toBe('below');
    expect(l.valueLabels[0].y).toBeGreaterThan(l.marks[0].points[0]!.y);
  });

  it('skips null values', () => {
    expect(bar([null, 4]).valueLabels.map((v) => v.text)).toEqual(['4 g']);
  });

  it('labels a zero value at the zero line', () => {
    const l = bar([0, 4]);
    expect(l.valueLabels.map((v) => v.text)).toEqual(['0 g', '4 g']);
    expect(l.valueLabels[0].anchor).toBe('above');
    const zeroY = l.marks[0].points[0]!.y;
    expect(l.valueLabels[0].y).toBeLessThan(zeroY);
    expect(l.valueLabels[0].y).toBeGreaterThan(zeroY - 14);
  });

  it('labels a stacked total of 0 when the stack has a value, not an all-null stack', () => {
    const series = resolveSeries(
      'stacked-bar',
      [s('x', [0, 5, null]), s('y', [0, -5, null])],
      3,
    ).series;
    const l = layout({
      type: 'stacked-bar',
      categories: ['a', 'b', 'c'],
      series,
      valueLabels: true,
    });
    expect(l.valueLabels.map((v) => v.text)).toEqual(['0', '0']);
  });

  it('omits labels wider than their bar', () => {
    expect(bar([52, 48], { width: 100 }).valueLabels).toEqual([]);
  });

  it('labels every series in grouped bars, comparisons included', () => {
    const l = layout({
      type: 'bar',
      categories: ['a'],
      series: resolveSeries('bar', [s('x', [5]), s('p', [4], 'x')], 1).series,
      valueLabels: true,
    });
    expect(l.valueLabels.map((v) => v.text)).toEqual(['5', '4']);
  });

  it('labels stacked bars with the total of the visible series', () => {
    const all = resolveSeries('stacked-bar', [s('x', [10, 20]), s('y', [5, 5])], 2).series;
    const input = { type: 'stacked-bar' as const, categories: ['a', 'b'], valueLabels: true };
    const l = layout({ ...input, series: all });
    expect(l.valueLabels.map((v) => v.text)).toEqual(['15', '25']);
    expect(l.valueLabels[0].y).toBeLessThan(l.marks[1].points[0]!.y);
    const hidden = layout({ ...input, series: visibleSeries(all, ['y']) });
    expect(hidden.valueLabels.map((v) => v.text)).toEqual(['10', '20']);
  });

  it('ignores line and area', () => {
    for (const type of ['line', 'area'] as const)
      expect(
        layout({
          type,
          series: resolveSeries(type, [s('x', [1, 2, 3, 4])], 4).series,
          valueLabels: true,
        }).valueLabels,
      ).toEqual([]);
  });

  it('is empty when off', () => {
    expect(bar([52, 48], { valueLabels: false }).valueLabels).toEqual([]);
  });

  it('reserves headroom so the tallest label stays inside the plot', () => {
    const l = bar([52, 48]);
    const top = Math.min(...l.valueLabels.map((v) => v.y));
    expect(top - 14).toBeGreaterThanOrEqual(l.plot.y);
  });
});
