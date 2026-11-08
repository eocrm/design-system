import { computeLayout } from './chartModel';
import {
  clampViewport,
  domainFractionAt,
  ensureVisible,
  panViewport,
  visibleIndexRange,
  zoomViewport,
  type ChartViewport,
} from './chartViewport';

const near = (v: ChartViewport | null, from: number, to: number) => {
  expect(v).not.toBeNull();
  expect(v!.from).toBeCloseTo(from, 9);
  expect(v!.to).toBeCloseTo(to, 9);
};

describe('clampViewport', () => {
  it('shifts a window back into 0..1, keeping its span', () => {
    near(clampViewport({ from: -0.2, to: 0.3 }, 10), 0, 0.5);
    near(clampViewport({ from: 0.8, to: 1.2 }, 10), 0.6, 1);
  });
  it('widens a span below two categories around its centre', () => {
    near(clampViewport({ from: 0.5, to: 0.52 }, 10), 0.41, 0.61);
  });
  it('is null for the full span, one category or none', () => {
    expect(clampViewport({ from: 0, to: 1 }, 10)).toBeNull();
    expect(clampViewport({ from: -1, to: 2 }, 10)).toBeNull();
    expect(clampViewport({ from: 0.2, to: 0.4 }, 1)).toBeNull();
    expect(clampViewport({ from: 0.2, to: 0.4 }, 0)).toBeNull();
    expect(clampViewport({ from: NaN, to: 0.4 }, 10)).toBeNull();
  });
});

describe('zoomViewport', () => {
  it('zooms in around the anchor', () => {
    near(zoomViewport(null, 0.5, 0.5, 10), 0.25, 0.75);
    near(zoomViewport(null, 0.5, 0, 10), 0, 0.5);
    // Anchor is a fraction of the visible plot: 0.5 of {0.2..0.6} is domain 0.4.
    near(zoomViewport({ from: 0.2, to: 0.6 }, 0.5, 0.5, 10), 0.3, 0.5);
  });
  it('zooming out past the full domain is null', () => {
    expect(zoomViewport({ from: 0.25, to: 0.75 }, 3, 0.5, 10)).toBeNull();
    expect(zoomViewport(null, 2, 0.5, 10)).toBeNull();
  });
  it('stops at two categories, keeping the anchor', () => {
    near(zoomViewport({ from: 0.2, to: 0.5 }, 0.1, 0, 10), 0.2, 0.4);
  });
  it('is null with fewer than two categories', () => {
    expect(zoomViewport(null, 0.5, 0.5, 1)).toBeNull();
    expect(zoomViewport(null, 0.5, 0.5, 0)).toBeNull();
  });
});

describe('panViewport', () => {
  it('pans by domain fractions, clamped, keeping span', () => {
    near(panViewport({ from: 0.2, to: 0.4 }, 0.7, 10), 0.8, 1);
    near(panViewport({ from: 0.2, to: 0.4 }, -0.5, 10), 0, 0.2);
    expect(panViewport(null, 0.3, 10)).toBeNull();
  });
});

describe('visibleIndexRange', () => {
  it('lists categories whose band overlaps the window', () => {
    expect(visibleIndexRange({ from: 0.25, to: 0.5 }, 8)).toEqual({ from: 2, to: 3 });
    expect(visibleIndexRange({ from: 0.3, to: 0.55 }, 8)).toEqual({ from: 2, to: 4 });
    expect(visibleIndexRange(null, 8)).toEqual({ from: 0, to: 7 });
  });
  it('has no NaN for no categories', () => {
    const r = visibleIndexRange({ from: 0.2, to: 0.6 }, 0);
    expect(Number.isNaN(r.from) || Number.isNaN(r.to)).toBe(false);
    expect(r.to).toBeLessThan(r.from);
  });
});

describe('ensureVisible', () => {
  it('pans minimally so the band is inside', () => {
    near(ensureVisible({ from: 0, to: 0.5 }, 6, 10), 0.2, 0.7);
    near(ensureVisible({ from: 0.5, to: 1 }, 2, 10), 0.2, 0.7);
    near(ensureVisible({ from: 0.2, to: 0.7 }, 3, 10), 0.2, 0.7);
    expect(ensureVisible(null, 3, 10)).toBeNull();
  });
});

describe('domainFractionAt', () => {
  const base = {
    type: 'line' as const,
    categories: ['a', 'b', 'c', 'd'],
    series: [],
    width: 400,
    height: 200,
    formatValue: String,
  };
  it('maps svg x to band-edge fractions of the domain, with and without a viewport', () => {
    const l = computeLayout(base);
    expect(domainFractionAt(l, l.plot.x)).toBeCloseTo(0);
    expect(domainFractionAt(l, l.plot.x + l.plot.width)).toBeCloseTo(1);
    expect(domainFractionAt(l, l.categoryX[1])).toBeCloseTo(0.375);
    const z = computeLayout({ ...base, viewport: { from: 0.5, to: 1 } });
    expect(domainFractionAt(z, z.plot.x)).toBeCloseTo(0.5);
    expect(domainFractionAt(z, z.plot.x + z.plot.width / 2)).toBeCloseTo(0.75);
    expect(domainFractionAt(z, -1000)).toBe(0);
  });
  it('is 0 with no categories', () => {
    expect(domainFractionAt(computeLayout({ ...base, categories: [] }), 50)).toBe(0);
  });
});
