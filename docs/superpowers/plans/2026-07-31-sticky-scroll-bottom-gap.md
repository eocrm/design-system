# Sticky Scroll Bottom Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Sticky's scroll cap use a small bottom gap independently of a top offset that includes pinned chrome clearance.

**Architecture:** Keep the existing selected top offset in `--sticky-offset`. Update both viewport cap declarations to subtract that once plus an optional `--sticky-bottom-gap`, falling back to `--sticky-offset` for complete backward compatibility.

**Tech Stack:** SCSS modules/custom properties, React/TypeScript JSDoc, Vitest source-contract tests, Playwright/Chrome.

## Global Constraints

- Existing consumers that do not set `--sticky-bottom-gap` must retain symmetric cap behavior.
- Both `100vh` fallback and `100dvh` declarations must use the separated formula.
- Add no React prop, dependency, user-facing string, or raw spacing value.
- Document the opt-in custom property and validate the measured 72px top / 16px bottom case.

---

### Task 1: Add a failing CSS contract test

**Files:**

- Modify: `packages/design-system/src/components/Sticky/Sticky.test.tsx`

**Interfaces:**

- Produces: source-level protection for both viewport-unit declarations and the backward-compatible fallback.

- [ ] Add a test that reads `Sticky.module.scss` and expects both cap declarations to subtract `var(--sticky-offset, 0px)` plus `var(--sticky-bottom-gap, var(--sticky-offset, 0px))`.
- [ ] Run `npm test --workspace @eocrm/design-system -- Sticky/Sticky.test.tsx` and confirm failure against the current doubled-offset formula.

### Task 2: Separate the bottom gap and document it

**Files:**

- Modify: `packages/design-system/src/components/Sticky/Sticky.module.scss`
- Modify: `packages/design-system/src/components/Sticky/Sticky.tsx`
- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/playground/src/pages/components/StickyDemo.tsx`

**Interfaces:**

- Consumes: optional CSS custom property `--sticky-bottom-gap`.
- Produces: symmetric fallback when unset and independent bottom spacing when set.

- [ ] Replace both doubled-offset cap declarations with the top-offset-plus-bottom-gap formula.
- [ ] Update `scroll` JSDoc with default/fallback behavior and the pinned-chrome override example.
- [ ] Update Sticky consumer guidance and the playground scroll example to demonstrate a separate bottom gap.
- [ ] Run the focused Sticky suite and expect all tests to pass.
- [ ] Commit with `fix(Sticky): separate scroll bottom gap`.

### Task 3: Verify, review, and ship

**Files:**

- No further production files expected.

**Interfaces:**

- Produces: PR, CI, release, and browser evidence for issue #399.

- [ ] Run full tests, typecheck, stylelint, formatting, playground build, and package dry-run audit.
- [ ] In Playwright at 1400×700, set a 72px top token and 16px bottom gap, then assert computed top `72px`, max-height `612px`, and 16px remaining viewport gap; also verify unset fallback remains symmetric.
- [ ] Open a draft PR and run the mandatory two-reviewer full-branch review loop until a same-round clean verdict.
- [ ] Wait for CI, squash-merge, verify the exact release tag and deployed playground, comment the shipped version on #399, and close it.
