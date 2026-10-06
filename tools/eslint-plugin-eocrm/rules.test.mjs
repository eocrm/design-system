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

// Guard: with inline config disallowed, no eslint-disable form can switch the eocrm rules off,
// so the library source must be clean of them.
describe('eocrm rules have no inline off-switch', () => {
  it('design-system src has no eocrm/* message when inline config is ignored', async () => {
    const { ESLint } = await import('eslint');
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    const eslint = new ESLint({
      cwd: repoRoot,
      overrideConfigFile: join(repoRoot, 'eslint.config.mjs'),
      allowInlineConfig: false,
    });
    const results = await eslint.lintFiles([join(repoRoot, 'packages/design-system/src')]);
    const offenders = results.flatMap((r) =>
      r.messages
        .filter((m) => m.ruleId?.startsWith('eocrm/'))
        .map((m) => `${relative(repoRoot, r.filePath)}:${m.line} ${m.ruleId}`),
    );
    assert.deepEqual(offenders, []);
  });
});
