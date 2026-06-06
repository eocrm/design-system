import { buildThemeTokenCss } from './themeTokens';

describe('buildThemeTokenCss', () => {
  it('returns null when there is nothing to emit', () => {
    expect(buildThemeTokenCss()).toBeNull();
    expect(buildThemeTokenCss({}, {})).toBeNull();
    expect(buildThemeTokenCss(undefined, undefined)).toBeNull();
  });

  it('emits light + dark scopes for a base tokens map (applies to both themes)', () => {
    const css = buildThemeTokenCss({ '--color-accent': '#7c3aed' })!;
    expect(css).toContain(':root {\n  --color-accent: #7c3aed;\n}');
    expect(css).toContain(":root[data-theme='dark'] {\n  --color-accent: #7c3aed;\n}");
    expect(css).toContain('@media (prefers-color-scheme: dark) {');
    expect(css).toContain("  :root:not([data-theme='light']) {\n    --color-accent: #7c3aed;\n  }");
  });

  it('layers darkTokens AFTER tokens within the dark scopes (override wins)', () => {
    const css = buildThemeTokenCss(
      { '--color-accent': '#7c3aed' },
      { '--color-accent': '#a78bfa' },
    )!;
    const darkBlock = css.slice(css.indexOf("[data-theme='dark']"));
    const base = darkBlock.indexOf('#7c3aed');
    const override = darkBlock.indexOf('#a78bfa');
    expect(base).toBeGreaterThan(-1);
    expect(override).toBeGreaterThan(base);
  });

  it('omits the plain :root block when only darkTokens is given', () => {
    const css = buildThemeTokenCss(undefined, { '--color-accent': '#a78bfa' })!;
    expect(css.startsWith(':root {')).toBe(false);
    expect(css).toContain("[data-theme='dark']");
    expect(css).toContain('--color-accent: #a78bfa;');
  });

  it('drops entries whose key is not a valid custom property (no -- prefix / bad chars)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const css = buildThemeTokenCss({
      'color-accent': '#7c3aed',
      '--bad name': 'red',
      '--ok': 'blue',
    } as never);
    expect(css).toContain('--ok: blue;');
    expect(css).not.toContain('color-accent: #7c3aed');
    expect(css).not.toContain('--bad name');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('drops values containing CSS/HTML breakout characters ({ } < >)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const css = buildThemeTokenCss({ '--x': 'red} body{display:none', '--y': 'blue' } as never);
    expect(css).not.toContain('display:none');
    expect(css).toContain('--y: blue;');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('preserves complex valid values verbatim (rgb-alpha, font stack, shadow, calc)', () => {
    const css = buildThemeTokenCss({
      '--ring-accent': 'rgb(87 157 255 / 65%)',
      '--font-family-sans': "'Inter', system-ui, sans-serif",
      '--shadow-sm': '0 1px 2px rgb(0 0 0 / 40%)',
      '--measure-md': 'calc(100% - 8px)',
    })!;
    expect(css).toContain('--ring-accent: rgb(87 157 255 / 65%);');
    expect(css).toContain("--font-family-sans: 'Inter', system-ui, sans-serif;");
    expect(css).toContain('--shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);');
    expect(css).toContain('--measure-md: calc(100% - 8px);');
  });
});
