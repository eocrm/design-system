import { marksEqual, hasMark, withMark, withoutMark, toggleMark } from './marks';
import type { Mark } from './model';

const bold: Mark = { type: 'bold' };
const italic: Mark = { type: 'italic' };

describe('marks', () => {
  it('marksEqual is order-insensitive', () => {
    expect(marksEqual([bold, italic], [italic, bold])).toBe(true);
    expect(marksEqual([bold], [bold, italic])).toBe(false);
    expect(marksEqual([], [])).toBe(true);
  });

  it('marksEqual distinguishes link href', () => {
    expect(marksEqual([{ type: 'link', href: '/a' }], [{ type: 'link', href: '/b' }])).toBe(false);
    expect(marksEqual([{ type: 'link', href: '/a' }], [{ type: 'link', href: '/a' }])).toBe(true);
  });

  it('hasMark checks by type', () => {
    expect(hasMark([bold], 'bold')).toBe(true);
    expect(hasMark([bold], 'italic')).toBe(false);
  });

  it('withMark adds, replacing a same-type mark (e.g. new link href)', () => {
    expect(withMark([], bold)).toEqual([bold]);
    expect(marksEqual(withMark([bold], italic), [bold, italic])).toBe(true);
    expect(withMark([{ type: 'link', href: '/a' }], { type: 'link', href: '/b' })).toEqual([
      { type: 'link', href: '/b' },
    ]);
  });

  it('withoutMark removes by type', () => {
    expect(withoutMark([bold, italic], 'bold')).toEqual([italic]);
    expect(withoutMark([bold], 'italic')).toEqual([bold]);
  });

  it('toggleMark adds if absent, removes if present', () => {
    expect(toggleMark([], bold)).toEqual([bold]);
    expect(toggleMark([bold], bold)).toEqual([]);
  });

  it('helpers do not mutate their input', () => {
    const input = [bold];
    withMark(input, italic);
    withoutMark(input, 'bold');
    toggleMark(input, bold);
    expect(input).toEqual([bold]);
  });
});
