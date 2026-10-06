import stylelint from 'stylelint';

export const ruleName = 'eocrm/focus-ring-offset-via-mixin';
export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected:
    'pass the offset via focus-ring($offset: …) instead of a separate outline-offset declaration',
});

/** An `outline-offset` may not sit in the same rule as `@include focus-ring`; order is irrelevant. */
const rule = (primary) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, { actual: primary })) return;
  root.walkRules((r) => {
    const kids = r.nodes ?? [];
    if (
      !kids.some(
        (n) => n.type === 'atrule' && n.name === 'include' && /^focus-ring\b/.test(n.params),
      )
    )
      return;
    for (const n of kids) {
      if (n.type === 'decl' && n.prop === 'outline-offset') {
        stylelint.utils.report({ result, ruleName, node: n, message: messages.rejected });
      }
    }
  });
};
rule.ruleName = ruleName;
rule.messages = messages;

export default stylelint.createPlugin(ruleName, rule);
