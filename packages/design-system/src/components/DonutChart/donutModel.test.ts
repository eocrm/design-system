import { donutArcPath, donutRadii, MIN_SEGMENT_ANGLE, resolveDonut } from './donutModel';

const seg = (key: string, value: number, color?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) => ({
  key,
  label: key,
  value,
  color,
});
const TAU = Math.PI * 2;
const span = (r: ReturnType<typeof resolveDonut>) =>
  r.segments.filter((s) => s.drawn).reduce((a, s) => a + (s.end - s.start), 0);

describe('resolveDonut', () => {
  it('computes shares and spans summing to 2π', () => {
    const r = resolveDonut([seg('a', 12), seg('b', 5), seg('c', 30)]);
    expect(r.total).toBe(47);
    expect(r.segments[0].share).toBeCloseTo(12 / 47, 12);
    expect(r.segments[2].share).toBeCloseTo(30 / 47, 12);
    expect(Math.abs(span(r) - TAU)).toBeLessThan(1e-9);
    expect(r.segments[0].start).toBe(0);
    expect(r.segments[1].start).toBeCloseTo(r.segments[0].end, 12);
  });

  it('enforces the minimum angle while keeping real shares', () => {
    const r = resolveDonut([seg('a', 1000), seg('b', 1), seg('c', 1)]);
    for (const s of r.segments.slice(1)) {
      expect(s.end - s.start).toBeGreaterThanOrEqual(MIN_SEGMENT_ANGLE - 1e-12);
    }
    expect(Math.abs(span(r) - TAU)).toBeLessThan(1e-9);
    expect(r.segments[1].share).toBeCloseTo(1 / 1002, 12);
  });

  it('draws a single segment as a full ring', () => {
    const r = resolveDonut([seg('a', 5)]);
    expect(r.segments[0].start).toBe(0);
    expect(r.segments[0].end).toBeCloseTo(TAU, 12);
    const d = donutArcPath(0, TAU, 50, 30, 0.02);
    expect(d.length).toBeGreaterThan(0);
    expect(d).not.toContain('NaN');
  });

  it('clamps invalid values and reports their keys', () => {
    const r = resolveDonut([seg('z', 0), seg('a', 5), seg('n', -3), seg('x', NaN)]);
    expect(r.total).toBe(5);
    expect(r.invalid).toEqual(['n', 'x']);
    for (const i of [0, 2, 3]) {
      expect(r.segments[i].drawn).toBe(false);
      expect(r.segments[i].share).toBe(0);
      expect(r.segments[i].value).toBe(0);
      expect(r.segments[i].start).toBe(r.segments[i].end);
    }
  });

  it('handles all-zero input', () => {
    const r = resolveDonut([seg('a', 0), seg('b', 0)]);
    expect(r.total).toBe(0);
    expect(r.segments.every((s) => !s.drawn && s.share === 0 && !Number.isNaN(s.start))).toBe(true);
  });

  it('flags overflow past 8 uncoloured segments', () => {
    expect(resolveDonut(Array.from({ length: 9 }, (_, i) => seg(`k${i}`, 1))).overflow).toBe(true);
    expect(resolveDonut([seg('a', 1), seg('b', 1)]).overflow).toBe(false);
  });

  it('honours explicit colour slots', () => {
    const r = resolveDonut([seg('a', 1), seg('b', 1, 3), seg('c', 1)]);
    expect(r.segments.map((s) => s.slot)).toEqual([1, 3, 2]);
  });
});

describe('donutArcPath / donutRadii', () => {
  it('forces zero pad on a full ring', () => {
    expect(donutArcPath(0, TAU, 50, 30, 0.5)).toBe(donutArcPath(0, TAU, 50, 30, 0));
  });
  it('derives radii', () => {
    expect(donutRadii(100, 20)).toEqual({ outer: 50, inner: 30 });
    expect(donutRadii(100, 80)).toEqual({ outer: 50, inner: 0 });
  });
});
