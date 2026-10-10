import {
  barPath,
  categoryIndexAt,
  computeLayout,
  fitLegend,
  isEmpty,
  markerPath,
  markerShape,
  resolveSeries,
  thinLabels,
  visibleSeries,
  type ChartSeries,
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

describe('resolveSeries', () => {
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
    // d3 emits one "M" per defined run: [1] and [3] are two runs.
    expect(m.line!.match(/M/g)!.length).toBe(2);
    expect(m.dots).toHaveLength(2);
    expect(m.line).not.toContain('NaN');
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
    const topY = Number(m.line!.match(/^M[^,]+,([^L]+)/)![1]);
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
