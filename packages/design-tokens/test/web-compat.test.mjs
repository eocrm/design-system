import assert from 'node:assert/strict';
import test from 'node:test';
import { compareWebContracts } from '../scripts/check-web-compat.mjs';

test('classifies missing, extra, and changed web variables separately', () => {
  const expected = {
    light: { '--missing': '1px', '--changed': '#ffffff' },
    forcedDark: {},
    systemDark: {},
    forcedLight: { 'color-scheme': 'light' },
  };
  const actual = {
    light: { '--changed': '#000000', '--extra': '2px' },
    forcedDark: {},
    systemDark: {},
    forcedLight: { 'color-scheme': 'light' },
  };

  assert.deepEqual(compareWebContracts(expected, actual), {
    missing: ['light --missing'],
    extra: ['light --extra'],
    changed: ['light --changed: #ffffff -> #000000'],
  });
});
