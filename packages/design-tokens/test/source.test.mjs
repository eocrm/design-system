import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  captureWebContract,
  captureWebContractFromSources,
} from '../scripts/capture-web-contract.mjs';
import { loadTokenDocument } from '../scripts/lib/load-tokens.mjs';
import { resolveTokenValue } from '../scripts/lib/validate-tokens.mjs';

const tokenSourcePath = new URL('../src/tokens.json', import.meta.url);
const fixturePath = new URL('./fixtures/current-web-contract.json', import.meta.url);

test('loads the authoritative source with representative shared values', async () => {
  const tokens = await loadTokenDocument(tokenSourcePath);

  assert.equal(resolveTokenValue(tokens, 'color.background', 'light'), '#ffffff');
  assert.equal(resolveTokenValue(tokens, 'color.background', 'dark'), '#1d2125');
  assert.equal(resolveTokenValue(tokens, 'space.4', 'light'), '16px');
  assert.equal(resolveTokenValue(tokens, 'radius.medium', 'light'), '4px');
  assert.equal(resolveTokenValue(tokens, 'palette.red.background', 'dark'), '#482219');
  assert.equal(resolveTokenValue(tokens, 'size.control.medium', 'light'), '32px');
});

test('maps every captured public variable to exactly one web output', async () => {
  const [tokens, fixture] = await Promise.all([
    loadTokenDocument(tokenSourcePath),
    readJson(fixturePath),
  ]);
  const capturedNames = new Set(
    ['light', 'forcedDark', 'systemDark', 'forcedLight'].flatMap((scope) =>
      Object.keys(fixture[scope]),
    ),
  );
  const webNames = tokens.tokens.flatMap((token) => token.outputs.web?.name ?? []);

  assert.equal(capturedNames.size, 289);
  assert.equal(webNames.length, 289);
  assert.deepEqual(webNames.slice().sort(), [...capturedNames].sort());
});

test('reconstructs every captured declaration value and scope from the dataset', async () => {
  const [tokens, fixture] = await Promise.all([
    loadTokenDocument(tokenSourcePath),
    readJson(fixturePath),
  ]);

  assert.deepEqual(projectWebContract(tokens), {
    light: fixture.light,
    forcedDark: fixture.forcedDark,
    systemDark: fixture.systemDark,
    forcedLight: fixture.forcedLight,
  });
});

test('provides every required shared Compose group', async () => {
  const tokens = await loadTokenDocument(tokenSourcePath);
  const groups = new Set(tokens.tokens.flatMap((token) => token.outputs.compose?.group ?? []));

  assert.deepEqual([...groups].sort(), [
    'avatarPalette',
    'categoricalPalette',
    'colors',
    'dimensions',
    'semanticTones',
    'typography',
  ]);
});

test('models deprecated Badge variables as semantic aliases', async () => {
  const tokens = await loadTokenDocument(tokenSourcePath);
  const deprecated = tokens.tokens.find(
    (token) => token.outputs.web?.name === '--color-badge-danger-bg',
  );

  assert.deepEqual(deprecated.value, {
    light: { alias: 'tone.danger.background' },
    dark: { alias: 'tone.danger.background' },
  });
});

test('captures the checked-in web contract with provenance and expanded dark scopes', async () => {
  const [captured, fixture] = await Promise.all([captureWebContract(), readJson(fixturePath)]);

  assert.deepEqual(captured, fixture);
  assert.equal(Object.keys(fixture.light).length, 286);
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
