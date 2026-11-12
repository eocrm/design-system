import { describe, expect, it } from 'vitest';
import { computeLaneLayout, laneDotRadius, type Lane } from './laneModel';
import { X_AXIS_HEIGHT } from '../Chart/chartModel';

const categories = ['a', 'b', 'c', 'd', 'e'];
const wide: Lane = {
  key: 'w',
  label: 'Wide',
  type: 'bar',
  values: [2000, 1500, 1800, null, 1000],
  formatValue: (n) => `${n.toLocaleString('en-US')} g`,
};
const narrow: Lane = {
  key: 'n',
  label: 'Narrow',
  type: 'line',
  values: [1, 3, 2, 3, 1],
  formatValue: String,
};
const dots: Lane = {
  key: 'd',
  label: 'Dots',
  type: 'dots',
  values: [0, 2, null, 1, 0],
  formatValue: String,
};
const base = {
  categories,
  width: 320,
  height: 400,
  viewport: null,
  topGutter: 10,
  dotsLaneHeight: 24,
  laneGap: 8,
  laneLabelHeight: 16,
};

describe('computeLaneLayout', () => {
  it('shares plot.x, width and categoryX across lanes even when tick labels differ in width', () => {
    const out = computeLaneLayout({ ...base, lanes: [narrow, wide, dots, narrow] });
    const plots = out.lanes.flatMap((l) => (l.layout ? [l.layout] : []));
    expect(plots.length).toBe(3);
    for (const l of plots) {
      expect(l.plot.x).toBe(out.gutterLeft);
      expect(l.plot.width).toBe(plots[0].plot.width);
      expect(l.categoryX).toEqual(out.categoryX);
    }
    // the gutter is the widest lane's, not the narrow one's
    const alone = computeLaneLayout({ ...base, lanes: [narrow] });
    expect(out.gutterLeft).toBeGreaterThan(alone.gutterLeft);
  });

  it('draws x labels on the bottom lane only', () => {
    const out = computeLaneLayout({ ...base, lanes: [narrow, wide, narrow] });
    const withLabels = out.lanes.filter((l) => l.layout && l.layout.xLabels.length > 0);
    expect(withLabels.map((l) => l.key)).toEqual([out.lanes[2].key]);
    expect(out.xLabels).toEqual(out.lanes[2].layout!.xLabels);
  });

  it('gives a dots lane its fixed height and dots only where value > 0', () => {
    const out = computeLaneLayout({ ...base, lanes: [narrow, dots, wide] });
    const lane = out.lanes[1];
    expect(lane.layout).toBeNull();
    expect(lane.height).toBe(base.dotsLaneHeight);
    expect(lane.dots.map((d) => d.index)).toEqual([1, 3]);
    for (const d of lane.dots) {
      expect(d.cx).toBe(out.categoryX[d.index]);
      expect(d.cy).toBe(base.laneLabelHeight + (base.dotsLaneHeight - base.laneLabelHeight) / 2);
    }
  });

  it('stacks lanes without overlap and fills the height', () => {
    const out = computeLaneLayout({ ...base, lanes: [narrow, dots, wide] });
    expect(out.lanes[0].top).toBe(base.topGutter);
    out.lanes.slice(1).forEach((l, i) => {
      const prev = out.lanes[i];
      expect(l.top).toBeCloseTo(prev.top + prev.height + base.laneGap);
    });
    const last = out.lanes[2];
    expect(last.top + last.height).toBeCloseTo(base.height);
  });

  it('reserves the x-axis band below a bottom dots lane and still yields x labels', () => {
    const out = computeLaneLayout({ ...base, lanes: [narrow, dots] });
    const last = out.lanes[1];
    expect(last.top + last.height).toBeCloseTo(base.height - X_AXIS_HEIGHT);
    expect(out.xLabels.length).toBeGreaterThan(0);
  });

  it('aligns bottom-dots x labels with categoryX under a viewport', () => {
    const out = computeLaneLayout({
      ...base,
      lanes: [narrow, dots],
      viewport: { from: 0.2, to: 0.8 },
    });
    expect(out.xLabels.length).toBeGreaterThan(0);
    expect(out.xLabels.every((l) => l.x === out.categoryX[l.index])).toBe(true);
  });

  it('applies a viewport to every lane identically', () => {
    const full = computeLaneLayout({ ...base, lanes: [narrow, wide] });
    const zoomed = computeLaneLayout({
      ...base,
      lanes: [narrow, wide],
      viewport: { from: 0.4, to: 0.8 },
    });
    expect(zoomed.categoryX).not.toEqual(full.categoryX);
    for (const l of zoomed.lanes) expect(l.layout!.categoryX).toEqual(zoomed.categoryX);
  });

  it('starts the shared plot span at a top dots lane, above its dots', () => {
    const out = computeLaneLayout({ ...base, lanes: [dots, narrow, wide] });
    const top = out.lanes[0];
    expect(out.plot.y).toBe(top.top + base.laneLabelHeight);
    for (const d of top.dots) expect(out.plot.y).toBeLessThanOrEqual(top.top + d.cy);
  });

  it('ends the shared plot span at the bottom of a bottom dots lane', () => {
    const out = computeLaneLayout({ ...base, lanes: [narrow, wide, dots] });
    const bottom = out.lanes[2];
    expect(out.plot.y + out.plot.height).toBeCloseTo(bottom.top + bottom.height);
    for (const d of bottom.dots)
      expect(out.plot.y + out.plot.height).toBeGreaterThanOrEqual(bottom.top + d.cy);
  });

  it('fits dots to the band at 90 categories on a 300px plot, and grows them back when zoomed in', () => {
    const many = Array.from({ length: 90 }, (_, i) => `c${i}`);
    const lanes: Lane[] = [narrow, { ...dots, values: many.map(() => 1) }];
    const out = computeLaneLayout({ ...base, categories: many, width: 300, lanes });
    const r = laneDotRadius(4, out.step);
    expect(out.lanes[1].dots.length).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(out.step / 2);
    expect(r).toBeGreaterThan(0);
    const zoomed = computeLaneLayout({
      ...base,
      categories: many,
      width: 300,
      lanes,
      viewport: { from: 0, to: 0.1 },
    });
    expect(laneDotRadius(4, zoomed.step)).toBe(4);
  });

  it('yields a categoryX when every lane is dots', () => {
    const out = computeLaneLayout({ ...base, lanes: [dots, { ...dots, key: 'd2' }] });
    expect(out.categoryX).toHaveLength(categories.length);
    expect(out.step).toBeGreaterThan(0);
    expect(out.lanes[0].dots.every((d) => d.cx === out.categoryX[d.index])).toBe(true);
  });
});
