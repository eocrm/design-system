import {
  isColorKey,
  textColorVar,
  bgColorVar,
  COLOR_KEYS,
  textColorKeyFrom,
  bgColorKeyFrom,
} from './colorMarks';
import { PALETTE_COLORS } from '../../../palette';

describe('colorMarks', () => {
  it('lists the full palette in order', () => {
    expect(COLOR_KEYS).toEqual(PALETTE_COLORS);
    expect(COLOR_KEYS).toHaveLength(30);
    expect(COLOR_KEYS[0]).toBe('red');
    expect(COLOR_KEYS[COLOR_KEYS.length - 1]).toBe('charcoal');
  });

  it('resolves vars to the palette fg/bg tokens', () => {
    expect(textColorVar('red')).toBe('var(--color-palette-red-fg)');
    expect(bgColorVar('red')).toBe('var(--color-palette-red-bg)');
  });

  it('unknown → undefined', () => {
    expect(textColorVar('mauve')).toBeUndefined();
    expect(isColorKey('mauve')).toBe(false);
    expect(isColorKey('charcoal')).toBe(true);
  });

  it('parses our var() output back to a key', () => {
    expect(textColorKeyFrom('var(--color-palette-blue-fg)')).toBe('blue');
    expect(bgColorKeyFrom('var(--color-palette-green-bg)')).toBe('green');
  });

  it('rejects a suffix mismatch (fg-var passed to bgColorKeyFrom)', () => {
    expect(bgColorKeyFrom('var(--color-palette-blue-fg)')).toBeUndefined();
    expect(textColorKeyFrom('var(--color-palette-green-bg)')).toBeUndefined();
  });

  it('raw hex / unknown color string → undefined', () => {
    expect(textColorKeyFrom('#de350b')).toBeUndefined();
    expect(bgColorKeyFrom('#de350b')).toBeUndefined();
    expect(bgColorKeyFrom('rgb(1,2,3)')).toBeUndefined();
  });
});
