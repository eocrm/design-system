import type { SelectGroup, SelectOption, SelectOptions } from './Select';
import {
  findOption,
  findOptions,
  flattenOptions,
  hasExactLabelMatch,
  isCreateRow,
  isGrouped,
} from './utils';

const flat: SelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
];

const grouped: SelectGroup[] = [
  {
    label: 'Fruits',
    options: [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ],
  },
  {
    label: 'Vegetables',
    options: [{ value: 'c', label: 'Carrot' }],
  },
];

describe('isGrouped', () => {
  it('returns false for a flat option list', () => {
    expect(isGrouped(flat)).toBe(false);
  });

  it('returns true for a grouped option list', () => {
    expect(isGrouped(grouped)).toBe(true);
  });

  it('returns false for an empty list (no first element to inspect)', () => {
    expect(isGrouped([] as SelectOptions)).toBe(false);
  });
});

describe('flattenOptions', () => {
  it('returns just option rows for a flat list', () => {
    const rows = flattenOptions(flat);
    expect(rows).toEqual([
      { kind: 'option', option: flat[0] },
      { kind: 'option', option: flat[1] },
      { kind: 'option', option: flat[2] },
    ]);
  });

  it('emits a header row before each group and tags options with groupLabel', () => {
    const rows = flattenOptions(grouped);
    expect(rows).toEqual([
      { kind: 'header', label: 'Fruits' },
      { kind: 'option', option: grouped[0].options[0], groupLabel: 'Fruits' },
      { kind: 'option', option: grouped[0].options[1], groupLabel: 'Fruits' },
      { kind: 'header', label: 'Vegetables' },
      { kind: 'option', option: grouped[1].options[0], groupLabel: 'Vegetables' },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(flattenOptions([] as SelectOptions)).toEqual([]);
  });
});

describe('findOption', () => {
  it('returns the matching option from a flat list', () => {
    expect(findOption(flat, 'b')).toEqual({ value: 'b', label: 'Banana' });
  });

  it('returns the matching option from a grouped list (searches inside groups)', () => {
    expect(findOption(grouped, 'c')).toEqual({ value: 'c', label: 'Carrot' });
  });

  it('returns null when the value is not found', () => {
    expect(findOption(flat, 'zzz')).toBeNull();
    expect(findOption(grouped, 'zzz')).toBeNull();
  });

  it('returns null for an empty input', () => {
    expect(findOption([] as SelectOptions, 'a')).toBeNull();
  });
});

describe('findOptions', () => {
  it('returns matching options preserving the order of options (not the values arg)', () => {
    expect(findOptions(flat, ['b', 'a'])).toEqual([
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ]);
  });

  it('skips values that are not found (no nulls in the result)', () => {
    expect(findOptions(flat, ['a', 'zzz', 'c'])).toEqual([
      { value: 'a', label: 'Apple' },
      { value: 'c', label: 'Cherry', disabled: true },
    ]);
  });

  it('works on grouped lists, preserving option order across groups', () => {
    expect(findOptions(grouped, ['c', 'a'])).toEqual([
      { value: 'a', label: 'Apple' },
      { value: 'c', label: 'Carrot' },
    ]);
  });

  it('returns an empty array when the values arg is empty', () => {
    expect(findOptions(flat, [])).toEqual([]);
  });

  it('returns an empty array for an empty input', () => {
    expect(findOptions([] as SelectOptions, ['a'])).toEqual([]);
  });
});

describe('hasExactLabelMatch', () => {
  it('returns false for empty query', () => {
    expect(hasExactLabelMatch([{ value: 'a', label: 'A' }], '')).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(hasExactLabelMatch([{ value: 'a', label: 'Alpha' }], 'alpha')).toBe(true);
    expect(hasExactLabelMatch([{ value: 'a', label: 'Alpha' }], 'ALPHA')).toBe(true);
  });

  it('requires exact match, not substring', () => {
    expect(hasExactLabelMatch([{ value: 'a', label: 'Alpha' }], 'Alph')).toBe(false);
  });

  it('walks grouped options', () => {
    const opts: SelectGroup[] = [{ label: 'G', options: [{ value: 'a', label: 'Alpha' }] }];
    expect(hasExactLabelMatch(opts, 'alpha')).toBe(true);
  });
});

describe('isCreateRow', () => {
  it('returns true when data has __create: true', () => {
    expect(isCreateRow({ data: { __create: true } })).toBe(true);
  });

  it('returns false for plain options', () => {
    expect(isCreateRow({ data: { id: 'x' } })).toBe(false);
    expect(isCreateRow({})).toBe(false);
  });
});
