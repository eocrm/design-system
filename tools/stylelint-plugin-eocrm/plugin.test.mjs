import { test } from 'node:test';
import assert from 'node:assert/strict';
import stylelint from 'stylelint';

const config = {
  customSyntax: 'postcss-scss',
  plugins: ['./tools/stylelint-plugin-eocrm/index.mjs'],
  rules: {
    'eocrm/focus-ring-offset-via-mixin': true,
    'selector-pseudo-class-disallowed-list': ['dir'],
  },
};
const file = 'packages/design-system/src/components/X/X.module.scss';
const lint = async (code) =>
  (await stylelint.lint({ code, codeFilename: file, config })).results[0].warnings.map(
    (w) => w.rule,
  );
const offset = 'eocrm/focus-ring-offset-via-mixin';

test('include then offset is flagged', async () => {
  assert.deepEqual(await lint('.a:focus-visible { @include focus-ring; outline-offset: 2px; }'), [
    offset,
  ]);
});
test('offset then include is flagged', async () => {
  assert.deepEqual(await lint('.a:focus-visible { outline-offset: 2px; @include focus-ring; }'), [
    offset,
  ]);
});
test('offset via $offset is ok', async () => {
  assert.deepEqual(await lint('.a:focus-visible { @include focus-ring($offset: 1px); }'), []);
});
test('offset alone is ok', async () => {
  assert.deepEqual(await lint('.a:focus-visible { outline-offset: 2px; }'), []);
});
test('offset in a comment is ok', async () => {
  assert.deepEqual(
    await lint('// @include focus-ring; outline-offset: 2px;\n.a { color: red; }'),
    [],
  );
});
test('nested block is flagged (old regex blind spot)', async () => {
  assert.deepEqual(
    await lint('.a { &:focus-visible { @include focus-ring; outline-offset: 2px; } }'),
    [offset],
  );
});
test(':dir() is flagged', async () => {
  assert.deepEqual(await lint('.a:dir(rtl) { color: red; }'), [
    'selector-pseudo-class-disallowed-list',
  ]);
});

test('focus-ring(var(--x)) plus offset is flagged', async () => {
  assert.deepEqual(
    await lint('.a:focus-visible { @include focus-ring(var(--x)); outline-offset: 2px; }'),
    [offset],
  );
});
test('focus-ring($offset: 2px) plus offset is flagged', async () => {
  assert.deepEqual(
    await lint('.a:focus-visible { @include focus-ring($offset: 2px); outline-offset: 2px; }'),
    [offset],
  );
});

// Scope: pins the `overrides` globs in the REAL .stylelintrc.json.
const dirRule = 'selector-pseudo-class-disallowed-list';
const realRules = async (codeFilename) =>
  (
    await stylelint.lint({
      code: '.a:dir(rtl) { color: red; }\n.b:focus-visible { @include focus-ring; outline-offset: 2px; }\n',
      codeFilename,
      configFile: '.stylelintrc.json',
    })
  ).results[0].warnings
    .map((w) => w.rule)
    .filter((r) => r === dirRule || r === offset)
    .sort();
test('real config: component module gets both rules', async () => {
  assert.deepEqual(
    await realRules('packages/design-system/src/components/X/X.module.scss'),
    [offset, dirRule].sort(),
  );
});
test('real config: src/styles gets :dir only', async () => {
  assert.deepEqual(await realRules('packages/design-system/src/styles/x.scss'), [dirRule]);
});
test('real config: playground gets neither', async () => {
  assert.deepEqual(await realRules('packages/playground/src/x.scss'), []);
});
