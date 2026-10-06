import { test } from 'node:test';
import assert from 'node:assert/strict';
import stylelint from 'stylelint';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const config = {
  customSyntax: 'postcss-scss',
  plugins: ['./tools/stylelint-plugin-eocrm/index.mjs'],
  rules: {
    'eocrm/focus-ring-offset-via-mixin': true,
    'selector-pseudo-class-disallowed-list': ['dir'],
    'eocrm/no-dir-pseudo-class': true,
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
  assert.deepEqual((await lint('.a:dir(rtl) { color: red; }')).sort(), [
    'eocrm/no-dir-pseudo-class',
    'selector-pseudo-class-disallowed-list',
  ]);
});
const noDir = 'eocrm/no-dir-pseudo-class';
test('interpolated #{&}:dir() is flagged (built-in skips it)', async () => {
  assert.deepEqual(await lint('.a { #{&}:dir(rtl) { color: red; } }'), [noDir]);
});
test(':is(:dir()) is flagged', async () => {
  assert.ok((await lint('.a:is(:dir(rtl)) { color: red; }')).includes(noDir));
});
test('.dir and [dir="rtl"] are ok', async () => {
  assert.deepEqual(await lint('.dir { color: red; }\n[dir="rtl"] .a { color: red; }'), []);
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
    .filter((r) => r === dirRule || r === offset || r === noDir)
    .sort();
test('real config: component module gets both rules', async () => {
  assert.deepEqual(
    await realRules('packages/design-system/src/components/X/X.module.scss'),
    [offset, dirRule, noDir].sort(),
  );
});
test('real config: src/styles gets :dir only', async () => {
  assert.deepEqual(
    await realRules('packages/design-system/src/styles/x.scss'),
    [dirRule, noDir].sort(),
  );
});
test('real config: playground gets neither', async () => {
  assert.deepEqual(await realRules('packages/playground/src/x.scss'), []);
});

// Guard: disable comments in design-system SCSS may not blanket-disable or name the moved policy rules.
const DISABLE = /(?:\/\/|\/\*)\s*stylelint-disable(?:-next-line|-line)?(?![\w-])(.*)/;
const protectedRule = /eocrm\/|selector-pseudo-class-disallowed-list/;
function badDisables(src) {
  const bad = [];
  src.split('\n').forEach((line, i) => {
    const m = DISABLE.exec(line);
    if (!m) return;
    const rules = m[1]
      .replace(/\*\/.*$/, '')
      .replace(/\s--(?:\s.*)?$|^\s*--(?:\s.*)?$/, '')
      .trim();
    if (rules === '' || protectedRule.test(rules)) bad.push(i + 1);
  });
  return bad;
}
test('disable-comment guard: detects each bad form', () => {
  for (const c of [
    '// stylelint-disable',
    '/* stylelint-disable */',
    '// stylelint-disable-next-line -- reason',
    '/* stylelint-disable-line -- reason */',
    '// stylelint-disable eocrm/no-dir-pseudo-class',
    '// stylelint-disable-next-line selector-pseudo-class-disallowed-list -- x',
  ])
    assert.deepEqual(badDisables(c), [1], c);
  for (const c of [
    '// stylelint-disable property-disallowed-list -- reason',
    '/* stylelint-disable-next-line scss/load-partial-extension */',
    '// stylelint-enable',
  ])
    assert.deepEqual(badDisables(c), [], c);
});
test('design-system SCSS has no blanket or moved-rule stylelint disables', () => {
  const root = 'packages/design-system/src';
  const offenders = readdirSync(root, { recursive: true })
    .filter((f) => f.endsWith('.scss'))
    .flatMap((f) =>
      badDisables(readFileSync(join(root, f), 'utf8')).map((n) => `${root}/${f}:${n}`),
    );
  assert.deepEqual(offenders, []);
});
