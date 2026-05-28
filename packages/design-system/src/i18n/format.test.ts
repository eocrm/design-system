import { deepMerge, lookupKey, ruPlural } from './format';

describe('deepMerge', () => {
  it('overrides a top-level string', () => {
    const merged = deepMerge({ a: 'one', b: 'two' }, { a: 'ONE' });
    expect(merged).toEqual({ a: 'ONE', b: 'two' });
  });

  it('recursively merges nested objects', () => {
    const base = { alert: { dismiss: 'Dismiss', close: 'Close' }, toast: { dismiss: 'Dismiss' } };
    const merged = deepMerge(base, { alert: { dismiss: 'Hide' } });
    expect(merged).toEqual({
      alert: { dismiss: 'Hide', close: 'Close' },
      toast: { dismiss: 'Dismiss' },
    });
  });

  it('does not mutate the base object', () => {
    const base = { alert: { dismiss: 'Dismiss' } };
    deepMerge(base, { alert: { dismiss: 'Hide' } });
    expect(base.alert.dismiss).toBe('Dismiss');
  });

  it('treats arrays as atomic — override replaces base array wholesale', () => {
    const base = { calendar: { months: ['Jan', 'Feb', 'Mar'] } };
    const merged = deepMerge(base, { calendar: { months: ['Янв', 'Фев'] } });
    expect(merged.calendar.months).toEqual(['Янв', 'Фев']);
  });

  it('replaces a function leaf wholesale (no recursion into function)', () => {
    const baseFn = (p: { n: number }) => `base ${p.n}`;
    const overFn = (p: { n: number }) => `over ${p.n}`;
    const merged = deepMerge({ greet: baseFn }, { greet: overFn });
    expect(merged.greet({ n: 1 })).toBe('over 1');
  });

  it('ignores undefined values in the override (does not blank out base keys)', () => {
    const merged = deepMerge<{ a: string; b?: string }>({ a: 'one', b: 'two' }, { b: undefined });
    expect(merged).toEqual({ a: 'one', b: 'two' });
  });

  it('adds keys present only in the override', () => {
    const merged = deepMerge<Record<string, string>>({ a: 'one' }, { b: 'two' });
    expect(merged).toEqual({ a: 'one', b: 'two' });
  });
});

describe('lookupKey', () => {
  const messages = {
    alert: { dismiss: 'Dismiss' },
    deep: { a: { b: { c: 'leaf' } } },
    calendar: { months: ['Jan', 'Feb'] },
  };

  it('returns a leaf at a valid path', () => {
    expect(lookupKey(messages, 'alert.dismiss')).toBe('Dismiss');
  });

  it('returns undefined for an invalid top-level segment', () => {
    expect(lookupKey(messages, 'missing.key')).toBeUndefined();
  });

  it('returns undefined when a mid-path segment is missing', () => {
    expect(lookupKey(messages, 'alert.nope.deeper')).toBeUndefined();
  });

  it('resolves deeply-nested paths', () => {
    expect(lookupKey(messages, 'deep.a.b.c')).toBe('leaf');
  });

  it('returns array leaves as-is', () => {
    expect(lookupKey(messages, 'calendar.months')).toEqual(['Jan', 'Feb']);
  });
});

describe('ruPlural', () => {
  const forms: readonly [string, string, string] = ['файл', 'файла', 'файлов'];

  it('picks the "one" form for 1', () => {
    expect(ruPlural(1, forms)).toBe('файл');
  });

  it('picks the "few" form for 2', () => {
    expect(ruPlural(2, forms)).toBe('файла');
  });

  it('picks the "many" form for 5', () => {
    expect(ruPlural(5, forms)).toBe('файлов');
  });

  it('picks the "many" form for the 11 exception', () => {
    expect(ruPlural(11, forms)).toBe('файлов');
  });

  it('picks the "one" form for 21 (last digit 1, not in teens)', () => {
    expect(ruPlural(21, forms)).toBe('файл');
  });

  it('picks the "few" form for 22 (last digit 2, not in teens)', () => {
    expect(ruPlural(22, forms)).toBe('файла');
  });

  it('picks the "many" form for 0', () => {
    expect(ruPlural(0, forms)).toBe('файлов');
  });
});
