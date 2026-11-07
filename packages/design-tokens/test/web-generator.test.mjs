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

:root [data-theme='light'] {
  color-scheme: light;
  --color-bg: #ffffff;
  --color-surface: var(--color-bg);
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

:root [data-theme='dark'] {
  color-scheme: dark;
  --color-bg: #111111;
  --color-surface: var(--color-bg);
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
    tokensScss.includes(`:root {
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
  // Root ladder: light, forced dark, OS dark; plus the two DS-21 subtree twins.
  const selectors = `${tokensScss}${darkScss}`.match(/^\s*:root\[data-accent[^{]*/gm);
  assert.equal(selectors.length, 5);
  for (const s of selectors) assert.match(s, /\[data-accent='tealpine'\]/);
  // The alias follows the override via var(): never re-declared per accent. It
  // appears once at :root and once per subtree block (DS-21).
  assert.equal(`${tokensScss}${darkScss}`.match(/--color-accent-subtle/g).length, 3);
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

test('generated web contract exposes --size-touch as 44px (DS-35)', async () => {
  const { readFile } = await import('node:fs/promises');
  const scss = await readFile(new URL('../generated/web/tokens.scss', import.meta.url), 'utf8');
  assert.match(scss, /--size-touch:\s*44px;/);
});

// DS-21: `data-theme` on any element, not only <html>. Custom properties
// resolve var() where they are DECLARED, so an alias declared once on :root is
// frozen to the root theme; the subtree blocks must re-declare every alias too.
test('emits descendant theme blocks that never match :root (DS-21)', () => {
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
      {
        id: 'color.accent.subtle',
        type: 'color',
        value: { light: { alias: 'color.accent' }, dark: { alias: 'color.accent' } },
        outputs: { web: { name: '--color-accent-subtle' } },
      },
      {
        id: 'space.small',
        type: 'dimension',
        value: '4px',
        outputs: { web: { name: '--space-sm' } },
      },
    ],
    accents: { tealpine: { 'color.accent': { light: '#17736d', dark: '#6dcfc4' } } },
  });

  const { tokensScss, darkScss } = renderWeb(document);

  assert.ok(
    tokensScss.endsWith(`:root [data-theme='light'] {
  color-scheme: light;
  --color-accent: #0000ff;
  --color-accent-subtle: var(--color-accent);
}

:root[data-accent='tealpine'] [data-theme='light'] {
  --color-accent: #17736d;
}
`),
  );
  assert.ok(
    darkScss.endsWith(`:root [data-theme='dark'] {
  color-scheme: dark;
  --color-accent: #8888ff;
  --color-accent-subtle: var(--color-accent);
}

:root[data-accent='tealpine'] [data-theme='dark'] {
  --color-accent: #6dcfc4;
}
`),
  );
  // Theme-independent literals are inherited unchanged, so they are not repeated.
  assert.equal(`${tokensScss}${darkScss}`.match(/--space-sm/g).length, 1);
});
