import { layoutSparkline, summarize } from './sparklineModel';

describe('summarize', () => {
  it('returns first/last/min/max over finite values, skipping null and NaN', () => {
    expect(summarize([null, 3, NaN, 9, 1, null])).toEqual({ first: 3, last: 1, min: 1, max: 9 });
  });
  it('returns null when nothing is finite', () => {
    expect(summarize([])).toBeNull();
    expect(summarize([null, NaN, Infinity])).toBeNull();
  });
});

describe('layoutSparkline', () => {
  const W = 100;
  const H = 40;

  it('returns null for no data or no size', () => {
    expect(layoutSparkline([null], 'line', W, H)).toBeNull();
    expect(layoutSparkline([1, 2], 'line', 0, H)).toBeNull();
  });

  it('line: a path with no NaN and an end dot on the last finite value', () => {
    const g = layoutSparkline([1, 5, 3, null], 'line', W, H)!;
    expect(g.line).toMatch(/^M/);
    expect(g.line).not.toContain('NaN');
    expect(g.area).toBeUndefined();
    expect(g.bars).toBeUndefined();
    expect(g.dot).toBeDefined();
    // index 2 of 4 values → x at 2/3 of the inset span
    expect(g.dot!.cx).toBeCloseTo(3 + (2 / 3) * (W - 6));
  });

  it('line: nulls split the path into separate segments (gaps)', () => {
    const g = layoutSparkline([1, 2, null, 3, 4], 'line', W, H)!;
    expect(g.line!.match(/M/g)).toHaveLength(2);
  });

  it('line: the y range spans min..max (highest value at the top inset)', () => {
    const g = layoutSparkline([2, 10], 'line', W, H)!;
    expect(g.dot!.cy).toBeCloseTo(3);
  });

  it('flat series draws at mid height', () => {
    const g = layoutSparkline([5, 5, 5], 'line', W, H)!;
    expect(g.dot!.cy).toBeCloseTo(H / 2);
  });

  it('single value: no NaN, dot centred horizontally', () => {
    const g = layoutSparkline([7], 'line', W, H)!;
    expect(g.line ?? '').not.toContain('NaN');
    expect(g.dot!.cx).toBeCloseTo(W / 2);
  });

  it('area: fill path down to the baseline plus the stroke and dot', () => {
    const g = layoutSparkline([0, 4, 2], 'area', W, H)!;
    expect(g.area).toMatch(/^M/);
    expect(g.line).toMatch(/^M/);
    expect(g.area).not.toContain('NaN');
    expect(g.dot).toBeDefined();
  });

  it('area/bar: non-negative data uses a zero baseline', () => {
    // [5, 10] with zero baseline → 5 sits half way, not at the bottom.
    const g = layoutSparkline([5, 10], 'bar', W, H)!;
    expect(g.bars).toHaveLength(2);
    const [a, b] = g.bars!;
    expect(b.height).toBeCloseTo(H - 6);
    expect(a.height).toBeCloseTo((H - 6) / 2);
  });

  it('bar: one rect per finite value, nulls skipped, no dot, no NaN', () => {
    const g = layoutSparkline([1, null, 3, NaN], 'bar', W, H)!;
    expect(g.bars).toHaveLength(2);
    expect(g.dot).toBeUndefined();
    expect(JSON.stringify(g)).not.toContain('null');
  });

  it('bar: all-zero series gives zero-height bars without NaN', () => {
    const g = layoutSparkline([0, 0], 'bar', W, H)!;
    g.bars!.forEach((r) => {
      expect(Number.isFinite(r.y)).toBe(true);
      expect(r.height).toBe(0);
    });
  });

  it('bar: negative values hang from the zero line', () => {
    const g = layoutSparkline([-4, 4], 'bar', W, H)!;
    const [neg, pos] = g.bars!;
    expect(neg.y).toBeCloseTo(pos.y + pos.height); // both meet at the zero line
    expect(neg.height).toBeCloseTo(pos.height);
  });
});
