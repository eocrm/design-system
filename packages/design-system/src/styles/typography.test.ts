import { resolve } from 'node:path';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';

describe('typography.scss global anchor rules', () => {
  const css = compile(resolve(__dirname, 'typography.scss')).css;
  const root = parse(css);

  it('wraps every global hover rule that sets text-decoration in :where() (zero specificity)', () => {
    const decorationHoverRules: Rule[] = [];
    root.walkRules((rule) => {
      const touchesHover = rule.selectors.some((selector) => selector.includes(':hover'));
      const setsDecoration = rule.nodes.some(
        (node) => node.type === 'decl' && node.prop === 'text-decoration',
      );
      if (touchesHover && setsDecoration) decorationHoverRules.push(rule);
    });

    // Sanity: the global underline-on-hover rule this test guards against
    // still exists (issue #584's root cause), it's just been neutered.
    expect(decorationHoverRules.length).toBeGreaterThan(0);

    for (const rule of decorationHoverRules) {
      for (const selector of rule.selectors) {
        expect(selector).toMatch(/^:where\(.*:hover.*\)$/);
      }
    }
  });

  it('does not wrap the at-rest `a` rule (it is already lower specificity than any component class)', () => {
    const atRestRule = root.nodes.find(
      (node): node is Rule => node.type === 'rule' && node.selector === 'a',
    );
    expect(atRestRule).toBeDefined();
  });
});
