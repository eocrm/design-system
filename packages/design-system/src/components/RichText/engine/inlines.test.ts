import { runsText, runsLength, normalizeInlines, sliceInlines, mapMarksOverRange } from './inlines';
import { withMark } from './marks';
import type { Inline, Mark } from './model';

const bold: Mark = { type: 'bold' };
const plain = (text: string): Inline => ({ text, marks: [] });
const b = (text: string): Inline => ({ text, marks: [bold] });

describe('inlines', () => {
  it('runsText / runsLength concatenate', () => {
    expect(runsText([plain('ab'), b('cd')])).toBe('abcd');
    expect(runsLength([plain('ab'), b('cd')])).toBe(4);
  });

  it('runsText / runsLength tolerate a missing inlines (void/attachment block)', () => {
    // A void block (e.g. `attachment`) can carry no `inlines`; the helpers must treat
    // it as zero text instead of throwing on `.map`/`.reduce` of undefined.
    expect(runsText(undefined)).toBe('');
    expect(runsLength(undefined)).toBe(0);
  });

  it('normalizeInlines merges adjacent equal-mark runs and drops empties', () => {
    expect(normalizeInlines([plain('a'), plain(''), plain('b')])).toEqual([plain('ab')]);
    expect(normalizeInlines([plain('a'), b('b'), b('c')])).toEqual([plain('a'), b('bc')]);
  });

  it('normalizeInlines guarantees at least one (empty) run', () => {
    expect(normalizeInlines([])).toEqual([plain('')]);
    expect(normalizeInlines([plain('')])).toEqual([plain('')]);
  });

  it('sliceInlines extracts a char sub-range across run boundaries', () => {
    const runs = [plain('Hel'), b('lo')]; // "Hello"
    expect(sliceInlines(runs, 0, 5)).toEqual([plain('Hel'), b('lo')]);
    expect(sliceInlines(runs, 2, 4)).toEqual([plain('l'), b('l')]);
    expect(sliceInlines(runs, 3, 5)).toEqual([b('lo')]);
  });

  it('mapMarksOverRange applies fn only within [start,end), splitting runs', () => {
    const runs = [plain('abcd')];
    const out = mapMarksOverRange(runs, 1, 3, (m) => withMark(m, bold));
    // "a" plain, "bc" bold, "d" plain
    expect(out).toEqual([plain('a'), b('bc'), plain('d')]);
  });

  it('mapMarksOverRange leaves runs entirely outside the range untouched', () => {
    const runs = [plain('ab'), b('cd')];
    const out = mapMarksOverRange(runs, 0, 2, (m) => withMark(m, bold));
    expect(out).toEqual(
      [b('ab'), b('cd')].reduce<Inline[]>((acc, r) => {
        const last = acc[acc.length - 1];
        if (last && last.marks.length === r.marks.length) {
          acc[acc.length - 1] = { text: last.text + r.text, marks: last.marks };
          return acc;
        }
        acc.push(r);
        return acc;
      }, []),
    );
  });
});
