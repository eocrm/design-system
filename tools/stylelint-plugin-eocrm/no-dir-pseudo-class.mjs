import stylelint from 'stylelint';

export const ruleName = 'eocrm/no-dir-pseudo-class';
export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: 'use [dir="rtl"] / logical properties instead of :dir()',
});

/** Raw-selector check: catches `#{&}:dir(rtl)`, which the built-in list skips as non-standard. */
const rule = (primary) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, { actual: primary })) return;
  root.walkRules((r) => {
    if (/:dir\(/i.test(r.selector)) {
      stylelint.utils.report({ result, ruleName, node: r, message: messages.rejected });
    }
  });
};
rule.ruleName = ruleName;
rule.messages = messages;

export default stylelint.createPlugin(ruleName, rule);
