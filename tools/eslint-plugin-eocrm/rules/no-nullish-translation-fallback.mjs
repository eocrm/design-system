// Ported from structure.test.ts "a translated fallback is never introduced
// with ??". `x ?? t('k')` lets `''` through as the name; `||` is the fix.
// Known limit: a `t()` bound to another name is not seen.
export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      nullish:
        '`?? t(…)` lets an empty string through as the label; use `||` so an empty value falls back to the translation (AI-PRIMER: an empty label prop means unset, never blank).',
    },
  },
  create(context) {
    return {
      "LogicalExpression[operator='??']"(node) {
        const r = node.right;
        if (
          r.type === 'CallExpression' &&
          r.callee.type === 'Identifier' &&
          r.callee.name === 't'
        ) {
          context.report({ node, messageId: 'nullish' });
        }
      },
    };
  },
};
