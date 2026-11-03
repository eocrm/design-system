import {
  MIN_THICKNESS,
  TAPER_HOLD,
  formatPercent,
  orientationFor,
  resolveStages,
  stageGeometry,
  stageIndexAt,
  type FunnelShape,
} from './funnelModel';

const L = [
  { key: 'l', label: 'Leads', value: 1240 },
  { key: 'q', label: 'Qualified', value: 620 },
  { key: 'p', label: 'Proposal', value: 248 },
  { key: 'n', label: 'Negotiation', value: 124 },
  { key: 'w', label: 'Won', value: 50 },
];
const st = (value: number) => ({ key: `k${value}`, label: 'x', value });
const ysOf = (d: string) => (d.match(/,(-?[\d.]+)/g) ?? []).map((m) => Number(m.slice(1)));

describe('resolveStages', () => {
  it('leaves un-overridden stages on the ramp (slot null) and computes ratios', () => {
    const r = resolveStages(L);
    expect(r.map((s) => s.slot)).toEqual([null, null, null, null, null]);
    expect(r.map((s) => s.stepRatio)).toEqual([null, 0.5, 0.4, 0.5, 50 / 124]);
    expect(r[4].shareRatio).toBe(50 / 1240);
    expect(r[0].heightRatio).toBe(1);
  });

  it('honours an explicit colour without shifting the others', () => {
    const r = resolveStages(L.map((s, i) => (i === 1 ? { ...s, color: 7 as const } : s)));
    expect(r.map((s) => s.slot)).toEqual([null, 7, null, null, null]);
  });

  it('sanitises bad numbers', () => {
    const r = resolveStages([st(-5), st(NaN), st(Infinity), st(10)]);
    expect(r.map((s) => s.value)).toEqual([0, 0, 0, 10]);
    expect(r[1].stepRatio).toBeNull();
    expect(r.every((s) => s.shareRatio === null)).toBe(true);
    expect(r[3].heightRatio).toBe(1);
  });

  it('handles out-of-order values', () => {
    const r = resolveStages([st(10), st(20)]);
    expect(r.map((s) => s.heightRatio)).toEqual([0.5, 1]);
    expect(r[1].stepRatio).toBe(2);
  });
});

describe('orientationFor', () => {
  it('goes vertical below the minimum stage width', () => {
    expect(orientationFor(5 * 96, 5)).toBe('horizontal');
    expect(orientationFor(5 * 96 - 1, 5)).toBe('vertical');
    expect(orientationFor(200, 1)).toBe('horizontal');
  });
});

describe('stageGeometry', () => {
  describe.each<FunnelShape>(['taper', 'sharp'])('%s', (shape) => {
    const g = stageGeometry({ stages: resolveStages(L), width: 500, height: 200, shape });

    it('lays stages out in equal columns', () => {
      expect(g).toHaveLength(5);
      g.forEach((s, i) => {
        expect(s.x0).toBe(i * 100);
        expect(s.x1).toBe((i + 1) * 100);
        expect(s.cx).toBe(s.x0 + 50);
        expect(s.cy).toBe(100);
        expect(s.d).not.toContain('NaN');
      });
    });

    it('draws straight lines only', () => {
      g.forEach((s) => expect(s.d).not.toContain('C'));
    });

    it('holds for TAPER_HOLD of the column only when tapering, never on the last stage', () => {
      g.forEach((s, i) => {
        const held = shape === 'taper' && i < g.length - 1;
        expect(s.d.includes(`${s.x0 + 100 * TAPER_HOLD},`)).toBe(held);
      });
    });
  });

  it('taper: flat at the stage height, then straight to the next height', () => {
    const [s] = stageGeometry({
      stages: resolveStages(L),
      width: 500,
      height: 200,
      shape: 'taper',
    });
    // Leads 200 tall (0..200), Qualified 100 tall (50..150).
    expect(s.d).toBe('M 0,0 L 75,0 L 100,50 L 100,150 L 75,200 L 0,200 Z');
  });

  it('fills a single stage with no curve', () => {
    const [s] = stageGeometry({
      stages: resolveStages([st(3)]),
      width: 200,
      height: 100,
      shape: 'taper',
    });
    const ys = ysOf(s.d);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(100);
    expect(s.d).not.toContain('C');
  });

  it('keeps zero-value stages at least MIN_THICKNESS tall', () => {
    // Last stage has no taper, so its extent is its own thickness.
    const [, s] = stageGeometry({
      stages: resolveStages([st(10), st(0)]),
      width: 200,
      height: 100,
      shape: 'sharp',
    });
    const ys = ysOf(s.d);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(MIN_THICKNESS);
  });
});

describe('stageIndexAt', () => {
  it('maps x to a column or null outside', () => {
    expect(stageIndexAt(500, 5, 0)).toBe(0);
    expect(stageIndexAt(500, 5, 499)).toBe(4);
    expect(stageIndexAt(500, 5, 500)).toBeNull();
    expect(stageIndexAt(500, 5, -1)).toBeNull();
  });
});

describe('formatPercent', () => {
  it('rounds to whole percent, one decimal below 1%', () => {
    expect(formatPercent(0.5, 'en-GB')).toBe('50%');
    expect(formatPercent(50 / 1240, 'en-GB')).toBe('4%');
    expect(formatPercent(0.004, 'en-GB')).toBe('0.4%');
    expect(formatPercent(2, 'en-GB')).toBe('200%');
  });
});
