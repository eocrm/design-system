import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildThemeTokenCss } from '../packages/design-system/src/app/themeTokens';

/**
 * DS-21: `data-theme` on any element, not only <html>. Resolution is proved in
 * a real browser rather than by reading selectors: the oracle for every case is
 * the ROOT ladder (unchanged and contract-frozen). A subtree themed `t` with
 * accent `a` must resolve every token exactly as `<html data-accent=a
 * data-theme=t>` does, including aliases, which resolve var() where declared.
 */
const read = (path: string) =>
  // The generated files are plain CSS apart from `//` line comments.
  readFileSync(resolve(__dirname, '../packages/design-tokens/generated/web', path), 'utf8').replace(
    /^\s*\/\/.*$/gm,
    '',
  );
const CSS = read('tokens.scss') + read('dark.scss');
const NAMES = [...new Set([...CSS.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]!))];
const ACCENTS = [null, ...new Set([...CSS.matchAll(/data-accent='([a-z]+)'/g)].map((m) => m[1]!))];

type Theme = 'light' | 'dark' | null;

/**
 * Renders `<html data-accent data-theme=root>` with nested `data-theme` divs
 * (outermost first) and returns every token's computed value on each level.
 */
async function resolveChain(page: Page, accent: string | null, root: Theme, chain: Theme[]) {
  return page.evaluate(
    ({ accent, root, chain, names }) => {
      const html = document.documentElement;
      for (const [attr, value] of [
        ['data-accent', accent],
        ['data-theme', root],
      ] as const) {
        if (value) html.setAttribute(attr, value);
        else html.removeAttribute(attr);
      }
      let parent: HTMLElement = document.body;
      parent.replaceChildren();
      const levels: HTMLElement[] = [html];
      for (const theme of chain) {
        const el = document.createElement('div');
        if (theme) el.setAttribute('data-theme', theme);
        parent.appendChild(el);
        levels.push(el);
        parent = el;
      }
      return levels.map((el) => {
        const style = getComputedStyle(el);
        return Object.fromEntries(
          [...names, 'color-scheme'].map((n) => [n, style.getPropertyValue(n).trim()]),
        );
      });
    },
    { accent, root, chain, names: NAMES },
  );
}

const rootValues = async (page: Page, accent: string | null, theme: Theme) =>
  (await resolveChain(page, accent, theme, []))[0]!;

/**
 * `--tooltip-*` have no generated LIGHT value (`null` in tokens.json): light comes
 * from Tooltip.tokens.scss at :root, which this page does not load. Component
 * token files are :root-only, so their aliases resolve against the ROOT theme and
 * do not follow a subtree (known DS-21 limit, see docs/theming.md). Comparing them
 * here would assert a component-layer behaviour this fix does not provide.
 */
const generatorOnly = (values: Record<string, string>, light: Record<string, string>) =>
  Object.fromEntries(Object.entries(values).filter(([name]) => light[name] !== ''));

test.beforeEach(async ({ page }) => {
  await page.setContent(
    `<!doctype html><html><head><style>${CSS}</style></head><body></body></html>`,
  );
});

test('the scan found accents and tokens to check', () => {
  expect(ACCENTS).toContain('ocean');
  expect(NAMES).toEqual(expect.arrayContaining(['--color-accent', '--color-accent-bg-subtle']));
});

for (const accent of ACCENTS) {
  test(`subtree themes resolve like the root ladder — accent ${accent ?? 'default'}`, async ({
    page,
  }) => {
    const rawLight = await rootValues(page, accent, 'light');
    const only = (values: Record<string, string>) => generatorOnly(values, rawLight);
    const light = only(rawLight);
    const dark = only(await rootValues(page, accent, 'dark'));
    // Guards the oracle: the accent must actually differ between themes.
    expect(dark['--color-accent']).not.toBe(light['--color-accent']);

    // DS-21 repro: dark span in a light page.
    const [, darkInLight] = await resolveChain(page, accent, 'light', ['dark']);
    expect(only(darkInLight!)).toEqual(dark);

    // Light inside dark.
    const [, lightInDark] = await resolveChain(page, accent, 'dark', ['light']);
    expect(only(lightInDark!)).toEqual(light);

    // Review Focus 4: light inside dark inside light, and the mirror image.
    const [, mid, inner] = await resolveChain(page, accent, 'light', ['dark', 'light']);
    expect(only(mid!)).toEqual(dark);
    expect(only(inner!)).toEqual(light);
    const [, mid2, inner2] = await resolveChain(page, accent, 'dark', ['light', 'dark']);
    expect(only(mid2!)).toEqual(light);
    expect(only(inner2!)).toEqual(dark);

    // An unthemed child inherits its themed ancestor.
    const [, , plainChild] = await resolveChain(page, accent, 'light', ['dark', null]);
    expect(only(plainChild!)).toEqual(dark);

    // The root itself is untouched by the subtree rules.
    const [rootWithChild] = await resolveChain(page, accent, 'light', ['dark']);
    expect(only(rootWithChild!)).toEqual(light);
  });
}

test('OS dark with no root data-theme: subtree light and dark still resolve', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const accent of ACCENTS) {
    const rawLight = await rootValues(page, accent, 'light');
    const only = (values: Record<string, string>) => generatorOnly(values, rawLight);
    const dark = only(await rootValues(page, accent, 'dark'));
    // The OS block stays root-only: an unattributed root follows the OS.
    expect(only(await rootValues(page, accent, null))).toEqual(dark);
    const [, lightInOsDark] = await resolveChain(page, accent, null, ['light']);
    expect(only(lightInOsDark!)).toEqual(only(rawLight));
    const [, darkInOsDark] = await resolveChain(page, accent, null, ['dark']);
    expect(only(darkInOsDark!)).toEqual(dark);
  }
});

test('consumer ThemeTokens overrides still win inside subtrees', async ({ page }) => {
  const overrides = buildThemeTokenCss(
    { '--color-accent': 'rgb(1, 2, 3)' },
    { '--color-accent': 'rgb(4, 5, 6)' },
  )!;
  // After the library CSS, as <AppProvider> injects it: the root `:root` override
  // ties the library's `:root` and wins on order; every subtree selector must
  // win on specificity alone (the themeTokens unit test pins that).
  await page.setContent(
    `<!doctype html><html><head><style>${CSS}</style><style>${overrides}</style></head><body></body></html>`,
  );
  for (const accent of ACCENTS) {
    const [rootLight, darkSpan, lightInner] = await resolveChain(page, accent, 'light', [
      'dark',
      'light',
    ]);
    expect(rootLight['--color-accent']).toBe('rgb(1, 2, 3)');
    expect(darkSpan['--color-accent']).toBe('rgb(4, 5, 6)');
    expect(lightInner['--color-accent']).toBe('rgb(1, 2, 3)');
    const [rootDark, lightSpan] = await resolveChain(page, accent, 'dark', ['light']);
    expect(rootDark['--color-accent']).toBe('rgb(4, 5, 6)');
    expect(lightSpan['--color-accent']).toBe('rgb(1, 2, 3)');
  }
});
