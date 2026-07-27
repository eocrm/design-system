import { computeColumnShifts, cssIdent, shiftVarName } from './columnShift';

const orderedIds = ['a', 'b', 'c', 'd'];
const widths = { a: 100, b: 120, c: 80, d: 60 };

describe('computeColumnShifts', () => {
  it('translates the active column by the pointer delta', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'b',
      widths,
      deltaX: 37,
    });
    expect(shifts.b).toBe(37);
  });

  it('shifts columns left by the active width when the active column moves right', () => {
    // b (120px wide) dragged rightwards onto d: c and d slide left by 120.
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'd',
      widths,
      deltaX: 200,
    });
    expect(shifts.b).toBe(200);
    expect(shifts.c).toBe(-120);
    expect(shifts.d).toBe(-120);
    expect(shifts.a).toBeUndefined();
  });

  it('shifts columns right by the active width when the active column moves left', () => {
    // d (60px wide) dragged leftwards onto b: b and c slide right by 60.
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'd',
      overId: 'b',
      widths,
      deltaX: -150,
    });
    expect(shifts.d).toBe(-150);
    expect(shifts.b).toBe(60);
    expect(shifts.c).toBe(60);
    expect(shifts.a).toBeUndefined();
  });

  it('shifts nothing but the active column when hovering itself', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'b',
      widths,
      deltaX: 10,
    });
    expect(Object.keys(shifts)).toEqual(['b']);
  });

  it('shifts nothing but the active column when over is null', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: null,
      widths,
      deltaX: 10,
    });
    expect(Object.keys(shifts)).toEqual(['b']);
  });

  it('returns an empty map for an unknown active id', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'zzz',
      overId: 'b',
      widths,
      deltaX: 10,
    });
    expect(shifts).toEqual({});
  });

  it('ignores an unknown over id', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'zzz',
      widths,
      deltaX: 10,
    });
    expect(Object.keys(shifts)).toEqual(['b']);
  });

  it('treats a missing width as zero rather than NaN', () => {
    const shifts = computeColumnShifts({
      orderedIds,
      activeId: 'b',
      overId: 'c',
      widths: {},
      deltaX: 10,
    });
    expect(shifts.c).toBe(-0);
  });

  it('handles a single-column table', () => {
    const shifts = computeColumnShifts({
      orderedIds: ['only'],
      activeId: 'only',
      overId: 'only',
      widths: { only: 100 },
      deltaX: 5,
    });
    expect(shifts).toEqual({ only: 5 });
  });
});

describe('cssIdent', () => {
  it('passes through an already-safe id', () => {
    expect(cssIdent('name')).toMatch(/^name-[a-z0-9]+$/);
  });

  it('replaces characters invalid in a custom property name', () => {
    expect(cssIdent('user.first name')).toMatch(/^user_first_name-[a-z0-9]+$/);
  });

  it('is stable for the same input', () => {
    expect(cssIdent('a.b')).toBe(cssIdent('a.b'));
  });

  it('does not collide for ids that sanitize to the same string', () => {
    // "a.b" and "a b" both sanitize to "a_b" — the hash suffix must separate them.
    expect(cssIdent('a.b')).not.toBe(cssIdent('a b'));
  });

  it('handles unicode and leading digits', () => {
    expect(cssIdent('1名前')).toMatch(/^1__-[a-z0-9]+$/);
  });
});

describe('shiftVarName', () => {
  it('builds a --dt-shift- prefixed custom property name', () => {
    expect(shiftVarName('name')).toBe(`--dt-shift-${cssIdent('name')}`);
    expect(shiftVarName('name').startsWith('--dt-shift-')).toBe(true);
  });
});
