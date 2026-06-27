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

describe('markKey / marksEqual — mentions', () => {
  it('two mentions with different ids are NOT equal', () => {
    const a = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    const b = [{ type: 'mention', id: '2', label: 'Alice' } as const];
    expect(marksEqual(a, b)).toBe(false);
  });

  it('two mentions with the same id+label ARE equal', () => {
    const a = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    const b = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    expect(marksEqual(a, b)).toBe(true);
  });

  it('a mention is not equal to a bare-type mark set of different length', () => {
    const a = [{ type: 'mention', id: '1', label: 'Alice' } as const];
    const b = [{ type: 'bold' } as const];
    expect(marksEqual(a, b)).toBe(false);
  });
});

describe('markKey / marksEqual — color marks', () => {
  it('a textColor mark equals an identical one', () => {
    const a: Mark = { type: 'textColor', color: 'red' };
    const b: Mark = { type: 'textColor', color: 'red' };
    expect(marksEqual([a], [b])).toBe(true);
  });

  it('two textColor marks with different keys are NOT equal', () => {
    const a: Mark = { type: 'textColor', color: 'red' };
    const b: Mark = { type: 'textColor', color: 'blue' };
    expect(marksEqual([a], [b])).toBe(false);
  });

  it('two bgColor marks with different keys are NOT equal', () => {
    const a: Mark = { type: 'bgColor', color: 'red' };
    const b: Mark = { type: 'bgColor', color: 'green' };
    expect(marksEqual([a], [b])).toBe(false);
  });

  it('marksEqual handles a list including a color mark (order-insensitive)', () => {
    const list = [bold, { type: 'textColor', color: 'red' } as const];
    expect(marksEqual(list, [{ type: 'textColor', color: 'red' }, bold])).toBe(true);
    expect(marksEqual(list, [bold, { type: 'textColor', color: 'blue' }])).toBe(false);
  });
});
