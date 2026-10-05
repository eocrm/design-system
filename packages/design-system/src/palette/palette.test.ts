import { PALETTE_COLORS, paletteTokens } from './palette';

it('PALETTE_COLORS contains no duplicates', () => {
  const set = new Set<string>(PALETTE_COLORS);
  expect(set.size).toBe(PALETTE_COLORS.length);
});

it('paletteTokens returns var() strings for bg and fg', () => {
  expect(paletteTokens('red')).toEqual({
    bg: 'var(--color-palette-red-bg)',
    fg: 'var(--color-palette-red-fg)',
  });
});

it('paletteTokens uses the color name verbatim in the token path', () => {
  expect(paletteTokens('charcoal')).toEqual({
    bg: 'var(--color-palette-charcoal-bg)',
    fg: 'var(--color-palette-charcoal-fg)',
  });
  expect(paletteTokens('lavender')).toEqual({
    bg: 'var(--color-palette-lavender-bg)',
    fg: 'var(--color-palette-lavender-fg)',
  });
});

it('every PALETTE_COLORS entry round-trips through paletteTokens', () => {
  for (const color of PALETTE_COLORS) {
    const { bg, fg } = paletteTokens(color);
    expect(bg).toBe(`var(--color-palette-${color}-bg)`);
    expect(fg).toBe(`var(--color-palette-${color}-fg)`);
  }
});
