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
