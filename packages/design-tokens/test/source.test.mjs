import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

  assert.equal(capturedNames.size, 290);
  assert.equal(webNames.length, 234);
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
  assert.equal(Object.values(actualInventory).flat().length, 148);
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

  assert.equal(Object.keys(fixture.light).length, 287);
  assert.equal(Object.keys(fixture.forcedDark).length, 115);
  assert.deepEqual(fixture.systemDark, fixture.forcedDark);
  assert.deepEqual(fixture.forcedLight, {});
  assert.deepEqual(fixture.provenance.forcedDark['--color-bg'], [
    {
      source: 'packages/design-system/src/styles/dark.scss',
      selector: ":root[data-theme='dark']",
      mixin: 'dark-tokens',
    },
  ]);
  assert.deepEqual(fixture.provenance.systemDark['--color-bg'], [
    {
      source: 'packages/design-system/src/styles/dark.scss',
      selector: ":root:not([data-theme='light'])",
      atRule: '@media (prefers-color-scheme: dark)',
      mixin: 'dark-tokens',
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
