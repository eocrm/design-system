import assert from 'node:assert/strict';
import test from 'node:test';
import { renderWeb } from '../scripts/lib/render-web.mjs';
import { validateTokens } from '../scripts/lib/validate-tokens.mjs';

test('renders the complete stable light and dark Sass contract', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '0.0.0',
    tokens: [
      {
        id: 'color.background',
        type: 'color',
        value: { light: '#ffffff', dark: '#111111' },
        outputs: { web: { name: '--color-bg' } },
      },
      {
        id: 'color.surface',
        type: 'color',
        value: {
          light: { alias: 'color.background' },
          dark: { alias: 'color.background' },
        },
        outputs: { web: { name: '--color-surface' } },
      },
      {
        id: 'space.small',
        type: 'dimension',
        value: '4px',
        outputs: { web: { name: '--space-sm' } },
      },
    ],
  });

  assert.deepEqual(renderWeb(document), {
    tokensScss: `// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: 1

:root {
  color-scheme: light;
  --color-bg: #ffffff;
  --color-surface: var(--color-bg);
  --space-sm: 4px;
}
`,
    darkScss: `// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: 1

:root[data-theme='dark'] {
  color-scheme: dark;
  --color-bg: #111111;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --color-bg: #111111;
  }
}

:root[data-theme='light'] {
  color-scheme: light;
}
`,
  });
});

test('renders identical repository-independent bytes on repeated calls', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '0.0.0',
    tokens: [
      {
        id: 'space.small',
        type: 'dimension',
        value: '4px',
        outputs: { web: { name: '--space-sm' } },
      },
    ],
  });

  const first = renderWeb(document);
  const second = renderWeb(document);
  const output = `${first.tokensScss}${first.darkScss}`;

  assert.deepEqual(second, first);
  assert.doesNotMatch(output, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.doesNotMatch(output, /(?:\/home\/|[A-Z]:\\)/);
});

test('renders accent override blocks with higher specificity than the theme blocks', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '0.0.0',
    tokens: [
      {
        id: 'color.background',
        type: 'color',
        value: { light: '#ffffff', dark: '#111111' },
        outputs: { web: { name: '--color-bg' } },
      },
      {
        id: 'color.accent',
        type: 'color',
        value: { light: '#0000ff', dark: '#8888ff' },
        outputs: { web: { name: '--color-accent' } },
      },
      {
        id: 'color.accent.subtle',
        type: 'color',
        value: { light: { alias: 'color.accent' }, dark: { alias: 'color.accent' } },
        outputs: { web: { name: '--color-accent-subtle' } },
      },
    ],
    accents: { tealpine: { 'color.accent': { light: '#17736d', dark: '#6dcfc4' } } },
  });

  const { tokensScss, darkScss } = renderWeb(document);

  assert.ok(
    tokensScss.endsWith(`:root {
  color-scheme: light;
  --color-accent: #0000ff;
  --color-accent-subtle: var(--color-accent);
  --color-bg: #ffffff;
}

:root[data-accent='tealpine'] {
  --color-accent: #17736d;
}
`),
  );
  assert.ok(
    darkScss.includes(`:root[data-theme='dark'] {
  color-scheme: dark;
  --color-accent: #8888ff;
  --color-bg: #111111;
}

:root[data-accent='tealpine'][data-theme='dark'] {
  --color-accent: #6dcfc4;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --color-accent: #8888ff;
    --color-bg: #111111;
  }

  :root[data-accent='tealpine']:not([data-theme='light']) {
    --color-accent: #6dcfc4;
  }
}

:root[data-theme='light'] {`),
  );
  const selectors = `${tokensScss}${darkScss}`.match(/^\s*:root\[data-accent[^{]*/gm);
  assert.equal(selectors.length, 3);
  for (const s of selectors) assert.match(s, /\[data-accent='tealpine'\]/);
  assert.equal(`${tokensScss}${darkScss}`.match(/--color-accent-subtle/g).length, 1);
});

test('emits accent dark overrides even when equal to the light override', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '0.0.0',
    tokens: [
      {
        id: 'color.accent',
        type: 'color',
        value: { light: '#0000ff', dark: '#8888ff' },
        outputs: { web: { name: '--color-accent' } },
      },
    ],
    accents: { tealpine: { 'color.accent': { light: '#ffffff', dark: '#ffffff' } } },
  });

  const { darkScss } = renderWeb(document);

  assert.match(
    darkScss,
    /\[data-accent='tealpine'\]\[data-theme='dark'\] \{\n  --color-accent: #ffffff;/,
  );
  assert.match(
    darkScss,
    /\[data-accent='tealpine'\]:not\(\[data-theme='light'\]\) \{\n    --color-accent: #ffffff;/,
  );
});
