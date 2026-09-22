import { Fragment } from 'react';
import { hasContent } from './fieldWiring';

// hasContent has no test file of its own even though it drives hasLabel /
// hasDescription / hasError across two components and three slots — its
// entire contract used to be asserted only indirectly, through whatever
// inputs Field.test.tsx and SettingRow.test.tsx happened to exercise. Round
// 8 review: that is how the iterable branch (Important 1) and the Fragment
// conjunct (Important 2) both shipped untested. Pin every branch directly,
// both directions, here.

describe('hasContent — Boolean(n) fallback (unchanged from round 7)', () => {
  it('is false for every falsy scalar', () => {
    expect(hasContent(null)).toBe(false);
    expect(hasContent(undefined)).toBe(false);
    expect(hasContent(false)).toBe(false);
    expect(hasContent('')).toBe(false);
    expect(hasContent(0)).toBe(false);
    expect(hasContent(NaN)).toBe(false);
  });

  it('is true for a truthy scalar or a real element', () => {
    expect(hasContent(true)).toBe(true);
    expect(hasContent('x')).toBe(true);
    expect(hasContent(<span />)).toBe(true);
  });
});

describe('hasContent — iterables (round 8: any iterable, not just Array.isArray)', () => {
  it('is false for an empty array, and for an array of only-falsy elements', () => {
    expect(hasContent([])).toBe(false);
    expect(hasContent([false, false])).toBe(false);
    expect(hasContent([0, NaN, ''])).toBe(false);
  });

  it('is true for an array containing one truthy element, however deep', () => {
    expect(hasContent(['x'])).toBe(true);
    expect(hasContent([false, 'x'])).toBe(true);
    expect(hasContent([[]])).toBe(false);
    expect(hasContent([['x']])).toBe(true);
  });

  it('is false for an empty non-array iterable — Set, Map values, a generator (Important 1)', () => {
    expect(hasContent(new Set())).toBe(false);
    expect(hasContent(new Map().values())).toBe(false);
    expect(
      hasContent(
        (function* () {
          /* empty */
        })(),
      ),
    ).toBe(false);
  });

  it('is true for a non-empty non-array iterable', () => {
    expect(hasContent(new Set(['x']))).toBe(true);
    expect(hasContent(new Map([['k', 'x']]).values())).toBe(true);
    expect(
      hasContent(
        (function* () {
          yield 'x';
        })(),
      ),
    ).toBe(true);
  });
});

describe('hasContent — Fragment recursion (Important 2: both conjuncts pinned)', () => {
  it('is false for an empty fragment, however nested', () => {
    expect(hasContent(<></>)).toBe(false);
    expect(hasContent(<Fragment />)).toBe(false);
    expect(hasContent(<Fragment key="k" />)).toBe(false);
    expect(
      hasContent(
        <>
          <></>
        </>,
      ),
    ).toBe(false);
    expect(hasContent(<>{[]}</>)).toBe(false);
    expect(hasContent(<>{0}</>)).toBe(false);
    expect(hasContent(<>{false}</>)).toBe(false);
    expect(hasContent([<></>])).toBe(false);
  });

  it('is true for a fragment with real content — recursion conjunct', () => {
    // Mutating `n.type === Fragment` away (so this recurses into EVERY
    // element) would make `<span>x</span>` collapse to hasContent(x's
    // children) too, but that is covered by the childless-element test
    // below going the other way; this test alone pins that a fragment
    // WITH content stays present.
    expect(
      hasContent(
        <>
          Work <b>email</b>
        </>,
      ),
    ).toBe(true);
    expect(hasContent(<>{'x'}</>)).toBe(true);
  });

  it('is true for a childless real (non-fragment) element — the Fragment-type conjunct, not "any element recurses"', () => {
    // Mutating away the `n.type === Fragment` check (leaving bare
    // `isValidElement(n)`) makes hasContent recurse into ANY element's
    // children, so a childless <span /> would go from true to false. This
    // is the documented `<span />` limit — pinned here, not just in prose.
    expect(hasContent(<span />)).toBe(true);
  });
});
