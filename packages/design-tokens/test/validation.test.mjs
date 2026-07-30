import assert from 'node:assert/strict';
import test from 'node:test';
import { toKotlinProperty, toKotlinType } from '../scripts/lib/names.mjs';
import { TokenSemanticError, resolveTokenValue, validateTokens } from '../scripts/lib/validate-tokens.mjs';

const token = ({
  id = 'color.primary',
  type = 'color',
  value = '#000000',
  outputs = { web: { name: '--color-primary' } }
} = {}) => ({ id, type, value, outputs });

const document = (tokens) => ({ schemaVersion: 1, contractVersion: '1.0.0', tokens });

test('reports stable semantic issue codes', () => {
  const cases = [
    {
      name: 'duplicate token IDs',
      input: document([token(), token()]),
      code: 'duplicate-id'
    },
    {
      name: 'duplicate web output names',
      input: document([
        token(),
        token({ id: 'color.secondary', outputs: { web: { name: '--color-primary' } } })
      ]),
      code: 'duplicate-output'
    },
    {
      name: 'duplicate Compose output names within a group',
      input: document([
        token({ outputs: { compose: { group: 'colors', name: 'primary' } } }),
        token({ id: 'color.secondary', outputs: { compose: { group: 'colors', name: 'primary' } } })
      ]),
      code: 'duplicate-output'
    },
    {
      name: 'unknown aliases',
      input: document([token({ value: { alias: 'color.missing' } })]),
      code: 'unknown-alias'
    },
    {
      name: 'two-token alias cycles',
      input: document([
        token({ id: 'color.a', value: { alias: 'color.b' } }),
        token({ id: 'color.b', value: { alias: 'color.a' } })
      ]),
      code: 'alias-cycle',
      message: 'color.a -> color.b -> color.a'
    },
    {
      name: 'themed aliases targeting a theme-neutral value',
      input: document([
        token({ id: 'color.base', value: '#000000' }),
        token({
          id: 'color.alias',
          value: { light: { alias: 'color.base' }, dark: { alias: 'color.base' } }
        })
      ]),
      code: 'theme-shape'
    },
    {
      name: 'Compose colors with invalid hex values',
      input: document([token({ value: '#000', outputs: { compose: { group: 'colors', name: 'primary' } } })]),
      code: 'invalid-compose-value'
    },
    {
      name: 'Compose dimensions without px values',
      input: document([token({
        id: 'space.small',
        type: 'dimension',
        value: '4rem',
        outputs: { compose: { group: 'dimensions', name: 'small' } }
      })]),
      code: 'invalid-compose-value'
    },
    {
      name: 'tokens without outputs',
      input: document([token({ outputs: {} })]),
      code: 'missing-output'
    }
  ];

  for (const { name, input, code, message } of cases) {
    assert.throws(() => validateTokens(input), (error) => {
      assert.ok(error instanceof TokenSemanticError, name);
      assert.ok(error.issues.some((issue) => issue.code === code), name);
      if (message) assert.ok(error.issues.some((issue) => issue.message.includes(message)), name);
      return true;
    });
  }
});

test('resolves themed aliases to distinct light and dark primitives', () => {
  const input = document([
    token({ id: 'color.base', value: { light: '#ffffff', dark: '#1d2125' } }),
    token({
      id: 'color.surface',
      value: { light: { alias: 'color.base' }, dark: { alias: 'color.base' } },
      outputs: { web: { name: '--color-surface' } }
    })
  ]);

  const validated = validateTokens(input);

  assert.equal(resolveTokenValue(validated, 'color.surface', 'light'), '#ffffff');
  assert.equal(resolveTokenValue(validated, 'color.surface', 'dark'), '#1d2125');
});

test('uses locale-independent Kotlin names', () => {
  assert.equal(toKotlinProperty('color.background-subtle'), 'colorBackgroundSubtle');
  assert.equal(toKotlinType('categorical-palette'), 'CategoricalPalette');
});
