import {
  isColorKey,
  textColorVar,
  bgColorVar,
  COLOR_KEYS,
  textColorKeyFrom,
  bgColorKeyFrom,
} from './colorMarks';

describe('colorMarks', () => {
  it('lists the default brand colors first, then the palette extras', () => {
    expect(COLOR_KEYS.slice(0, 5)).toEqual(['gray', 'red', 'green', 'amber', 'blue']);
    // The palette extras follow — present, but no second canonical red/green/amber/blue.
    expect(COLOR_KEYS).toContain('coral');
    expect(COLOR_KEYS).toContain('charcoal');
    expect(COLOR_KEYS.filter((k) => k === 'red')).toHaveLength(1);
    expect(COLOR_KEYS.filter((k) => k === 'green')).toHaveLength(1);
    expect(COLOR_KEYS).toHaveLength(31);
  });

  it('resolves the default keys to their semantic tokens', () => {
    expect(textColorVar('gray')).toBe('var(--color-fg-muted)');
    expect(bgColorVar('gray')).toBe('var(--color-bg-muted)');
    expect(textColorVar('red')).toBe('var(--color-danger)');
    expect(bgColorVar('red')).toBe('var(--color-danger-bg-subtle)');
    expect(textColorVar('green')).toBe('var(--color-success)');
    expect(bgColorVar('green')).toBe('var(--color-success-bg-subtle)');
    // The strong variant, not --color-warning: the bare amber is 2.14:1 as text
    // on the editor surface. red/green/blue are legible as text; amber was not.
    expect(textColorVar('amber')).toBe('var(--color-warning-strong)');
    expect(bgColorVar('amber')).toBe('var(--color-warning-bg-subtle)');
    expect(textColorVar('blue')).toBe('var(--color-accent)');
    expect(bgColorVar('blue')).toBe('var(--color-accent-bg-subtle)');
  });

  it('resolves palette-extra keys to the categorical palette tokens', () => {
    expect(textColorVar('coral')).toBe('var(--color-palette-coral-fg)');
    expect(bgColorVar('coral')).toBe('var(--color-palette-coral-bg)');
  });

  it('unknown → undefined', () => {
    expect(textColorVar('mauve')).toBeUndefined();
    expect(isColorKey('mauve')).toBe(false);
    expect(isColorKey('gray')).toBe(true);
    expect(isColorKey('charcoal')).toBe(true);
  });

  it('parses our var() output back to a key', () => {
    expect(textColorKeyFrom('var(--color-danger)')).toBe('red');
    expect(bgColorKeyFrom('var(--color-success-bg-subtle)')).toBe('green');
    expect(textColorKeyFrom('var(--color-palette-coral-fg)')).toBe('coral');
    expect(bgColorKeyFrom('var(--color-palette-coral-bg)')).toBe('coral');
  });

  it('also parses a bare token (no var() wrapper)', () => {
    expect(textColorKeyFrom('--color-fg-muted')).toBe('gray');
    expect(bgColorKeyFrom('--color-warning-bg-subtle')).toBe('amber');
  });

  it('rejects a suffix mismatch (fg-var passed to bgColorKeyFrom)', () => {
    expect(bgColorKeyFrom('var(--color-danger)')).toBeUndefined();
    expect(textColorKeyFrom('var(--color-success-bg-subtle)')).toBeUndefined();
    expect(bgColorKeyFrom('var(--color-palette-coral-fg)')).toBeUndefined();
  });

  it('does not parse palette red/green/amber/blue — those are defaults, not offered as palette', () => {
    expect(textColorKeyFrom('var(--color-palette-red-fg)')).toBeUndefined();
    expect(bgColorKeyFrom('var(--color-palette-blue-bg)')).toBeUndefined();
  });

  it('raw hex / unknown color string → undefined', () => {
    expect(textColorKeyFrom('#de350b')).toBeUndefined();
    expect(bgColorKeyFrom('#de350b')).toBeUndefined();
    expect(bgColorKeyFrom('rgb(1,2,3)')).toBeUndefined();
  });
});
