import { resolve } from 'node:path';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';

/**
 * Selector specificity as `[ids, classes+attrs+pseudo-classes, elements]`.
 *
 * `:where(...)` contributes ZERO specificity — the whole construct
 * (including its contents) is stripped before counting anything, matching
 * the CSS spec's explicit carve-out for `:where()` (unlike `:is()`/`:not()`,
 * which count the specificity of their most specific argument — out of
 * scope here, since none of this file's selectors use them). Good enough
 * for the selectors this suite compiles; not a general CSS specificity
 * calculator.
 */
type Specificity = readonly [ids: number, classes: number, elements: number];

function specificity(selector: string): Specificity {
  // Strip every `:where(...)` (and its contents) first — it counts as
  // nothing, so removing it up front keeps the rest of the counting exactly
  // the normal CSS algorithm.
  let s = selector.replace(/:where\([^()]*\)/g, '');
  // A nested-paren `:where(...)` isn't stripped by the regex above and would
  // be mis-counted silently — fail loudly instead.
  if (s.includes(':where('))
    throw new Error(`specificity(): unsupported nested :where in ${selector}`);

  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  s = s.replace(/#[\w-]+/g, '');

  let classes = (s.match(/\.[\w-]+/g) ?? []).length;
  s = s.replace(/\.[\w-]+/g, '');

  // Attribute selectors count in the same column as classes.
  classes += (s.match(/\[[^\]]*\]/g) ?? []).length;
  s = s.replace(/\[[^\]]*\]/g, '');

  // Pseudo-elements (`::before`) count as elements — strip before
  // pseudo-classes so a leading `:` isn't double-matched.
  const pseudoElements = (s.match(/::[\w-]+/g) ?? []).length;
  s = s.replace(/::[\w-]+/g, '');

  classes += (s.match(/:[\w-]+(\([^)]*\))?/g) ?? []).length;
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, '');

  const elements = pseudoElements + (s.match(/[a-zA-Z][\w-]*/g) ?? []).length;

  return [ids, classes, elements];
}

/** Lexicographic (ids, classes, elements) compare: negative if `a` < `b`. */
function compareSpecificity(a: Specificity, b: Specificity): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

describe('specificity() helper', () => {
  it('gives :where(...) zero specificity, including its contents', () => {
    expect(specificity(':where(a:hover)')).toEqual([0, 0, 0]);
  });

  it('does not count a bare element selector when only a trailing :where() is stripped', () => {
    expect(specificity('a:where(:hover)')).toEqual([0, 0, 1]);
  });

  it('counts classes and pseudo-classes together, in the same column', () => {
    expect(specificity('.link.underlineNone:hover')).toEqual([0, 3, 0]);
  });

  it('counts a single class as (0,1,0)', () => {
    expect(specificity('.link')).toEqual([0, 1, 0]);
  });
});

const typographyCss = compile(resolve(__dirname, 'typography.scss')).css;
const typographyRoot = parse(typographyCss);
const typographyRules: Rule[] = [];
typographyRoot.walkRules((rule) => {
  typographyRules.push(rule);
});

const atRestA = typographyRules.find((rule) => rule.selector === 'a');
const hoverRule = typographyRules.find(
  (rule) =>
    rule.selectors.some((selector) => selector.includes(':hover')) &&
    rule.nodes.some((node) => node.type === 'decl' && node.prop === 'text-decoration'),
);

describe('typography.scss global anchor hover rule (#584, #592)', () => {
  it('both the at-rest `a` rule and the global hover rule exist', () => {
    expect(atRestA).toBeDefined();
    expect(hoverRule).toBeDefined();
  });

  it("the hover rule's specificity is >= the at-rest `a` rule's, and it comes later in source (so it wins the tie)", () => {
    const atRestSpec = specificity(atRestA!.selector);
    for (const selector of hoverRule!.selectors) {
      expect(compareSpecificity(specificity(selector), atRestSpec)).toBeGreaterThanOrEqual(0);
    }
    expect(typographyRules.indexOf(hoverRule!)).toBeGreaterThan(typographyRules.indexOf(atRestA!));
  });

  it("the hover rule's specificity stays BELOW a single component class (0,1,0), so `.link:hover` / `.button:hover` / `.linkCard:hover` always win regardless of source order", () => {
    for (const selector of hoverRule!.selectors) {
      expect(compareSpecificity(specificity(selector), [0, 1, 0])).toBeLessThan(0);
    }
  });
});

describe('Link out-specifies the global anchor hover rule regardless (#584)', () => {
  const linkCss = compile(resolve(__dirname, '../components/Link/Link.module.scss')).css;
  const linkRoot = parse(linkCss);
  const linkRules: Rule[] = [];
  linkRoot.walkRules((rule) => {
    linkRules.push(rule);
  });

  // The floor every Link variant has to beat, taken from the compiled global
  // rule above rather than hardcoded, so this stays correct if the global
  // rule's shape ever changes.
  const hoverFloor = specificity(hoverRule!.selectors[0]!);

  it('`.link.underlineNone:hover` out-specifies the global hover rule', () => {
    const rule = linkRules.find((r) => r.selector === '.link.underlineNone:hover');
    expect(rule).toBeDefined();
    expect(compareSpecificity(specificity(rule!.selector), hoverFloor)).toBeGreaterThan(0);
  });

  it('`.muted` never shows the global hover underline: the base `.link` rule sets text-decoration: none, applies while hovered too, and already out-specifies the global hover rule', () => {
    const linkBase = linkRules.find((r) => r.selector === '.link');
    expect(linkBase).toBeDefined();
    const setsNoDecoration = linkBase!.nodes.some(
      (node) => node.type === 'decl' && node.prop === 'text-decoration' && node.value === 'none',
    );
    expect(setsNoDecoration).toBe(true);
    expect(compareSpecificity(specificity(linkBase!.selector), hoverFloor)).toBeGreaterThan(0);
  });
});
