# DropdownMenu Open-Only Entrance Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `DropdownMenu.Content` and `SubContent` open with a short scale-fade from the trigger side (140 ms `ease-out`), while keeping close instant.

**Architecture:** Pure CSS via `@starting-style` interpolates the panel from a translated/scaled/transparent state to its rest state on initial paint. Floating UI is reconfigured with `transform: false` so it positions via `top` / `left`, freeing `transform` for the entrance animation. The `data-side` attribute already set on Content drives a direction-aware `transform-origin` and translate offset.

**Tech Stack:** React 19, TypeScript, CSS Modules (SCSS), Vitest + Testing Library, `@floating-ui/react-dom`. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-19-dropdown-menu-open-animation-design.md`](../specs/2026-05-19-dropdown-menu-open-animation-design.md)

---

## Pre-flight (already done; do not re-do)

- ✅ Spec written and committed (`bf72f5b`).
- ✅ Branch `feat/dropdown-open-animation` created off fresh `main`.
- ✅ `--transition-base` (140ms ease-out) already exists in `tokens.scss`.
- ✅ `--opacity-disabled` (0.5) exists; this plan adds `--opacity-hidden` (0) alongside it.
- ✅ Confirmed: `DropdownMenu.test.tsx` uses `userEvent.click(trigger)` to open and `screen.getByRole('menu')` to access the floating Content.
- ✅ Confirmed: `data-side` is already written on Content (`Content.tsx:347`).

---

## Task 1: Add the `--opacity-hidden` token

**Files:**

- Modify: `packages/design-system/src/styles/tokens.scss`

- [ ] **Step 1: Locate the opacity token block**

In `tokens.scss`, find the line `--opacity-disabled: 0.5;` (around line 140). The new token goes next to it.

- [ ] **Step 2: Add `--opacity-hidden` directly after `--opacity-disabled`**

Replace the existing `--opacity-disabled: 0.5;` line with the pair:

```scss
--opacity-disabled: 0.5;
--opacity-hidden: 0;
```

Match the indentation of surrounding tokens (the block sits inside `:root { ... }`, so use the same leading whitespace as `--opacity-disabled`).

- [ ] **Step 3: Run stylelint to confirm the new token doesn't trip any rule**

```bash
make lint
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/styles/tokens.scss
git commit -m "tokens: add --opacity-hidden (0) alongside --opacity-disabled

Needed by the DropdownMenu open animation. Naming pairs with the
existing --opacity-disabled (0.5) token instead of inventing a new
prefix."
```

---

## Task 2: Switch Floating UI to `transform: false` and add a contract test

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/Content.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

The goal of this task is to make Floating UI position via inline `top` / `left` instead of `transform`. We do this first so the test that locks in the contract goes through TDD (red → green) cleanly.

- [ ] **Step 1: Add a failing test that asserts Content positions via `top`/`left`**

Open `DropdownMenu.test.tsx`. Find the end of the `describe('DropdownMenu — Content', ...)` block — its closing `});` is at the line just before `describe('DropdownMenu — Item / Separator', ...)`. Insert this new test just before the closing `});` of that block:

```tsx
it('positions Content via inline top/left, not transform (animation contract)', async () => {
  // Animation hooks `transform` for the scale-fade entrance. If Floating UI
  // ever switches back to transform-based positioning, our animation
  // transform would clobber the position. This test locks the contract in.
  const user = userEvent.setup();
  render(
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <button type="button">Open</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <div>menu body</div>
      </DropdownMenu.Content>
    </DropdownMenu>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const menu = screen.getByRole('menu');
  const style = menu.getAttribute('style') ?? '';
  expect(style).toMatch(/top:/);
  expect(style).toMatch(/left:/);
  // Floating UI writes either nothing or `transform: translate(...)` —
  // assert it does NOT contain a translate(...) (the giveaway signature
  // of transform-based positioning).
  expect(style).not.toMatch(/translate\(/);
});
```

- [ ] **Step 2: Run the new test and confirm it fails**

```bash
npm test -w @eocrm/design-system -- --run src/components/DropdownMenu/DropdownMenu.test.tsx -t "positions Content via inline top/left"
```

Expected: FAIL — the style attribute will contain `transform: translate(...)` from Floating UI's default behavior, so `not.toMatch(/translate\(/)` fails.

- [ ] **Step 3: Update `Content.tsx` — add `transform: false` to `useFloating`**

In `Content.tsx`, find the `useFloating({ ... })` call (around line 67). Add `transform: false` between `placement` and `middleware`:

```tsx
const {
  refs,
  floatingStyles,
  placement: resolvedPlacement,
} = useFloating({
  open: ctx.open,
  placement,
  transform: false,
  middleware: [
    offset(sideOffset),
    flip(),
    shift({ padding: 8 }),
    size({
      apply({ availableHeight, rects, elements }) {
        Object.assign(elements.floating.style, {
          maxHeight: `${availableHeight}px`,
          minWidth:
            typeof minWidth === 'number'
              ? `${minWidth}px`
              : ((minWidth as string | undefined) ?? `${rects.reference.width}px`),
        });
      },
      padding: 8,
    }),
  ],
  whileElementsMounted: autoUpdate,
  elements: { reference: ctx.triggerRef.current },
});
```

- [ ] **Step 4: Run the same test again and confirm it now passes**

```bash
npm test -w @eocrm/design-system -- --run src/components/DropdownMenu/DropdownMenu.test.tsx -t "positions Content via inline top/left"
```

Expected: PASS.

- [ ] **Step 5: Run the full DropdownMenu suite to confirm no regression**

```bash
npm test -w @eocrm/design-system -- --run src/components/DropdownMenu/DropdownMenu.test.tsx
```

Expected: all tests pass (the 100+ existing tests plus the new one).

- [ ] **Step 6: Run the full library suite to be doubly sure**

```bash
npm test -w @eocrm/design-system -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/Content.tsx packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx
git commit -m "DropdownMenu: position via top/left (transform: false) for animation

The entrance animation in the next commit uses CSS \`transform\` for
the scale-fade. Floating UI's default transform-based positioning
would override it, so switch to top/left positioning. Same auto-update
mechanism, different write target."
```

---

## Task 3: Add the entrance animation CSS

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss`

- [ ] **Step 1: Append the animation rules**

Append the following block to the END of `DropdownMenu.module.scss`. Do NOT modify the existing `.content` block; the new rules layer on top via cascade order.

```scss
// --- Open-only entrance animation -----------------------------------------
// Content (and SubContent, which composes it) animates in on mount. On close
// Content returns null — there is no exit animation by design.
//
// Floating UI positions via top/left (see `transform: false` in Content.tsx)
// so the `transform` property below is free for the scale + translate
// entrance without clobbering placement.
//
// @starting-style only applies when a transition is active. Under
// `prefers-reduced-motion: reduce` we kill the transition, which neutralises
// @starting-style — the panel renders directly at its computed style.
.content {
  transform: none;
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);
}

.content {
  @starting-style {
    opacity: var(--opacity-hidden);
  }
}

.content[data-side='bottom'] {
  transform-origin: top center;
  @starting-style {
    transform: scale(0.96) translateY(-4px);
  }
}
.content[data-side='top'] {
  transform-origin: bottom center;
  @starting-style {
    transform: scale(0.96) translateY(4px);
  }
}
.content[data-side='right'] {
  transform-origin: left center;
  @starting-style {
    transform: scale(0.96) translateX(-4px);
  }
}
.content[data-side='left'] {
  transform-origin: right center;
  @starting-style {
    transform: scale(0.96) translateX(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .content {
    transition: none;
  }
}
```

- [ ] **Step 2: Run stylelint**

```bash
make lint
```

Expected outcome — one of:

- PASS: stylelint accepts `@starting-style` and the new rules cleanly. Proceed.
- FAIL with `at-rule-no-unknown` complaining about `@starting-style`: fall through to Step 3.

- [ ] **Step 3: If stylelint blocked `@starting-style`, update `.stylelintrc.json`**

Open `/home/dpws/projects/design-system/.stylelintrc.json`. The top-level `rules` object currently does not configure `at-rule-no-unknown` explicitly (it inherits from `stylelint-config-standard-scss`). Add an explicit override that allows `@starting-style`:

```json
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["starting-style"]
      }
    ],
```

Place this entry in the `rules` object alongside the other top-level rule keys (next to `"color-function-notation"` for instance — order doesn't matter). Then re-run `make lint`. Expected: PASS.

If stylelint complains about `scss/at-rule-no-unknown` instead, repeat the same pattern with that key name. Use the failure message as the guide; do not guess at a third name if neither of those is what stylelint reports.

- [ ] **Step 4: Run the full library test suite**

```bash
npm test -w @eocrm/design-system -- --run
```

Expected: all tests pass (no regressions).

- [ ] **Step 5: Run typecheck and build**

```bash
npm run typecheck -w @eocrm/design-system && make build
```

Expected: exit 0 for both.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss
# If stylelint config was modified in step 3, also include:
git add .stylelintrc.json 2>/dev/null || true
git commit -m "DropdownMenu: scale-fade entrance via @starting-style

Content (and SubContent) animates from opacity-hidden + scale(0.96)
with a 4px directional translate to its rest state on mount.
data-side drives transform-origin so the panel always appears to grow
toward the trigger. 140ms ease-out via --transition-base. Closes
instantly by design. prefers-reduced-motion: reduce disables the
transition, which neutralises @starting-style (panel snaps in)."
```

---

## Task 4: Add a CSSOM test verifying `@starting-style` is present

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Add the test at the end of the `describe('DropdownMenu — Content', ...)` block**

Locate the `describe('DropdownMenu — Content', ...)` block. Insert this new test just before its closing `});` (same location strategy as Task 2's test):

```tsx
it('declares an @starting-style rule for the content selector (animation hook)', () => {
  // Animation is CSS-only and uses @starting-style for the entrance.
  // jsdom does not run the animation, but it does parse the rules into
  // CSSOM. Confirm the rule exists so a future refactor doesn't silently
  // drop the animation.
  render(
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <button type="button">Open</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <div>menu body</div>
      </DropdownMenu.Content>
    </DropdownMenu>,
  );

  let foundStartingStyle = false;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      // CSSStartingStyleRule has cssText starting with `@starting-style`.
      // We don't rely on a specific rule-type constant because jsdom's
      // CSSRule constants may not include CSSStartingStyleRule.
      const text = (rule as CSSRule).cssText ?? '';
      if (text.includes('@starting-style') && text.includes('content')) {
        foundStartingStyle = true;
        break;
      }
      // Walk into nested rules (e.g. inside another at-rule) in case the
      // CSS Modules processor wraps them.
      const inner = (rule as unknown as { cssRules?: CSSRuleList }).cssRules;
      if (inner) {
        for (const child of Array.from(inner)) {
          const childText = (child as CSSRule).cssText ?? '';
          if (childText.includes('@starting-style')) {
            foundStartingStyle = true;
            break;
          }
        }
      }
      if (foundStartingStyle) break;
    }
    if (foundStartingStyle) break;
  }
  expect(foundStartingStyle).toBe(true);
});
```

- [ ] **Step 2: Run the new test**

```bash
npm test -w @eocrm/design-system -- --run src/components/DropdownMenu/DropdownMenu.test.tsx -t "@starting-style"
```

Expected: PASS. If FAIL, the SCSS-to-CSSOM pipeline didn't include the rule. Two likely causes:

- The Vitest CSS Modules processor stripped the `@starting-style` block. Inspect the rendered stylesheet text to see what made it through; if needed, switch the assertion to match the substring more loosely (e.g. drop the `content` requirement and rely only on `@starting-style`).
- jsdom's CSS parser doesn't understand `@starting-style` and silently drops the rule. If this is the case, the test is unprovable in jsdom — replace it with a regex check against the raw SCSS file contents (read the file with `fs`, assert the string appears). That's a weaker but verifiable contract.

Use the actual failure output to decide which fallback to apply. Do not pre-emptively weaken the test.

- [ ] **Step 3: Run the full DropdownMenu test file to confirm no regressions**

```bash
npm test -w @eocrm/design-system -- --run src/components/DropdownMenu/DropdownMenu.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx
git commit -m "DropdownMenu: test @starting-style rule existence

Locks in the animation contract — a future SCSS refactor that drops
the @starting-style block will fail this test rather than silently
remove the entrance animation."
```

---

## Task 5: Visual verification in the playground

**Files:**

- (none — visual check only)

- [ ] **Step 1: Start the playground**

A dev server may already be running on port 8080 (vite HMR will pick up the new code automatically). Verify with:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080
```

If `200`, skip starting one. Otherwise run:

```bash
make dev
```

in a background terminal.

- [ ] **Step 2: Navigate to the DropdownMenu demo and verify open animations**

Open `http://localhost:8080/components/dropdown-menu` in a browser (or use Playwright MCP to drive it).

Check each:

1. Click a default-bottom-aligned trigger — panel scales/fades down from the trigger's bottom edge.
2. Click a trigger configured with `side="top"` (if the demo has one — otherwise rely on collision-flip near the viewport edge) — panel scales/fades up from the trigger's top edge.
3. Open a SubContent (hover or click a SubTrigger) — submenu scales/fades from its left edge (default `side="right"`).
4. Close any open menu — panel disappears instantly with no animation.

- [ ] **Step 3: Verify `prefers-reduced-motion`**

In Chrome/Edge DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → set to "reduce". Reopen a menu. Confirm: panel appears at its rest state with no animation.

- [ ] **Step 4: No commit needed — visual check only**

If any check fails, fix the underlying SCSS or JS, re-run gates from Task 3 / 4, then redo the visual check.

---

## Task 6: Update `AGENTS.md`

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Locate the DropdownMenu section**

Find `### `<DropdownMenu>` — action menus from a trigger` (around line 178 in the current `AGENTS.md`).

- [ ] **Step 2: Append one bullet to the existing bullet list in that section**

Find the last bullet of the DropdownMenu section — currently the line starting `- For value selection (pick a status, country, etc.), use \`<Select>\`...`. Insert a new bullet just before it (so the "use Select instead" guidance remains the last, most important bullet):

```markdown
- Opens with a short scale-fade from the trigger side (140 ms `ease-out`). Closes instantly by design — menu close should feel like "get out of the way", not "play a transition". Respects `prefers-reduced-motion: reduce`.
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: note DropdownMenu entrance animation"
```

---

## Task 7: Pre-push review-fix loop (mandatory per Hard Rule 8)

**Files:**

- (none — gates + reviewer dispatch + fixes)

This is **required** by `packages/design-system/CLAUDE.md` Hard Rule 8. The library is consumed by AI agents; missed token slips, broken JSDoc, or unintended cross-cutting changes propagate.

- [ ] **Step 1: Run all four gates**

```bash
npm test -w @eocrm/design-system -- --run \
  && npm run typecheck -w @eocrm/design-system \
  && make lint \
  && make build \
  && npm pack --dry-run -w @eocrm/design-system
```

All must pass. The `npm pack --dry-run` output must NOT contain `.test.tsx` files or internal-only paths.

- [ ] **Step 2: Dispatch a fresh-context review agent (`general-purpose`)**

Brief it as follows:

```
Review the changes on branch feat/dropdown-open-animation in packages/design-system/.

Read first:
- packages/design-system/CLAUDE.md (especially Hard Rule 8's 10 categories)
- packages/design-system/AGENTS.md
- packages/design-system/README.md
- docs/superpowers/specs/2026-05-19-dropdown-menu-open-animation-design.md

Then review the diff:
  git diff main...HEAD -- packages/design-system/ .stylelintrc.json

Categories:
1. Bugs / correctness — Floating UI transform: false behavior; @starting-style + transition interaction; rapid open/close behavior; submenu inheritance; portal/CSS Modules interaction.
2. Accessibility — animation doesn't break aria-controls, role="menu", focus management.
3. API consistency — no new public props or types.
4. Type safety.
5. Rule violations (Rules 1–7).
6. Test coverage — does the @starting-style test actually verify the contract under jsdom's limitations?
7. Token discipline — `--opacity-hidden: 0` naming, no other raw values.
8. SCSS quality — Rule 4 still respected. Cascade order between the existing `.content` block (top of file) and the new animation block (bottom).
9. Cross-package leakage — none expected; verify.
10. Package / distribution — `npm pack --dry-run` clean.

Output as Critical / Important / Nice-to-have / Regression-watch + final verdict
("clean enough to stop" OR "keep iterating"). Be specific (file:line).
```

- [ ] **Step 3: Fix every Critical and every Important finding**

For each finding:

- If valid: fix, re-stage, and create a NEW commit per the project's commit-message style.
- If deliberately skipped: leave a one-line justification in your response so the next reviewer doesn't re-flag it.

Nice-to-have is judgment; address when cheap.

- [ ] **Step 4: Re-run all four gates after fixes**

Same command as Step 1.

- [ ] **Step 5: Dispatch another fresh-context reviewer with the same brief**

Repeat from Step 2.

- [ ] **Step 6: Loop until verdict is `clean enough to stop`**

Exit criteria:

- 0 Critical, 0 Important (or each remaining has an explicit documented skip rationale)
- All four gates green
- `npm pack --dry-run` tarball clean

---

## Task 8: Push branch and open PR

**Files:**

- (none — git + gh)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/dropdown-open-animation
```

The Husky `pre-push` hook will run prettier, stylelint, and typecheck. If prettier fails, run `npx prettier --write <files>` and commit the formatting, then push again. Never use `--no-verify` without explicit user authorization.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "DropdownMenu: open-only entrance animation" --body "$(cat <<'EOF'
## Summary
- Top-level `Content` and `SubContent` open with a 140 ms `ease-out` scale-fade originating from the trigger side. Close is instant by design (see spec for rationale).
- CSS-only via `@starting-style`; the only JS change is `transform: false` on Floating UI so its inline positioning uses `top` / `left` instead of `transform`, freeing `transform` for the animation.
- Respects `prefers-reduced-motion: reduce`. No new public API. No new dependencies. No "animation engine."

Spec: [`docs/superpowers/specs/2026-05-19-dropdown-menu-open-animation-design.md`](../blob/feat/dropdown-open-animation/docs/superpowers/specs/2026-05-19-dropdown-menu-open-animation-design.md)

## Test plan
- [x] Existing DropdownMenu tests pass unchanged
- [x] New contract test: Floating UI writes `top` / `left`, not `transform`
- [x] New CSSOM test: `@starting-style` rule exists for the content selector
- [x] Full library suite green
- [x] Typecheck, stylelint, build, and `npm pack --dry-run` all clean
- [x] Husky pre-push hook green
- [x] Playground: visual check on each `data-side` plus reduced-motion emulation
- [x] Two-round pre-push review-fix loop complete; verdict: clean enough to stop

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

---

## Done criteria

- All 8 tasks' checkboxes ticked.
- PR open with `Quality / check` green.
- Open animation visible in playground for all four `side` values; reduced-motion path snaps in.

## Spec coverage check (self-review)

Mapping spec sections → tasks:

- Spec "Goal" → Tasks 3, 5.
- Spec "The one JS change" → Task 2.
- Spec "The CSS" → Tasks 1 (token), 3 (animation rules).
- Spec "Files changed" #1 → Task 2; #2 → Task 3; #3 → Tasks 2, 4; #4 → Task 6.
- Spec "Tests" — Floating UI top/left contract → Task 2; `@starting-style` rule existence → Task 4.
- Spec "Playground" → Task 5.
- Spec "Docs" → Task 6.
- Spec "Risks & mitigations" — stylelint trip → Task 3 Step 3; transform conflict → Task 2; etc.
- Spec "Acceptance" → Tasks 5, 7, 8.

No gaps.
