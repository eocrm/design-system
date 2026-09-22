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
    // hasContent(true) === true even though React renders a bare boolean
    // child as nothing — same as `Boolean(x)` everywhere else in this
    // library (round-1 `error={cond && msg}` relies on the same rule the
    // other way). Not chased: a top-level `label={true}` is not a shape
    // anyone writes, unlike the empty-container cases this predicate exists
    // to close.
    expect(hasContent(true)).toBe(true);
    expect(hasContent('x')).toBe(true);
    expect(hasContent(<div />)).toBe(true);
  });
});

describe('hasContent — iterables: only RE-ITERABLE containers are inspected (round 9)', () => {
  it('is false for an empty array, Set, or Map, and for one of only-falsy elements', () => {
    expect(hasContent([])).toBe(false);
    expect(hasContent([false, false])).toBe(false);
    expect(hasContent([0, NaN, ''])).toBe(false);
    expect(hasContent(new Set())).toBe(false);
    expect(hasContent(new Map())).toBe(false);
  });

  it('is true for an array, Set, or Map containing one truthy element, however deep', () => {
    expect(hasContent(['x'])).toBe(true);
    expect(hasContent([false, 'x'])).toBe(true);
    expect(hasContent([[]])).toBe(false);
    expect(hasContent([['x']])).toBe(true);
    expect(hasContent(new Set(['x']))).toBe(true);
    // A Map used DIRECTLY (not `.values()`) is re-iterable, unlike the
    // one-shot iterator its own `.values()`/`.entries()` returns — its
    // default iteration yields `[k, v]` tuples, themselves arrays this
    // recurses into. React dev-warns rendering a Map directly regardless
    // ("Using Maps as children is not supported"), same caveat as an
    // iterator, but it IS type-legal input and this predicate handles it
    // correctly if it's passed.
    expect(hasContent(new Map([['k', 'x']]))).toBe(true);
  });

  it('inspecting an array or Set does not consume it — reading it twice still sees the same content', () => {
    // The round-9 regression, at the type level this fix protects against:
    // a re-iterable container must survive `hasContent` reading it AND React
    // later rendering it. Assert both reads independently agree.
    const arr = ['x'];
    expect(hasContent(arr)).toBe(true);
    expect(hasContent(arr)).toBe(true);
    const set = new Set(['x']);
    expect(hasContent(set)).toBe(true);
    expect(hasContent(set)).toBe(true);
  });

  it('a one-shot iterator (generator, Map.values()) is ALWAYS present, empty or not — the documented, unavoidable limit', () => {
    // Round 8 spread the iterator to inspect it, correctly detecting an
    // EMPTY one-shot iterator as absent — but spreading DRAINS it, so React
    // then rendered the same, now-exhausted iterator and got nothing: a
    // non-empty generator silently produced an empty <label>. Regression,
    // reverted. A one-shot iterator can't be probed without being spent, so
    // it's not inspected at all here — it falls to `Boolean(n)`, `true` for
    // any object, matching what an untouched iterator does when React reads
    // it. See a RENDER-level (not predicate-level) test of this in
    // Field.test.tsx / SettingRow.test.tsx — a predicate-only assertion
    // can't see the class of bug this was.
    expect(
      hasContent(
        (function* () {
          /* empty */
        })(),
      ),
    ).toBe(true);
    expect(hasContent(new Map().values())).toBe(true);
    expect(
      hasContent(
        (function* () {
          yield 'x';
        })(),
      ),
    ).toBe(true);
    expect(hasContent(new Map([['k', 'x']]).values())).toBe(true);
  });
});

describe('hasContent — Fragment recursion (Important 2: the Fragment-type check and its recursion body are pinned)', () => {
  // Not "both conjuncts": `isValidElement(n)` in `isValidElement(n) &&
  // n.type === Fragment` isn't independently testable — no type-legal
  // ReactNode other than a real element can carry `.type === Fragment`, so
  // dropping just `isValidElement(n)` is an equivalent mutant, not a killed
  // one (round 10 review). What IS pinned below: the `n.type === Fragment`
  // check itself (a childless non-Fragment element stays present) and the
  // recursion body (a Fragment WITH content stays present).
  it('is false for an empty fragment, however nested', () => {
    // (A keyed `<Fragment key="k" />` isn't asserted separately — a key
    // never reaches `props.children`, so it can't fail independently of the
    // plain `<Fragment />` case above.)
    expect(hasContent(<></>)).toBe(false);
    expect(hasContent(<Fragment />)).toBe(false);
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
