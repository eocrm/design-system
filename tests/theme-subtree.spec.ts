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
const NAMES = [
  ...new Set([...CSS.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]!)),
  '--color-link-fg',
];
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
 * from Tooltip.tokens.scss, which this generated-CSS-only page does not load, so
 * they are compared in the component test below instead.
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
    // An alias of the overridden token follows it in the subtree exactly as it
    // does on a root of that theme (an accent may pin --color-link-fg to a literal).
    expect(darkSpan['--color-link-fg']).toBe(rootDark['--color-link-fg']);
    expect(lightSpan['--color-link-fg']).toBe(rootLight['--color-link-fg']);
    if (accent === null) expect(darkSpan['--color-link-fg']).toBe('rgb(4, 5, 6)');
  }
});

/**
 * Components follow a subtree too: component token files pair `:root` with
 * `:where(:root [data-theme='light'], :root [data-theme='dark'])`, so their
 * aliases re-resolve on the subtree element. Runs on a real playground route so the shipped library CSS (generated
 * tokens plus component token files) is what resolves.
 */
const COMPONENT_TOKENS = [
  '--button-bg',
  '--button-bg-hover',
  '--button-fg',
  '--badge-bg-info',
  '--badge-fg-info',
  '--tooltip-bg',
  '--tooltip-fg',
];

test('component tokens resolve like the root ladder inside subtrees', async ({ page }) => {
  await page.goto('/components/button');
  await expect(page.getByRole('button', { name: 'Primary', exact: true }).first()).toBeVisible();
  const results = await page.evaluate(
    ({ accents, names }) => {
      const html = document.documentElement;
      const read = (el: Element) => {
        const style = getComputedStyle(el);
        return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
      };
      const set = (el: Element, attr: string, value: string | null) =>
        value ? el.setAttribute(attr, value) : el.removeAttribute(attr);
      const outer = document.body.appendChild(document.createElement('div'));
      const inner = outer.appendChild(document.createElement('div'));
      return accents.map((accent) => {
        set(html, 'data-accent', accent);
        set(outer, 'data-theme', null);
        set(inner, 'data-theme', null);
        set(html, 'data-theme', 'light');
        const light = read(html);
        set(html, 'data-theme', 'dark');
        const dark = read(html);
        const lightInDark = (set(outer, 'data-theme', 'light'), read(outer));
        set(html, 'data-theme', 'light');
        const darkInLight = (set(outer, 'data-theme', 'dark'), read(outer));
        const lightInDarkInLight = (set(inner, 'data-theme', 'light'), read(inner));
        return { accent, light, dark, lightInDark, darkInLight, lightInDarkInLight };
      });
    },
    { accents: ACCENTS, names: COMPONENT_TOKENS },
  );
  for (const r of results) {
    expect(r.light['--button-bg'], `${r.accent}`).not.toBe('');
    expect(r.light['--badge-bg-info'], `${r.accent}`).not.toBe('');
    expect(r.dark['--button-bg'], `${r.accent}`).not.toBe(r.light['--button-bg']);
    expect(r.darkInLight, `dark in light, ${r.accent}`).toEqual(r.dark);
    expect(r.lightInDark, `light in dark, ${r.accent}`).toEqual(r.light);
    expect(r.lightInDarkInLight, `light in dark in light, ${r.accent}`).toEqual(r.light);
  }
});

// Only the library's own theme values re-theme a subtree: a third-party widget
// that stamps its own `data-theme` (daisyUI's "cupcake") must inherit the page's
// component tokens, not have them reset to the light base.
test('a foreign data-theme value inherits the page theme', async ({ page }) => {
  await page.goto('/components/funnel-chart');
  const names = [
    '--button-bg',
    '--button-fg',
    '--funnel-chart-ramp-target',
    '--funnel-chart-ramp-max-mix',
  ];
  const { dark, cupcake, light } = await page.evaluate((names) => {
    const read = (el: Element) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
    };
    const html = document.documentElement;
    html.setAttribute('data-theme', 'light');
    const light = read(html);
    html.setAttribute('data-theme', 'dark');
    const widget = document.body.appendChild(document.createElement('div'));
    widget.setAttribute('data-theme', 'cupcake');
    return { dark: read(html), cupcake: read(widget), light };
  }, names);
  for (const n of names) expect(dark[n], n).not.toBe('');
  // Guards the oracle: the ramp differs between themes, so a reset would show.
  expect(dark['--funnel-chart-ramp-max-mix']).not.toBe(light['--funnel-chart-ramp-max-mix']);
  expect(cupcake).toEqual(dark);
});
