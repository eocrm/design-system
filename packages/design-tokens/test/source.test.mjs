import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { captureWebContractFromSources } from '../scripts/capture-web-contract.mjs';
import { compareWebContracts, parseGeneratedWebContract } from '../scripts/check-web-compat.mjs';
import { loadTokenDocument } from '../scripts/lib/load-tokens.mjs';
import { resolveTokenValue } from '../scripts/lib/validate-tokens.mjs';

const tokenSourcePath = new URL('../src/tokens.json', import.meta.url);
const fixturePath = new URL('./fixtures/current-web-contract.json', import.meta.url);
const badgeTokenPath = new URL(
  '../../design-system/src/components/Badge/Badge.tokens.scss',
  import.meta.url,
);
const generatedTokensPath = new URL('../generated/web/tokens.scss', import.meta.url);
const generatedDarkPath = new URL('../generated/web/dark.scss', import.meta.url);
const expectedComposeInventory = {
  colors: [
    'color.accent',
    'color.accent.background.subtle',
    'color.accent.foreground',
    'color.accent.hover',
    'color.accent.pressed',
    'color.accent.subtle.background',
    'color.background',
    'color.background.danger.subtle',
    'color.background.muted',
    'color.background.subtle',
    'color.background.sunken',
    'color.border',
    'color.border.strong',
    'color.danger',
    'color.danger.background.subtle',
    'color.danger.foreground',
    'color.danger.hover',
    'color.foreground',
    'color.foreground.disabled',
    'color.foreground.muted',
    'color.foreground.subtle',
    'color.info',
    'color.info.background.subtle',
    'color.success',
    'color.success.background.subtle',
    'color.success.foreground',
    'color.success.hover',
    'color.warning',
    'color.warning.background.subtle',
    'color.warning.foreground',
    'color.warning.strong',
  ],
  dimensions: [
    'border.width.default',
    'border.width.emphasis',
    'border.width.strong',
    'radius.full',
    'radius.large',
    'radius.medium',
    'radius.small',
    'ring.width',
    'size.control.large',
    'size.control.medium',
    'size.control.small',
    'size.control.xlarge',
    'size.control.xsmall',
    'space.0',
    'space.05',
    'space.1',
    'space.10',
    'space.12',
    'space.16',
    'space.2',
    'space.3',
    'space.4',
    'space.5',
    'space.6',
    'space.8',
  ],
  typography: [
    'font.size.2xlarge',
    'font.size.3xlarge',
    'font.size.large',
    'font.size.medium',
    'font.size.small',
    'font.size.xlarge',
    'font.size.xsmall',
    'font.weight.bold',
    'font.weight.medium',
    'font.weight.regular',
    'font.weight.semibold',
    'line.height.none',
    'line.height.normal',
    'line.height.tight',
  ],
  semanticTones: [
    'tone.danger.background',
    'tone.danger.foreground',
    'tone.info.background',
    'tone.info.foreground',
    'tone.neutral.background',
    'tone.neutral.foreground',
    'tone.purple.background',
    'tone.purple.foreground',
    'tone.success.background',
    'tone.success.foreground',
    'tone.warning.background',
    'tone.warning.foreground',
  ],
  avatarPalette: [
    'avatar.foreground',
    'avatar.palette.1',
    'avatar.palette.2',
    'avatar.palette.3',
    'avatar.palette.4',
    'avatar.palette.5',
    'avatar.palette.6',
  ],
  categoricalPalette: [
    'palette.amber.background',
    'palette.amber.foreground',
    'palette.blue.background',
    'palette.blue.foreground',
    'palette.brown.background',
    'palette.brown.foreground',
    'palette.charcoal.background',
    'palette.charcoal.foreground',
    'palette.coral.background',
    'palette.coral.foreground',
    'palette.cyan.background',
    'palette.cyan.foreground',
    'palette.emerald.background',
    'palette.emerald.foreground',
    'palette.fuchsia.background',
    'palette.fuchsia.foreground',
    'palette.gold.background',
    'palette.gold.foreground',
    'palette.green.background',
    'palette.green.foreground',
    'palette.indigo.background',
    'palette.indigo.foreground',
    'palette.lavender.background',
    'palette.lavender.foreground',
    'palette.lime.background',
    'palette.lime.foreground',
    'palette.magenta.background',
    'palette.magenta.foreground',
    'palette.mint.background',
    'palette.mint.foreground',
    'palette.navy.background',
    'palette.navy.foreground',
    'palette.olive.background',
    'palette.olive.foreground',
    'palette.orange.background',
    'palette.orange.foreground',
    'palette.pink.background',
    'palette.pink.foreground',
    'palette.plum.background',
    'palette.plum.foreground',
    'palette.purple.background',
    'palette.purple.foreground',
    'palette.red.background',
    'palette.red.foreground',
    'palette.rose.background',
    'palette.rose.foreground',
    'palette.sky.background',
    'palette.sky.foreground',
    'palette.slate.background',
    'palette.slate.foreground',
    'palette.stone.background',
    'palette.stone.foreground',
    'palette.taupe.background',
    'palette.taupe.foreground',
    'palette.teal.background',
    'palette.teal.foreground',
    'palette.violet.background',
    'palette.violet.foreground',
    'palette.yellow.background',
    'palette.yellow.foreground',
  ],
};
const expectedDeprecatedBadgeAliases = {
  'deprecated.badge.danger.background': {
    target: 'tone.danger.background',
    web: '--color-badge-danger-bg',
  },
  'deprecated.badge.danger.foreground': {
    target: 'tone.danger.foreground',
    web: '--color-badge-danger-fg',
  },
  'deprecated.badge.info.background': {
    target: 'tone.info.background',
    web: '--color-badge-info-bg',
  },
  'deprecated.badge.info.foreground': {
    target: 'tone.info.foreground',
    web: '--color-badge-info-fg',
  },
  'deprecated.badge.neutral.background': {
    target: 'tone.neutral.background',
    web: '--color-badge-neutral-bg',
  },
  'deprecated.badge.neutral.foreground': {
    target: 'tone.neutral.foreground',
    web: '--color-badge-neutral-fg',
  },
  'deprecated.badge.purple.background': {
    target: 'tone.purple.background',
    web: '--color-badge-purple-bg',
  },
  'deprecated.badge.purple.foreground': {
    target: 'tone.purple.foreground',
    web: '--color-badge-purple-fg',
  },
  'deprecated.badge.success.background': {
    target: 'tone.success.background',
    web: '--color-badge-success-bg',
  },
  'deprecated.badge.success.foreground': {
    target: 'tone.success.foreground',
    web: '--color-badge-success-fg',
  },
  'deprecated.badge.warning.background': {
    target: 'tone.warning.background',
    web: '--color-badge-warning-bg',
  },
  'deprecated.badge.warning.foreground': {
    target: 'tone.warning.foreground',
    web: '--color-badge-warning-fg',
  },
};

test('loads the authoritative source with representative shared values', async () => {
  const tokens = await loadTokenDocument(tokenSourcePath);

  assert.equal(resolveTokenValue(tokens, 'color.background', 'light'), '#ffffff');
  assert.equal(resolveTokenValue(tokens, 'color.background', 'dark'), '#1d2125');
  assert.equal(resolveTokenValue(tokens, 'space.4', 'light'), '16px');
  assert.equal(resolveTokenValue(tokens, 'radius.medium', 'light'), '4px');
  assert.equal(resolveTokenValue(tokens, 'palette.red.background', 'dark'), '#482219');
  assert.equal(resolveTokenValue(tokens, 'size.control.medium', 'light'), '32px');
});

test('keeps every avatar background readable against the avatar foreground', async () => {
  const tokens = await loadTokenDocument(tokenSourcePath);
  const foreground = resolveTokenValue(tokens, 'avatar.foreground', 'light');
  const failures = tokens.tokens
    .filter(({ id }) => /^avatar\.palette\.\d+$/.test(id))
    .map(({ id }) => {
      const background = resolveTokenValue(tokens, id, 'light');
      return { id, ratio: contrastRatio(foreground, background) };
    })
    .filter(({ ratio }) => ratio < 4.5)
    .map(({ id, ratio }) => `${id}: ${ratio.toFixed(2)}:1`);

  assert.deepEqual(failures, [], `Avatar contrast below 4.5:1:\n${failures.join('\n')}`);
});

test('maps every captured public variable to exactly one web output', async () => {
  const [tokens, fixture, badgeSource] = await Promise.all([
    loadTokenDocument(tokenSourcePath),
    readJson(fixturePath),
    readFile(badgeTokenPath, 'utf8'),
  ]);
  const capturedNames = new Set(
    ['light', 'forcedDark', 'systemDark', 'forcedLight'].flatMap((scope) =>
      Object.keys(fixture[scope]),
    ),
  );
  const webNames = tokens.tokens.flatMap((token) => token.outputs.web?.name ?? []);
  const componentNames = new Set(
    [...badgeSource.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(([, name]) => name),
  );
  const duplicateNames = webNames.filter((name) => componentNames.has(name));
  const combinedNames = new Set([...webNames, ...componentNames]);

  // +2 from #504: --color-bg-hover and --color-bg-muted-hover.
  assert.equal(capturedNames.size, 306);
  assert.equal(webNames.length, 250);
  assert.equal(componentNames.size, 56);
  assert.deepEqual(duplicateNames, []);
  assert.deepEqual([...combinedNames].sort(), [...capturedNames].sort());
});

test('keeps Badge variables component-owned while preserving the combined web contract', async () => {
  const [tokens, fixture, badgeSource, generatedTokens, generatedDark] = await Promise.all([
    loadTokenDocument(tokenSourcePath),
    readJson(fixturePath),
    readFile(badgeTokenPath, 'utf8'),
    readFile(generatedTokensPath, 'utf8'),
    readFile(generatedDarkPath, 'utf8'),
  ]);
  const generatedBadgeNames = tokens.tokens
    .map((token) => token.outputs.web?.name)
    .filter((name) => name?.startsWith('--badge-'));
  const componentNames = new Set(
    [...badgeSource.matchAll(/^\s*(--badge-[a-z0-9-]+):/gm)].map(([, name]) => name),
  );
  const requiredBadgeNames = Object.keys(fixture.light)
    .filter((name) => name.startsWith('--badge-'))
    .sort();

  assert.deepEqual(generatedBadgeNames, []);
  assert.deepEqual([...componentNames].sort(), requiredBadgeNames);
  assert.deepEqual(
    compareWebContracts(
      fixture,
      parseGeneratedWebContract(generatedTokens, generatedDark, badgeSource),
    ),
    { missing: [], extra: [], changed: [] },
  );
});

test('reconstructs every neutral declaration value and scope from the dataset', async () => {
  const [tokens, fixture, badgeSource] = await Promise.all([
    loadTokenDocument(tokenSourcePath),
    readJson(fixturePath),
    readFile(badgeTokenPath, 'utf8'),
  ]);
  const componentNames = new Set(
    [...badgeSource.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(([, name]) => name),
  );
  const neutralFixture = Object.fromEntries(
    ['light', 'forcedDark', 'systemDark', 'forcedLight'].map((scope) => [
      scope,
      Object.fromEntries(
        Object.entries(fixture[scope]).filter(([name]) => !componentNames.has(name)),
      ),
    ]),
  );

  assert.deepEqual(projectWebContract(tokens), neutralFixture);
});

test('matches the independently authored Compose inventory exactly', async () => {
  const tokens = await loadTokenDocument(tokenSourcePath);
  const actualInventory = Object.fromEntries(
    Object.keys(expectedComposeInventory).map((group) => [
      group,
      tokens.tokens
        .filter((token) => token.outputs.compose?.group === group)
        .map((token) => token.id)
        .sort(compareCodeUnits),
    ]),
  );

  assert.deepEqual(actualInventory, expectedComposeInventory);
  assert.equal(Object.values(actualInventory).flat().length, 149);
});

test('keeps all twelve deprecated Badge variables as component aliases', async () => {
  const badgeSource = await readFile(badgeTokenPath, 'utf8');
  const declarations = new Map(
    [...badgeSource.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
  const deprecatedNames = [...declarations.keys()].filter((name) =>
    name.startsWith('--color-badge-'),
  );

  assert.equal(deprecatedNames.length, 12);
  for (const [id, expected] of Object.entries(expectedDeprecatedBadgeAliases)) {
    const [, tone, role] = id.match(/^deprecated\.badge\.([^.]+)\.(background|foreground)$/);
    const target = `--badge-${role === 'background' ? 'bg' : 'fg'}-${tone}`;
    assert.equal(declarations.get(expected.web), `var(${target})`, id);
  }
});

test('preserves the pre-migration web contract fixture with provenance and expanded dark scopes', async () => {
  const fixture = await readJson(fixturePath);

  assert.equal(Object.keys(fixture.light).length, 303);
  assert.equal(Object.keys(fixture.forcedDark).length, 118);
  assert.deepEqual(fixture.systemDark, fixture.forcedDark);
  assert.deepEqual(fixture.forcedLight, {});
  // Provenance now names the GENERATED files, because capture-web-contract.mjs
  // reads them. It used to name packages/design-system/src/styles/*.scss with a
  // `mixin: 'dark-tokens'` origin — but that stopped being true when those files
  // became bare `@forward`s, and the script had been throwing ever since, so the
  // fixture was hand-edited and this assertion pinned a layout nothing produced.
  // The four VALUE scopes came through the repair byte-identical, which is what
  // says the hand-maintained fixture had not drifted; only these origins moved.
  assert.deepEqual(fixture.provenance.forcedDark['--color-bg'], [
    {
      source: 'packages/design-tokens/generated/web/dark.scss',
      selector: ":root[data-theme='dark']",
    },
  ]);
  assert.deepEqual(fixture.provenance.systemDark['--color-bg'], [
    {
      source: 'packages/design-tokens/generated/web/dark.scss',
      selector: ":root:not([data-theme='light'])",
      atRule: '@media (prefers-color-scheme: dark)',
    },
  ]);
});

test('rejects conflicting declarations in the same output scope', () => {
  assert.throws(
    () =>
      captureWebContractFromSources({
        tokens: {
          source: 'tokens.scss',
          content: ':root { --color-example: #ffffff; }',
        },
        badge: {
          source: 'Badge.tokens.scss',
          content: ':root { --color-example: #000000; }',
        },
        dark: {
          source: 'dark.scss',
          content: `
        @mixin dark-tokens { --color-example: #111111; }
        :root[data-theme='dark'] { @include dark-tokens; }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme='light']) { @include dark-tokens; }
        }
        :root[data-theme='light'] { color-scheme: light; }
      `,
        },
      }),
    /conflicting declaration --color-example in light/,
  );
});

test('captures direct custom properties in every dark-theme selector', () => {
  const contract = captureWebContractFromSources({
    tokens: {
      source: 'tokens.scss',
      content: ':root { --color-example: #ffffff; }',
    },
    badge: {
      source: 'Badge.tokens.scss',
      content: ':root { --badge-example: 1px; }',
    },
    dark: {
      source: 'dark.scss',
      content: `
        @mixin dark-tokens { --color-example: #111111; }
        :root[data-theme='dark'] {
          --direct-dark: dark;
          @include dark-tokens;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme='light']) {
            --direct-system: system;
            @include dark-tokens;
          }
        }
        :root[data-theme='light'] { --direct-light: light; }
      `,
    },
  });

  assert.equal(contract.forcedDark['--direct-dark'], 'dark');
  assert.equal(contract.systemDark['--direct-system'], 'system');
  assert.equal(contract.forcedLight['--direct-light'], 'light');
  assert.deepEqual(contract.provenance.forcedLight['--direct-light'], [
    {
      source: 'dark.scss',
      selector: ":root[data-theme='light']",
    },
  ]);
});

test('preserves comment-like text inside quoted declaration values', () => {
  const contract = captureWebContractFromSources({
    tokens: {
      source: 'tokens.scss',
      content: `
        :root {
          --asset-url: 'https://example.test/token.svg';
          --comment-text: '/* retained */';
        }
      `,
    },
    badge: {
      source: 'Badge.tokens.scss',
      content: ':root { --badge-example: 1px; }',
    },
    dark: {
      source: 'dark.scss',
      content: `
        @mixin dark-tokens { --color-example: #111111; }
        :root[data-theme='dark'] { @include dark-tokens; }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme='light']) { @include dark-tokens; }
        }
        :root[data-theme='light'] { color-scheme: light; }
      `,
    },
  });

  assert.equal(contract.light['--asset-url'], "'https://example.test/token.svg'");
  assert.equal(contract.light['--comment-text'], "'/* retained */'");
});

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function projectWebContract(document) {
  const webNameById = new Map(document.tokens.map((token) => [token.id, token.outputs.web?.name]));
  const light = {};
  const dark = {};

  for (const token of document.tokens) {
    const name = token.outputs.web?.name;
    if (!name) continue;
    const lightValue = emitValue(selectTheme(token.value, 'light'), webNameById);
    const darkValue = emitValue(selectTheme(token.value, 'dark'), webNameById);
    if (lightValue !== undefined) light[name] = lightValue;
    if (darkValue !== lightValue) dark[name] = darkValue;
  }

  return {
    light: sortObject(light),
    forcedDark: sortObject(dark),
    systemDark: sortObject(dark),
    forcedLight: {},
  };
}

function selectTheme(value, theme) {
  return value !== null && typeof value === 'object' && 'light' in value ? value[theme] : value;
}

function emitValue(value, webNameById) {
  if (value === null) return undefined;
  if (value !== null && typeof value === 'object' && 'alias' in value) {
    const name = webNameById.get(value.alias);
    assert.ok(name, `web alias ${value.alias} must target a web output`);
    return `var(${name})`;
  }
  return String(value);
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    }),
  );
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function contrastRatio(left, right) {
  const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => linearizeSrgbChannel(Number.parseInt(channel, 16)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function linearizeSrgbChannel(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

// The invariant the Badge dark-block deletion actually rests on, which nothing
// asserted before or after it. Removing that block was justified by "custom
// properties resolve at use time, so the `:root` alias already follows the
// theme" — a claim the contract fixture cannot express, because it records
// DECLARATIONS per scope rather than resolved values. So it was checked by
// reading, which is how the four stale ratios in #484 survived thirteen review
// rounds.
//
// Resolving proves it directly: each of the twelve TONE-BACKED `--badge-*`
// variables follows its var() chain to a literal in each theme, and the two
// literals must DIFFER. The other 32 `--badge-*` are dimensions, radii and
// font weights that resolve to no colour at all and are out of scope here. If someone re-points Badge at a token that does not self-theme, dark
// silently collapses onto the light value and this fails.
test('every tone-backed Badge variable resolves per theme through its var() chain', async () => {
  const [badgeSource, generatedTokens, generatedDark] = await Promise.all([
    readFile(badgeTokenPath, 'utf8'),
    readFile(generatedTokensPath, 'utf8'),
    readFile(generatedDarkPath, 'utf8'),
  ]);

  // Only the `:root[data-theme='dark']` block of dark.scss — that file also
  // holds a `:root[data-theme='light']` block, so taking the first match in the
  // whole file was correct only because the generator emits dark first.
  const DARK_SELECTOR = `:root[data-theme=${"'"}dark${"'"}]`;
  const darkBlock = (() => {
    const start = generatedDark.indexOf(DARK_SELECTOR);
    assert.ok(start >= 0, `dark.scss has no ${DARK_SELECTOR} block`);
    const open = generatedDark.indexOf('{', start);
    let depth = 1;
    for (let i = open + 1; i < generatedDark.length; i += 1) {
      if (generatedDark[i] === '{') depth += 1;
      else if (generatedDark[i] === '}') {
        depth -= 1;
        if (depth === 0) return generatedDark.slice(open + 1, i);
      }
    }
    throw new Error('dark.scss dark block is unterminated');
  })();

  const resolve = (name, dark, seen = []) => {
    if (seen.includes(name)) return undefined;
    for (const source of dark
      ? [darkBlock, generatedTokens, badgeSource]
      : [generatedTokens, badgeSource]) {
      const match = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;\\n]+);`, 'm').exec(source);
      if (!match) continue;
      const raw = match[1].trim();
      if (raw.startsWith('var('))
        return resolve(raw.slice(4, -1).split(',')[0].trim(), dark, [...seen, name]);
      return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : undefined;
    }
    return undefined;
  };

  const toneBacked = [
    ...badgeSource.matchAll(/^\s*(--badge-[a-z0-9-]+):\s*var\((--color-tone-[a-z0-9-]+)\)/gm),
  ];
  assert.equal(toneBacked.length, 12, 'expected the 12 tone-backed Badge variables');

  const collapsed = [];
  for (const [, name] of toneBacked) {
    const [light, dark] = [resolve(name, false), resolve(name, true)];
    assert.match(light ?? '', /^#[0-9a-f]{6}$/, `${name} resolves in light`);
    assert.match(dark ?? '', /^#[0-9a-f]{6}$/, `${name} resolves in dark`);
    if (light === dark) collapsed.push(`${name} (${light})`);
  }
  assert.deepEqual(
    collapsed,
    [],
    'these resolve identically in both themes — the :root alias is NOT following the theme, so deleting the dark block did change behaviour',
  );
});

// #508. The web contract reads exactly ONE component token file — Badge — and
// the other 80 have no coverage at all. Badge is named there for a reason that
// expired: it was the one component declaring literal per-theme hexes, so it was
// the one that could drift, and #490 aliased those onto the self-theming
// `--color-tone-*` scale. The mechanism stayed pointed at the file that no
// longer needs it.
//
// Widening the DECLARATION fixture to 81 files was the obvious move and is the
// wrong one: it would add ~300 keys of hand-maintained snapshot that a new
// component satisfies by being listed, which is satisfying-by-existing rather
// than satisfying-an-invariant. What actually guards the gap is the shape #507
// used for Badge — assert the property directly — so it is generalised here
// instead, and stated as two invariants rather than a list of names.
//
// Neither of these is live today: all 81 files pass as written. They guard the
// NEXT component, which is the whole point — the failure mode is a new file, and
// a fixture cannot fail on a file nobody added to it.
const componentsDir = new URL('../../design-system/src/components/', import.meta.url);

async function readComponentTokenFiles() {
  const dirs = (await readdir(componentsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name);
  const files = [];
  for (const dir of dirs) {
    const dirUrl = new URL(`${dir}/`, componentsDir);
    for (const name of await readdir(dirUrl)) {
      if (!name.endsWith('.tokens.scss')) continue;
      files.push({
        path: `${dir}/${name}`,
        content: stripScssComments(await readFile(new URL(name, dirUrl), 'utf8')),
      });
    }
  }
  return files.sort((left, right) => (left.path < right.path ? -1 : 1));
}

// Comment bodies mention token names and example values freely, and both checks
// below would read those as declarations. The capture script strips comments for
// the same reason; this is the same job on a much smaller input.
function stripScssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

test('no component token file declares an opaque colour literal', async () => {
  const files = await readComponentTokenFiles();
  // Guards the guard: a moved directory would make this vacuously pass.
  assert.ok(files.length >= 81, `expected the component token files, found ${files.length}`);

  // OPAQUE is the operative word, and it is what makes this derivable instead of
  // an allowlist. An opaque literal is a per-theme decision frozen into one
  // value: ship `#0052cc` in a `:root` block with no dark block and the light
  // value renders in dark theme, silently — the exact hole this closes, and one
  // neither existing gate sees. structure.test.ts's token-shadowing gate only
  // fires when a literal DUPLICATES a semantic token's value, and the @contrast
  // gate only fires on a stated ratio that has rotted.
  //
  // Translucent literals are permitted and six exist (Lightbox controls and
  // caption, MediaTile scrim). They are not an exception being waved through:
  // they composite over whatever is behind them, and both components paint onto
  // their own dark scrim rather than onto a themed surface, so they are
  // theme-independent by construction. Alpha is the property that makes that
  // true, so alpha is what the rule keys on — no component names appear here.
  const offenders = [];
  for (const { path, content } of files) {
    for (const [, name, value] of content.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;\n]+);/gm)) {
      const raw = value.trim();
      const isHex = /^#[0-9a-f]{3,8}$/i.test(raw);
      const isOpaqueFunction =
        /^(rgb|hsl|hwb|lab|lch|oklab|oklch)\(/i.test(raw) && !raw.includes('/');
      if (isHex || isOpaqueFunction) offenders.push(`${path}: ${name}: ${raw}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'component tokens must reach colour through var() so the value follows the theme',
  );
});

test('every var() a component token file reaches for is actually declared', async () => {
  const files = await readComponentTokenFiles();
  const [generatedTokens, generatedDark] = await Promise.all([
    readFile(generatedTokensPath, 'utf8'),
    readFile(generatedDarkPath, 'utf8'),
  ]);

  // Everything a component token may legally resolve through: the generated
  // light and dark scopes, and every other component file (components do alias
  // each other's tokens). Collected as declared NAMES — this asserts the chain
  // terminates, not what it terminates in; the per-theme VALUE question is the
  // Badge resolve test above, which this deliberately does not duplicate.
  const declared = new Set();
  for (const source of [generatedTokens, generatedDark, ...files.map((file) => file.content)]) {
    for (const [, name] of source.matchAll(/(--[a-z0-9-]+)\s*:/g)) declared.add(name);
  }

  const dangling = [];
  for (const { path, content } of files) {
    for (const [, reference, fallback] of content.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,)?/g)) {
      // A fallback makes an undeclared name legal by design — that is the whole
      // point of the second argument, and several components use it for values
      // the component sets inline at runtime.
      if (fallback) continue;
      if (!declared.has(reference)) dangling.push(`${path}: var(${reference})`);
    }
  }
  assert.deepEqual(dangling, [], 'these resolve to nothing in either theme');
});
