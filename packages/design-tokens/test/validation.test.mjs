import assert from 'node:assert/strict';
import test from 'node:test';
import { toKotlinProperty, toKotlinType } from '../scripts/lib/names.mjs';
import {
  TokenSemanticError,
  resolveTokenValue,
  validateTokens,
} from '../scripts/lib/validate-tokens.mjs';

const token = ({
  id = 'color.primary',
  type = 'color',
  value = '#000000',
  outputs = { web: { name: '--color-primary' } },
} = {}) => ({ id, type, value, outputs });

const document = (tokens) => ({ schemaVersion: 1, contractVersion: '1.0.0', tokens });

test('reports stable semantic issue codes', () => {
  const cases = [
    {
      name: 'duplicate token IDs',
      input: document([token(), token()]),
      code: 'duplicate-id',
    },
    {
      name: 'duplicate web output names',
      input: document([
        token(),
        token({ id: 'color.secondary', outputs: { web: { name: '--color-primary' } } }),
      ]),
      code: 'duplicate-output',
    },
    {
      name: 'duplicate Compose output names within a group',
      input: document([
        token({ outputs: { compose: { group: 'colors', name: 'primary' } } }),
        token({
          id: 'color.secondary',
          outputs: { compose: { group: 'colors', name: 'primary' } },
        }),
      ]),
      code: 'duplicate-output',
    },
    {
      name: 'unknown aliases',
      input: document([token({ value: { alias: 'color.missing' } })]),
      code: 'unknown-alias',
    },
    {
      name: 'two-token alias cycles',
      input: document([
        token({ id: 'color.a', value: { alias: 'color.b' } }),
        token({ id: 'color.b', value: { alias: 'color.a' } }),
      ]),
      code: 'alias-cycle',
      message: 'color.a -> color.b -> color.a',
    },
    {
      name: 'themed aliases targeting a theme-neutral value',
      input: document([
        token({ id: 'color.base', value: '#000000' }),
        token({
          id: 'color.alias',
          value: { light: { alias: 'color.base' }, dark: { alias: 'color.base' } },
        }),
      ]),
      code: 'theme-shape',
    },
    {
      name: 'Compose colors with invalid hex values',
      input: document([
        token({ value: '#000', outputs: { compose: { group: 'colors', name: 'primary' } } }),
      ]),
      code: 'invalid-compose-value',
    },
    {
      name: 'Compose dimensions without px values',
      input: document([
        token({
          id: 'space.small',
          type: 'dimension',
          value: '4rem',
          outputs: { compose: { group: 'dimensions', name: 'small' } },
        }),
      ]),
      code: 'invalid-compose-value',
    },
    {
      name: 'tokens without outputs',
      input: document([token({ outputs: {} })]),
      code: 'missing-output',
    },
  ];

  for (const { name, input, code, message } of cases) {
    assert.throws(
      () => validateTokens(input),
      (error) => {
        assert.ok(error instanceof TokenSemanticError, name);
        assert.ok(
          error.issues.some((issue) => issue.code === code),
          name,
        );
        if (message)
          assert.ok(
            error.issues.some((issue) => issue.message.includes(message)),
            name,
          );
        return true;
      },
    );
  }
});

test('resolves themed aliases to distinct light and dark primitives', () => {
  const input = document([
    token({ id: 'color.base', value: { light: '#ffffff', dark: '#1d2125' } }),
    token({
      id: 'color.surface',
      value: { light: { alias: 'color.base' }, dark: { alias: 'color.base' } },
      outputs: { web: { name: '--color-surface' } },
    }),
  ]);

  const validated = validateTokens(input);

  assert.equal(resolveTokenValue(validated, 'color.surface', 'light'), '#ffffff');
  assert.equal(resolveTokenValue(validated, 'color.surface', 'dark'), '#1d2125');
});

test('reports a transitive unknown alias at its physical alias edge once', () => {
  const input = document([
    token({ id: 'color.a', value: { alias: 'color.b' } }),
    token({
      id: 'color.b',
      value: { alias: 'color.missing' },
      outputs: { web: { name: '--color-b' } },
    }),
  ]);

  assert.throws(
    () => validateTokens(input),
    (error) => {
      assert.ok(error instanceof TokenSemanticError);
      assert.deepEqual(error.issues, [
        {
          path: '/tokens/1/value/alias',
          code: 'unknown-alias',
          message: 'unknown token alias color.missing',
        },
      ]);
      return true;
    },
  );
});

test('rejects a web alias whose target has no web output at the alias edge', () => {
  const input = document([
    token({
      id: 'color.compose-only',
      outputs: { compose: { group: 'colors', name: 'composeOnly' } },
    }),
    token({
      id: 'color.web-alias',
      value: { alias: 'color.compose-only' },
      outputs: { web: { name: '--color-web-alias' } },
    }),
  ]);

  assert.throws(
    () => validateTokens(input),
    (error) => {
      assert.ok(error instanceof TokenSemanticError);
      assert.deepEqual(error.issues, [
        {
          path: '/tokens/1/value/alias',
          code: 'missing-web-output',
          message: 'web alias color.compose-only must target a token with a web output',
        },
      ]);
      return true;
    },
  );
});

test('rejects direct aliases between different declared token types', () => {
  const input = document([
    token({
      id: 'css.dimension',
      type: 'css',
      value: '4px',
      outputs: { web: { name: '--css-dimension' } },
    }),
    token({
      id: 'space.alias',
      type: 'dimension',
      value: { alias: 'css.dimension' },
      outputs: { web: { name: '--space-alias' } },
    }),
  ]);

  assert.throws(
    () => validateTokens(input),
    (error) => {
      assert.ok(error instanceof TokenSemanticError);
      assert.deepEqual(error.issues, [
        {
          path: '/tokens/1/value/alias',
          code: 'incompatible-alias-type',
          message: 'dimension token cannot alias css token css.dimension',
        },
      ]);
      return true;
    },
  );
});

test('rejects incompatible alias types at each themed alias path', () => {
  const input = document([
    token({
      id: 'css.color',
      type: 'css',
      value: { light: '#ffffff', dark: '#000000' },
      outputs: { web: { name: '--css-color' } },
    }),
    token({
      id: 'color.alias',
      type: 'color',
      value: { light: { alias: 'css.color' }, dark: { alias: 'css.color' } },
      outputs: { web: { name: '--color-alias' } },
    }),
  ]);

  assert.throws(
    () => validateTokens(input),
    (error) => {
      assert.ok(error instanceof TokenSemanticError);
      assert.deepEqual(
        error.issues.map(({ path, code }) => ({ path, code })),
        [
          { path: '/tokens/1/value/dark/alias', code: 'incompatible-alias-type' },
          { path: '/tokens/1/value/light/alias', code: 'incompatible-alias-type' },
        ],
      );
      return true;
    },
  );
});

test('accepts six- and eight-digit Compose colors but rejects malformed values', () => {
  for (const value of ['#000000', '#00000080']) {
    assert.doesNotThrow(() =>
      validateTokens(
        document([token({ value, outputs: { compose: { group: 'colors', name: 'primary' } } })]),
      ),
    );
  }

  assert.throws(
    () =>
      validateTokens(
        document([
          token({ value: '#000', outputs: { compose: { group: 'colors', name: 'primary' } } }),
        ]),
      ),
    (error) => {
      assert.deepEqual(
        error.issues.map(({ path, code }) => ({ path, code })),
        [
          {
            path: '/tokens/0/value',
            code: 'invalid-compose-value',
          },
        ],
      );
      return true;
    },
  );
});

test('accepts numeric zero as the only unitless Compose dimension', () => {
  for (const value of [0, '0px', '4px']) {
    assert.doesNotThrow(() =>
      validateTokens(
        document([
          token({
            id: 'space.zero',
            type: 'dimension',
            value,
            outputs: { compose: { group: 'dimensions', name: 'zero' } },
          }),
        ]),
      ),
    );
  }

  for (const value of [1, -1, 0.5, '0', '4rem']) {
    assert.throws(
      () =>
        validateTokens(
          document([
            token({
              id: 'space.zero',
              type: 'dimension',
              value,
              outputs: { compose: { group: 'dimensions', name: 'zero' } },
            }),
          ]),
        ),
      (error) => {
        assert.deepEqual(
          error.issues.map(({ path, code }) => ({ path, code })),
          [{ path: '/tokens/0/value', code: 'invalid-compose-value' }],
        );
        return true;
      },
    );
  }
});

test('validates resolved values for every declared token type', () => {
  const invalidValues = {
    color: 'potato',
    dimension: true,
    number: '12',
    fontFamily: 42,
    fontWeight: 5500,
    lineHeight: 0,
    duration: 'soon',
    shadow: false,
    css: null,
  };

  for (const [type, value] of Object.entries(invalidValues)) {
    assert.throws(
      () =>
        validateTokens(
          document([
            token({
              id: `example.${type.toLowerCase()}`,
              type,
              value,
              outputs: { web: { name: `--example-${type.toLowerCase()}` } },
            }),
          ]),
        ),
      (error) => {
        assert.ok(
          error.issues.some((issue) => issue.code === 'invalid-token-value'),
          `${type} should reject ${String(value)}`,
        );
        return true;
      },
    );
  }
});

test('rejects malformed web-only CSS colors', () => {
  for (const value of [
    '#12345',
    '#1234567',
    'rgb(',
    'rgb(nope)',
    'rgb(256 0 0)',
    'rgb(0 0 0 / 101%)',
    'hsl(10 20% 30%',
  ]) {
    assert.throws(
      () => validateTokens(document([token({ value })])),
      (error) => {
        assert.ok(
          error.issues.some((issue) => issue.code === 'invalid-token-value'),
          value,
        );
        return true;
      },
    );
  }
});

test('rejects incomplete Compose palette structures', () => {
  const cases = [
    token({
      id: 'palette.red.background',
      value: '#ff0000',
      outputs: {
        compose: { group: 'categoricalPalette', name: 'redBackground' },
      },
    }),
    token({
      id: 'avatar.palette.1',
      value: '#ff0000',
      outputs: { compose: { group: 'avatarPalette', name: 'palette1' } },
    }),
  ];

  assert.throws(
    () => validateTokens(document(cases)),
    (error) => {
      assert.deepEqual(
        error.issues.map(({ code }) => code),
        ['invalid-compose-structure', 'invalid-compose-pair'],
      );
      return true;
    },
  );
});

test('sorts independent semantic issues by path then code', () => {
  const input = document([
    token({ id: 'color.a', value: { alias: 'color.missing' }, outputs: {} }),
    token({ id: 'color.a', outputs: { web: { name: '--color-primary' } } }),
    token({ id: 'color.c', outputs: { web: { name: '--color-primary' } } }),
  ]);

  assert.throws(
    () => validateTokens(input),
    (error) => {
      assert.deepEqual(
        error.issues.map(({ path, code }) => ({ path, code })),
        [
          { path: '/tokens/0/outputs', code: 'missing-output' },
          { path: '/tokens/0/value/alias', code: 'unknown-alias' },
          { path: '/tokens/1/id', code: 'duplicate-id' },
          { path: '/tokens/2/outputs/web/name', code: 'duplicate-output' },
        ],
      );
      return true;
    },
  );
});

test('uses locale-independent Kotlin names', () => {
  assert.equal(toKotlinProperty('color.background-subtle'), 'colorBackgroundSubtle');
  assert.equal(toKotlinType('categorical-palette'), 'CategoricalPalette');
});
