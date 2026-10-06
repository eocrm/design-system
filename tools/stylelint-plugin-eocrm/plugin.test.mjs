import { test } from 'node:test';
import assert from 'node:assert/strict';
import stylelint from 'stylelint';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

const config = {
  customSyntax: 'postcss-scss',
  plugins: [fileURLToPath(new URL('./index.mjs', import.meta.url))],
  rules: {
    'eocrm/focus-ring-offset-via-mixin': true,
    'selector-pseudo-class-disallowed-list': ['dir'],
    'eocrm/no-dir-pseudo-class': true,
  },
};
const file = `${repoRoot}packages/design-system/src/components/X/X.module.scss`;
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
test(':DIR() is flagged (case-insensitive)', async () => {
  assert.ok((await lint('.a:DIR(rtl) { color: red; }')).includes(noDir));
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
      codeFilename: `${repoRoot}${codeFilename}`,
      configFile: `${repoRoot}.stylelintrc.json`,
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

// Guard: with disables ignored, no design-system SCSS may trip the moved policy rules, so no
// disable form (any comment syntax) can switch them off. Other rules' warnings are expected.
test('design-system SCSS trips no moved policy rule even with disables ignored', async () => {
  const policy = new Set([
    'selector-pseudo-class-disallowed-list',
    'eocrm/no-dir-pseudo-class',
    'eocrm/focus-ring-offset-via-mixin',
  ]);
  const { results } = await stylelint.lint({
    files: `${repoRoot}packages/design-system/src/**/*.scss`,
    configFile: `${repoRoot}.stylelintrc.json`,
    ignoreDisables: true,
  });
  const offenders = results.flatMap((r) =>
    r.warnings
      // A blanket disable followed by a named one makes stylelint throw CssSyntaxError instead.
      .filter((w) => policy.has(w.rule) || w.rule === 'CssSyntaxError')
      .map((w) => `${r.source.replace(repoRoot, '')}:${w.line} ${w.rule}`),
  );
  assert.deepEqual(offenders, []);
});
