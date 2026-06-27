import {
  isColorKey,
  textColorVar,
  bgColorVar,
  COLOR_KEYS,
  textColorKeyFrom,
  bgColorKeyFrom,
} from './colorMarks';

describe('colorMarks', () => {
  it('lists keys', () => expect(COLOR_KEYS).toEqual(['gray', 'red', 'green', 'amber', 'blue']));

  it('resolves vars', () => {
    expect(textColorVar('red')).toBe('var(--color-danger)');
    expect(bgColorVar('red')).toBe('var(--color-danger-bg-subtle)');
  });

  it('unknown → undefined', () => {
    expect(textColorVar('mauve')).toBeUndefined();
    expect(isColorKey('mauve')).toBe(false);
    expect(isColorKey('blue')).toBe(true);
  });

  it('parses our var() output back to a key', () => {
    expect(textColorKeyFrom('var(--color-danger)')).toBe('red');
    expect(bgColorKeyFrom('var(--color-success-bg-subtle)')).toBe('green');
  });

  it('parses default-theme hex back to a key (case-insensitive)', () => {
    expect(textColorKeyFrom('#DE350B')).toBe('red');
    expect(bgColorKeyFrom('#ffebe6')).toBe('red');
  });

  it('unknown color string → undefined', () => {
    expect(textColorKeyFrom('#123456')).toBeUndefined();
    expect(bgColorKeyFrom('rgb(1,2,3)')).toBeUndefined();
  });
});
