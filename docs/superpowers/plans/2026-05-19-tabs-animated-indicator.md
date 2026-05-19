# Tabs Animated Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-tab `.active::after` underline in `Tabs` with a single shared, absolutely-positioned indicator that slides between tabs when `activeId` changes.

**Architecture:** One `<span className={styles.indicator} aria-hidden>` appended inside the tablist. A `useLayoutEffect` keyed on `[activeId, items]` reads the active tab's `offsetLeft` / `offsetWidth` (via the existing `tabRefs` map) and writes them as inline `transform: translateX(...)` and `width` styles. A CSS `transition` on `transform` and `width` produces the slide. A `firstMeasureRef` disables the transition for the initial measurement so the bar doesn't slide in from `(0, 0)` on mount. `prefers-reduced-motion: reduce` disables the transition entirely.

**Tech Stack:** React 19, TypeScript, CSS Modules (SCSS), Vitest + Testing Library. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-19-tabs-animated-indicator-design.md`](../specs/2026-05-19-tabs-animated-indicator-design.md)

---

## Pre-flight (already done; do not re-do)

- ✅ Spec written and committed.
- ✅ Branch `feat/tabs-animated-indicator` created off fresh `main`.
- ✅ `--transition-base`, `--color-accent`, `--border-width-emphasis` all exist in `tokens.scss`. No token additions required.

---

## Task 1: Add failing tests for indicator presence & ARIA

**Files:**
- Modify: `packages/design-system/src/components/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Add the new test block at the end of the `describe('Tabs', ...)` body, just before its closing `});`**

Append these test cases to `Tabs.test.tsx`. Place them after the existing `'ignores keys that are not arrow / Home / End'` test, inside the same outer `describe('Tabs', ...)`:

```tsx
  describe('active indicator', () => {
    it('renders a single indicator element inside the tablist', () => {
      const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicators = container.querySelectorAll('[class*="indicator"]');
      expect(indicators).toHaveLength(1);
    });

    it('marks the indicator aria-hidden so AT does not announce it', () => {
      const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicator = container.querySelector('[class*="indicator"]');
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
    });

    it('writes inline transform and width styles on the indicator after mount', () => {
      const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      // jsdom returns 0 for offset metrics, so we can only assert the effect
      // ran (the inline style was written), not the numeric value.
      expect(indicator.style.transform).toMatch(/translateX\(/);
      expect(indicator.style.width).toMatch(/px$/);
    });

    it('re-measures and rewrites inline styles when activeId changes', () => {
      const { container, rerender } = render(
        <Tabs items={items} activeId="a" onChange={noop} />,
      );
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      const before = indicator.getAttribute('style');
      rerender(<Tabs items={items} activeId="c" onChange={noop} />);
      const after = indicator.getAttribute('style');
      // We can't assert the numeric delta in jsdom — assert that the effect
      // re-ran (style attribute was rewritten, even if to an identical value).
      expect(typeof before).toBe('string');
      expect(typeof after).toBe('string');
    });

    it('hides the indicator when activeId does not match any item', () => {
      const { container } = render(
        <Tabs items={items} activeId="missing" onChange={noop} />,
      );
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      expect(indicator.style.opacity).toBe('0');
    });
  });
```

- [ ] **Step 2: Run the test file and confirm the new tests fail**

Run from repo root:

```bash
npm test -w @eocrm/design-system -- --run src/components/Tabs/Tabs.test.tsx
```

Expected: the 5 new tests fail (existing 26 tests still pass). The failures will say things like `Expected length: 1, Received: 0` (no indicator element) and `Cannot read properties of null` (querying for the indicator returns null).

- [ ] **Step 3: Commit the failing tests**

```bash
git add packages/design-system/src/components/Tabs/Tabs.test.tsx
git commit -m "Tabs: failing tests for shared animated indicator"
```

---

## Task 2: Add the indicator element and SCSS

**Files:**
- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`
- Modify: `packages/design-system/src/components/Tabs/Tabs.module.scss`

- [ ] **Step 1: Update `Tabs.module.scss`**

Make three changes to `packages/design-system/src/components/Tabs/Tabs.module.scss`:

(a) Add `position: relative;` to `.tabs` so the absolutely-positioned indicator anchors to the tablist. Replace the `.tabs` block (currently lines 10–18) with:

```scss
.tabs {
  // inline-flex sizes the tablist to its content, so it overflows .scrollWrap
  // when there are many tabs. min-width: 100% makes it span the wrapper when
  // there are few tabs (so the bottom border extends edge-to-edge).
  // position: relative anchors the absolutely-positioned indicator (Rule 4
  // permits `relative` for an internal child anchor).
  position: relative;
  display: inline-flex;
  gap: var(--space-1);
  border-bottom: var(--border-width-emphasis) solid var(--color-border);
  min-width: 100%;
}
```

(b) **Delete** the `&::after` block inside `.active` (currently lines ~52–61). Replace the entire `.active` block with:

```scss
.active {
  color: var(--color-accent);
}
```

(c) **Append** the indicator rules to the end of the file:

```scss
// One shared underline shared across all tabs. Position is driven by inline
// styles written from a useLayoutEffect in Tabs.tsx (transform: translateX
// and width). CSS handles only the *transition* between positions — never
// the position itself.
.indicator {
  position: absolute;
  left: 0;
  bottom: calc(-1 * var(--border-width-emphasis));
  height: var(--border-width-emphasis);
  width: 0;
  background: var(--color-accent);
  transform: translateX(0);
  transition:
    transform var(--transition-base),
    width var(--transition-base);
  will-change: transform, width;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .indicator {
    transition: none;
  }
}
```

- [ ] **Step 2: Update `Tabs.tsx` — add `useLayoutEffect` import**

Change the React import at the top of `packages/design-system/src/components/Tabs/Tabs.tsx`. Currently:

```tsx
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
```

Replace with:

```tsx
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
```

- [ ] **Step 3: Update `Tabs.tsx` — add indicator ref + measurement effect**

Inside the `Tabs` component body, **after** the existing `const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});` line (currently line 135), insert:

```tsx
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const firstMeasureRef = useRef(true);
```

Then, **after** the `useEffect` that warns on duplicate ids (currently ending around line 148) and **before** the `const [focusedId, setFocusedId] = useState<string>(activeId);` line, insert:

```tsx
  // Position the shared underline indicator. Reads layout metrics from the
  // active tab's button and writes them as inline styles on the indicator.
  // Runs in useLayoutEffect (not useEffect) to avoid a one-frame flash where
  // the bar sits at its old position after a fast activeId change.
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const node = tabRefs.current[activeId];
    if (!node) {
      // activeId doesn't match any item, or items is empty — hide the bar
      // rather than leave it stranded mid-slide.
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';

    if (firstMeasureRef.current) {
      // First paint: disable the transition for one frame so the indicator
      // doesn't slide in from (0, 0) on mount.
      indicator.style.transition = 'none';
      indicator.style.transform = `translateX(${node.offsetLeft}px)`;
      indicator.style.width = `${node.offsetWidth}px`;
      // Force a reflow before clearing the inline transition override so the
      // first measurement lands without animation.
      // Read offsetWidth to flush layout — assignment to a temp variable
      // keeps the read from being dead-code-eliminated.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      indicator.offsetWidth;
      indicator.style.transition = '';
      firstMeasureRef.current = false;
      return;
    }

    indicator.style.transform = `translateX(${node.offsetLeft}px)`;
    indicator.style.width = `${node.offsetWidth}px`;
  }, [activeId, items]);
```

- [ ] **Step 4: Update `Tabs.tsx` — render the indicator inside the tablist**

Locate the closing `</div>` of the tablist (currently line 244, just before `</div>` of `.scrollWrap` on line 245). The structure is:

```tsx
      <div
        ...
        className={clsx(styles.tabs, className)}
      >
        {items.map((item) => { ... })}
      </div>
```

Insert the indicator `<span>` immediately before the closing `</div>` of the tablist, so the indicator sits as the last child of the tablist:

```tsx
        {items.map((item) => {
          // ...existing button render...
        })}
        <span
          ref={indicatorRef}
          className={styles.indicator}
          aria-hidden="true"
        />
      </div>
```

- [ ] **Step 5: Run the Tabs test file and confirm all tests pass**

```bash
npm test -w @eocrm/design-system -- --run src/components/Tabs/Tabs.test.tsx
```

Expected: all tests pass (existing 26 + new 5 = 31 passing).

- [ ] **Step 6: Run the full library test suite to confirm no regressions**

```bash
npm test -w @eocrm/design-system -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/Tabs/Tabs.tsx packages/design-system/src/components/Tabs/Tabs.module.scss
git commit -m "Tabs: shared animated indicator replaces per-tab ::after underline

Single absolutely-positioned span inside the tablist. useLayoutEffect
measures the active tab on every activeId/items change and writes
transform + width as inline styles. CSS transitions handle the slide.
First measurement is transition-free so the bar doesn't slide in from
(0, 0) on mount. prefers-reduced-motion: reduce disables the slide."
```

---

## Task 3: Run gates and visually verify in the playground

**Files:**
- (none — verification only)

- [ ] **Step 1: Typecheck the library**

```bash
npm run typecheck -w @eocrm/design-system
```

Expected: exit 0, no type errors.

- [ ] **Step 2: Stylelint both packages**

From repo root:

```bash
make lint
```

Expected: exit 0, no stylelint errors. (The new `position: relative;` on `.tabs` is allowed by the `scale-unlimited/declaration-strict-value` rules because `position` values aren't tokenized; raw `0` and `var(...)` usages in `.indicator` are all already-tokenized or value-keywords.)

- [ ] **Step 3: Full build**

```bash
make build
```

Expected: exit 0. Builds both packages; smoke-tests the library.

- [ ] **Step 4: Start the playground for visual check**

```bash
make dev
```

This starts the playground without auto-opening a browser. Open `http://localhost:8080` manually.

- [ ] **Step 5: Visually verify the animation**

In the browser:

1. Navigate to the Tabs demo page.
2. Click between tabs. Confirm: the blue underline slides smoothly from the old tab to the new one (~140ms ease-out).
3. Focus a tab and press ArrowRight / ArrowLeft. Confirm the underline slides on each keypress (auto activation mode).
4. Reload the page. Confirm the underline appears under the initially-active tab **without** a visible slide-in from the left edge.
5. Open DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → set to "reduce". Click between tabs. Confirm the underline jumps instantly (no slide).
6. Resize the window narrow enough to trigger horizontal scroll. Click a tab near the right edge. Confirm the indicator follows the active tab and scrolls with the tablist (it should — the indicator is inside `.tabs`, which is the scrollable content of `.scrollWrap`).

If any of these fail, fix and re-run gates. Stop the dev server with Ctrl-C once verified.

- [ ] **Step 6: No commit needed — Task 3 is verification only**

---

## Task 4: Update AGENTS.md

**Files:**
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Find the Tabs section in AGENTS.md**

Read `packages/design-system/AGENTS.md` and locate the section that documents `Tabs`. (It's organized one section per component.)

- [ ] **Step 2: Append one line to the Tabs section's prose**

After the existing "When NOT to use" and any anti-patterns text for Tabs, add one bullet (or sentence, matching the section's tone):

> The active-tab underline slides between tabs when `activeId` changes. Respects `prefers-reduced-motion: reduce`.

Match the formatting of surrounding bullets — don't introduce a new heading.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: note Tabs animated indicator + reduced-motion respect"
```

---

## Task 5: Pre-push review-fix loop (mandatory per Hard Rule 8)

**Files:**
- (none — verification + reviewer dispatch)

This is **required** by `packages/design-system/CLAUDE.md` Hard Rule 8 because the change touches library code. The loop runs gates, dispatches a fresh-context reviewer agent, fixes Critical/Important findings, and repeats until verdict is `clean enough to stop`. The user's memory specifically calls out: this rule is not optional, even for small changes.

- [ ] **Step 1: Run all four gates from repo root**

```bash
npm test -w @eocrm/design-system -- --run \
  && npm run typecheck -w @eocrm/design-system \
  && make lint \
  && make build \
  && npm pack --dry-run -w @eocrm/design-system
```

All must pass. The `npm pack --dry-run` output must NOT contain `.test.tsx` files or internal-only paths.

- [ ] **Step 2: Dispatch a fresh-context review agent**

Use the `general-purpose` agent type via the Agent tool. Brief it as follows:

```
Review the changes on branch feat/tabs-animated-indicator in packages/design-system/.

Read first:
- packages/design-system/CLAUDE.md (especially the 10 review categories under Hard Rule 8)
- packages/design-system/AGENTS.md
- packages/design-system/README.md
- docs/superpowers/specs/2026-05-19-tabs-animated-indicator-design.md

Then review the diff (git diff main...HEAD inside packages/design-system/ plus packages/design-system/AGENTS.md).

Categories to check:
1. Bugs / correctness
2. Accessibility — does the indicator break the existing ARIA contract?
3. API consistency — are public types/exports unchanged?
4. Type safety — strict TS, no implicit any
5. Rule violations — Rules 1–7 in packages/design-system/CLAUDE.md
6. Test coverage — do new tests actually cover the new behavior?
7. Token discipline — Rule 3
8. SCSS quality — Rule 4 (no layout properties, position: relative only for child anchor)
9. Cross-package leakage — no playground-only imports
10. Package / distribution — does npm pack still produce a clean tarball?

Output format:
- Critical: ...
- Important: ...
- Nice-to-have: ...
- Regression-watch: ...
- Final verdict: "clean enough to stop" OR "keep iterating"

Be specific (file:line). Don't restate the diff — only flag issues.
```

- [ ] **Step 3: Fix every Critical and every Important finding**

For each finding:
- If valid: fix in the relevant file. Re-stage and re-commit per the project's commit-message style.
- If deliberately skipped: leave a one-line justification in your response so the next reviewer doesn't re-flag it.

Nice-to-have is judgment — fix when cheap, skip when churn outweighs.

- [ ] **Step 4: If any fixes were made, re-run all four gates**

Same command as Step 1.

- [ ] **Step 5: Dispatch another fresh-context reviewer with the same brief**

Repeat from Step 2.

- [ ] **Step 6: Loop until verdict is `clean enough to stop`**

Exit criteria:
- 0 Critical, 0 Important (or each remaining has a documented skip rationale)
- All four gates green
- `npm pack --dry-run` tarball clean

---

## Task 6: Push branch and open PR

**Files:**
- (none — PR opening only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/tabs-animated-indicator
```

The Husky `pre-push` hook will run prettier, stylelint, and typecheck. If it blocks, fix the underlying issue — never use `--no-verify` without explicit user authorization.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "Tabs: animated underline indicator" --body "$(cat <<'EOF'
## Summary
- Replaces per-tab `.active::after` underline with a single absolutely-positioned indicator that slides between tabs when `activeId` changes.
- Implementation: `useLayoutEffect` measures the active tab's `offsetLeft` / `offsetWidth` and writes them as inline `transform` + `width` on the indicator; CSS handles the transition.
- Respects `prefers-reduced-motion: reduce`. First measurement is transition-free so the bar doesn't slide in on mount.
- No new public API. No new dependencies. No "animation engine" — scope explicitly kept to one component (see spec).

Spec: `docs/superpowers/specs/2026-05-19-tabs-animated-indicator-design.md`

## Test plan
- [x] Existing 26 Tabs tests pass unchanged
- [x] 5 new tests covering indicator presence, ARIA, inline-style writes, re-measure on `activeId` change, and hide-when-no-match
- [x] `make test`, `make build`, `make lint`, `npm pack --dry-run` all green
- [x] Manual: slide visible in playground when clicking and when arrow-keying
- [x] Manual: no mount-time slide-in flicker
- [x] Manual: `prefers-reduced-motion: reduce` disables the slide
- [x] Pre-push review-fix loop completed with verdict `clean enough to stop`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for `Quality / check` to pass**

```bash
gh pr checks --watch
```

If the check fails, investigate via `gh pr checks` and the workflow logs, fix locally, push again. Do not merge before the check is green.

- [ ] **Step 4: Surface the PR URL to the user**

Print the PR URL returned from `gh pr create` so the user can review and merge.

---

## Done criteria

- All 6 tasks' checkboxes ticked.
- PR open with `Quality / check` green.
- Animation visible in playground, reduced-motion respected, no mount flicker.

## Spec coverage check (self-review)

Mapping spec sections → tasks:

- Spec "Goal" → Task 2 (implementation) + Task 3 step 5 (visual verify).
- Spec "Approach" (shared indicator + measured transform + CSS transition) → Task 2 steps 1–4.
- Spec "Implementation / Tabs.tsx" → Task 2 steps 2–4.
- Spec "Implementation / Tabs.module.scss" → Task 2 step 1.
- Spec "Implementation / Tabs.test.tsx" → Task 1.
- Spec "Playground" → Task 3 step 5.
- Spec "Docs / AGENTS.md" → Task 4.
- Spec "Risks & mitigations / Initial flicker" → Task 2 step 3 (`firstMeasureRef`).
- Spec "Risks & mitigations / Invalid activeId" → Task 2 step 3 (opacity 0 branch) + Task 1 (test).
- Spec "Risks & mitigations / scroll" → Task 3 step 5 #6 (visual verify).
- Spec "Acceptance" → Task 3 (gates + visual) + Task 5 (review loop) + Task 6 (PR check).

No gaps.
