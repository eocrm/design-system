import assert from 'node:assert/strict';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from './index.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
const { rules } = plugin;

// Ported from the structure.test.ts "the scan itself can fail" self-tests.
tester.run('no-nullish-accessible-name', rules['no-nullish-accessible-name'], {
  valid: [
    `<i aria-label={a || t('k')} />`,
    // aria-labelledby is out of scope.
    `<i aria-labelledby={a ?? b} />`,
    // `??` outside the name attribute is not this rule's business.
    `<i aria-label={t('k', { n: 1 })} title={x ?? y} />`,
    // A comment quoting the defect is trivia.
    `// aria-label={row.name ?? ''}\nconst a = <i aria-label="x" />;`,
    `<i aria-label="plain" />`,
  ],
  invalid: [
    { code: `<i aria-label={a ?? t('k')} />`, errors: [{ messageId: 'nullish' }] },
    { code: `<i aria-valuetext={a ?? t('k')} />`, errors: [{ messageId: 'nullish' }] },
    // Nested `??` (inside a t() options object) still reaches the name.
    { code: `<i aria-label={t('k', { n: a ?? 1 })} />`, errors: [{ messageId: 'nullish' }] },
    { code: '<i aria-label={`${a ?? b} x`} />', errors: [{ messageId: 'nullish' }] },
  ],
});

tester.run('no-nullish-translation-fallback', rules['no-nullish-translation-fallback'], {
  valid: [
    `const A = () => <b>{x || t('k')}</b>;`,
    // Non-t() right operand is out of scope.
    `const A = () => <b>{x ?? y}</b>;`,
    // A comment quoting the defect is trivia, not code.
    `// was: label ?? t('k')\nconst a = 1;`,
  ],
  invalid: [
    { code: `const purpose = ariaLabel ?? t('k');`, errors: [{ messageId: 'nullish' }] },
    { code: `const a = { 'aria-label': x ?? t('k') };`, errors: [{ messageId: 'nullish' }] },
    { code: `const A = () => <b>{x ?? t('k')}</b>;`, errors: [{ messageId: 'nullish' }] },
    { code: `const c = rec.label ?? t('k', { i: 1 });`, errors: [{ messageId: 'nullish' }] },
    { code: `const A = () => <b title={x ?? t('k')} />;`, errors: [{ messageId: 'nullish' }] },
    { code: "const s = `${a ?? t('k')} — b`;", errors: [{ messageId: 'nullish' }] },
  ],
});

tester.run('aria-busy-needs-announcement', rules['aria-busy-needs-announcement'], {
  valid: [
    `const A = () => <div aria-busy={b} role="status" />;`,
    `const A = () => <div aria-busy={b}><i aria-live="polite" /></div>;`,
    `const A = () => <div aria-busy={b}><VisuallyHidden>{t('x')}</VisuallyHidden></div>;`,
    `const A = () => <div aria-busy={b}><span className={styles.srOnly}>{t('x')}</span></div>;`,
    // No aria-busy: nothing to announce.
    `const A = () => <div />;`,
  ],
  invalid: [
    { code: `const A = () => <div aria-busy={b} />;`, errors: [{ messageId: 'missing' }] },
    {
      code: `const A = () => <div aria-busy={b}><i aria-live="off" role="status" /></div>;`,
      errors: [{ messageId: 'missing' }],
    },
    // A t() call outside any visually-hidden span does not count.
    {
      code: `const A = () => <div aria-busy={b}>{t('x')}</div>;`,
      errors: [{ messageId: 'missing' }],
    },
    // Decorative class names do not count.
    {
      code: `const A = () => <div aria-busy={b}><span className={styles.srOnlyThing}>{t('x')}</span></div>;`,
      errors: [{ messageId: 'missing' }],
    },
  ],
});

// Scope: pins the `files`/`ignores` globs in eslint.config.mjs, which RuleTester cannot see.
describe('eslint.config.mjs scopes the eocrm rules', async () => {
  const { ESLint } = await import('eslint');
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: join(repoRoot, 'eslint.config.mjs'),
  });
  const code = `const A = () => <div aria-busy={b} aria-label={a ?? t('k')} />;`;
  const fired = async (filePath, src = code) =>
    (await eslint.lintText(src, { filePath: join(repoRoot, filePath) }))[0].messages
      .map((m) => m.ruleId)
      .filter((r) => r?.startsWith('eocrm/'))
      .sort();
  const all = [
    'eocrm/aria-busy-needs-announcement',
    'eocrm/no-nullish-accessible-name',
    'eocrm/no-nullish-translation-fallback',
  ];
  it('component source: all three fire', async () => {
    assert.deepEqual(await fired('packages/design-system/src/components/X/X.tsx'), all);
  });
  it('_internal .ts: fires (JSX is invalid in .ts, so a non-JSX snippet)', async () => {
    // ponytail: the other two rules are JSX-only, so a .ts file can only trip this one.
    assert.deepEqual(
      await fired(
        'packages/design-system/src/components/_internal/x.ts',
        `const a = { 'aria-label': x ?? t('k') };`,
      ),
      ['eocrm/no-nullish-translation-fallback'],
    );
  });
  it('test files: none fire', async () => {
    assert.deepEqual(await fired('packages/design-system/src/components/X/X.test.tsx'), []);
  });
  it('playground: none fire', async () => {
    assert.deepEqual(await fired('packages/playground/src/x.tsx'), []);
  });
});

// Scope: the recommended typescript-eslint + react-hooks rules apply as errors (a warning
// would exit 0 and pass CI) to library source, library tests and the playground alike.
describe('eslint.config.mjs applies the recommended rules everywhere', async () => {
  const { ESLint } = await import('eslint');
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: join(repoRoot, 'eslint.config.mjs'),
  });
  const code = `const x: any = 1;
function A() {
  if (x) useState(0);
  useEffect(() => { void x; }, [y]);
  return null;
}`;
  const rules = [
    '@typescript-eslint/no-explicit-any',
    'react-hooks/exhaustive-deps',
    'react-hooks/rules-of-hooks',
  ];
  for (const filePath of [
    'packages/design-system/src/components/X/X.tsx',
    'packages/design-system/src/components/X/X.test.tsx',
    'packages/playground/src/x.tsx',
  ]) {
    it(`${filePath}: all fire as errors`, async () => {
      const [r] = await eslint.lintText(code, { filePath: join(repoRoot, filePath) });
      const errors = r.messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
      for (const rule of rules) assert.ok(errors.includes(rule), `${rule} missing: ${errors}`);
    });
  }
});

// Guard: with inline config disallowed, no eslint-disable form can switch the eocrm rules off,
// so the library source must be clean of them.
describe('eocrm rules have no inline off-switch', async () => {
  const { ESLint } = await import('eslint');
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  const eslint = new ESLint({
    cwd: repoRoot,
    overrideConfigFile: join(repoRoot, 'eslint.config.mjs'),
    allowInlineConfig: false,
  });
  it('non-vacuous: a known-bad component snippet is reported', async () => {
    const [r] = await eslint.lintText(`const A = () => <div aria-label={a ?? t('k')} />;`, {
      filePath: join(repoRoot, 'packages/design-system/src/components/X/X.tsx'),
    });
    assert.ok(r.messages.some((m) => m.ruleId?.startsWith('eocrm/')));
  });
  it('design-system src has no eocrm/* message when inline config is ignored', async () => {
    const results = await eslint.lintFiles([join(repoRoot, 'packages/design-system/src')]);
    const offenders = results.flatMap((r) =>
      r.messages
        .filter((m) => m.fatal || m.ruleId?.startsWith('eocrm/'))
        .map((m) => `${relative(repoRoot, r.filePath)}:${m.line} ${m.ruleId ?? 'fatal'}`),
    );
    assert.deepEqual(offenders, []);
  });
});
