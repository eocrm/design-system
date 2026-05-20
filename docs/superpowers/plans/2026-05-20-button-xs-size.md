# Button xs Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `xs` size to `Button` (20px height) so consumers can use it for icon-only and dense inline actions, while still supporting an optional short text label.

**Architecture:** Single component change. Extend the `ButtonSize` union, add a matching `.xs` SCSS rule, add `--size-xs: 20px` to the shared token scale. Update Button's JSDoc, the playground demo, AGENTS.md TL;DR, and add two new unit tests (class assertion + icon-only render with `aria-label`).

**Tech Stack:** React + TypeScript, SCSS modules, Vitest + React Testing Library, lucide-react icons in the playground only.

**Spec:** [docs/superpowers/specs/2026-05-20-button-xs-size-design.md](../specs/2026-05-20-button-xs-size-design.md)

---

## Task 1: Branch from fresh main

**Files:** (no edits — git only)

- [ ] **Step 1: Confirm a clean working tree**

Run: `git status`
Expected: working tree clean. If not, stop and surface the dirty state to the user before proceeding.

- [ ] **Step 2: Update local main**

Run:
```bash
git checkout main
git pull --ff-only
```
Expected: fast-forward (or "Already up to date").

- [ ] **Step 3: Create the feature branch**

Run:
```bash
git checkout -b feat/button-xs
```
Expected: switches to a new branch tracking from current main.

- [ ] **Step 4: Verify hooks are wired**

Run:
```bash
git config --get core.hooksPath
test -x .husky/pre-push && echo OK
```
Expected:
```
.husky/_
OK
```
If either fails, run `npm install` from the repo root and re-check. Do not proceed until both pass.

---

## Task 2: Add `--size-xs` token

**Files:**
- Modify: `packages/design-system/src/styles/tokens.scss:105-108`

- [ ] **Step 1: Insert `--size-xs` above `--size-sm`**

Find the block:
```scss
  // Control sizes
  --size-sm: 24px;
  --size-md: 32px;
  --size-lg: 40px;
```

Replace with:
```scss
  // Control sizes
  --size-xs: 20px;
  --size-sm: 24px;
  --size-md: 32px;
  --size-lg: 40px;
```

- [ ] **Step 2: Verify the file still parses**

Run: `npm run lint:css`
Expected: exits 0. (Token additions can't violate the existing rules.)

- [ ] **Step 3: Commit**

Run:
```bash
git add packages/design-system/src/styles/tokens.scss
git commit -m "Tokens: add --size-xs (20px) to control size scale"
```

---

## Task 3: TDD — add `xs` class assertion (red)

**Files:**
- Modify: `packages/design-system/src/components/Button/Button.test.tsx:17-26`

- [ ] **Step 1: Extend the existing class-name test**

Replace lines 17–26 (the whole `'applies the variant and size class names'` block) with:

```tsx
  it('applies the variant and size class names', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/danger/);
    expect(btn.className).toMatch(/lg/);
  });

  it('applies the xs size class', () => {
    render(<Button size="xs">Tiny</Button>);
    expect(screen.getByRole('button', { name: 'Tiny' }).className).toMatch(/xs/);
  });
```

- [ ] **Step 2: Run only the Button tests to verify they fail**

Run: `npx vitest run packages/design-system/src/components/Button/Button.test.tsx`
Expected: TypeScript compile error or runtime failure — `size="xs"` is not assignable to `ButtonSize` (which is `'sm' | 'md' | 'lg'` at this point). This is the desired RED state.

If the test passes here, stop — something is wrong with the test setup.

---

## Task 4: Add `xs` to the union and SCSS (green)

**Files:**
- Modify: `packages/design-system/src/components/Button/Button.tsx:9`
- Modify: `packages/design-system/src/components/Button/Button.module.scss:31-36`

- [ ] **Step 1: Extend `ButtonSize`**

In `Button.tsx`, line 9, replace:
```ts
export type ButtonSize = 'sm' | 'md' | 'lg';
```
with:
```ts
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
```

- [ ] **Step 2: Add the `.xs` SCSS block above `.sm`**

In `Button.module.scss`, find the block:
```scss
// Sizes
.sm {
  height: var(--size-sm);
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}
```

Replace with:
```scss
// Sizes
.xs {
  height: var(--size-xs);
  padding: 0 var(--space-2);
  font-size: var(--font-size-xs);
  gap: var(--space-1);
}

.sm {
  height: var(--size-sm);
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}
```

The `gap: var(--space-1)` line is intentional — it tightens the inter-child gap at xs by overriding the base `.button { gap: var(--space-2) }` rule. `.xs` is declared after the base block so specificity-tie is resolved by source order, in our favor.

- [ ] **Step 3: Run the Button tests — they should now pass**

Run: `npx vitest run packages/design-system/src/components/Button/Button.test.tsx`
Expected: all Button tests PASS, including both `'applies the variant and size class names'` and `'applies the xs size class'`.

- [ ] **Step 4: Run stylelint and typecheck**

Run:
```bash
npm run lint:css
npm run typecheck
```
Expected: both exit 0.

- [ ] **Step 5: Commit**

Run:
```bash
git add packages/design-system/src/components/Button/Button.tsx packages/design-system/src/components/Button/Button.module.scss packages/design-system/src/components/Button/Button.test.tsx
git commit -m "Button: add xs size (20px) for icon-only and dense actions"
```

---

## Task 5: Add icon-only render test

**Files:**
- Modify: `packages/design-system/src/components/Button/Button.test.tsx` (append to the describe block)

- [ ] **Step 1: Add the icon-only test**

Find the last test in the file (the `'forwards a ref to the underlying button element'` test ending at line 66). Append a new test inside the `describe('Button', ...)` block, before the closing `});`:

```tsx
  it('renders as an icon-only button at size xs with an accessible name', () => {
    render(
      <Button size="xs" aria-label="Remove">
        <svg data-testid="icon" aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the Button tests**

Run: `npx vitest run packages/design-system/src/components/Button/Button.test.tsx`
Expected: all tests pass. The new test was always going to pass once Task 4 landed — it's here as a regression guard for the icon-only accessibility contract, not a TDD red→green step.

- [ ] **Step 3: Commit**

Run:
```bash
git add packages/design-system/src/components/Button/Button.test.tsx
git commit -m "Button: test icon-only xs button exposes the accessible name"
```

---

## Task 6: Update Button JSDoc

**Files:**
- Modify: `packages/design-system/src/components/Button/Button.tsx:25-31` (size prop JSDoc)
- Modify: `packages/design-system/src/components/Button/Button.tsx:39-77` (component JSDoc — add `@example` and `@remarks` entries)

- [ ] **Step 1: Update the `size` prop JSDoc**

Find this block (around lines 25-31):
```ts
  /**
   * Control height (matches the shared `--size-*` scale used by Input and Avatar).
   * - `sm` (24px) — dense toolbars, tables, inline actions.
   * - `md` (32px, default) — most contexts.
   * - `lg` (40px) — marketing-style empty states or emphasized primary actions.
   */
  size?: ButtonSize;
```

Replace with:
```ts
  /**
   * Control height (matches the shared `--size-*` scale used by Input and Avatar).
   * - `xs` (20px) — icon-only or very dense inline actions (row controls,
   *   chip-adjacent buttons). Pass `aria-label` when icon-only. Below WCAG
   *   2.5.5 Level AAA touch-target guidance; reserve for desktop-first surfaces.
   * - `sm` (24px) — dense toolbars, tables, inline actions.
   * - `md` (32px, default) — most contexts.
   * - `lg` (40px) — marketing-style empty states or emphasized primary actions.
   */
  size?: ButtonSize;
```

- [ ] **Step 2: Add an `@example` for icon-only xs**

Find the existing `@example` block that shows the danger sm Delete button (around lines 42-46):
```ts
 * @example
 * <Button variant="danger" size="sm" onClick={remove}>
 *   <Trash2 size={14} /> Delete
 * </Button>
 *
```

Immediately after it (and before the form-footer `@example`), insert:
```ts
 * @example
 * // Icon-only at xs — pass `aria-label` so screen readers announce the action.
 * <Button size="xs" variant="ghost" aria-label="Remove">
 *   <X size={12} />
 * </Button>
 *
```

- [ ] **Step 3: Add the anti-pattern entry**

Find the `@remarks Anti-patterns` block (starts around line 85). It currently ends with the `❌ Rendering <Button variant="success">Save</Button> on initial mount` entry.

Add a new bullet at the end of that block, just before the closing `*/`:
```ts
 * - ❌ Using `size="xs"` for the primary or most prominent action in a
 *   section. `xs` is for inline density, not emphasis — reach for `md` or
 *   `lg` when the button should draw the eye.
 */
```

- [ ] **Step 4: Verify the JSDoc renders cleanly**

Run: `npm run typecheck`
Expected: exits 0. Any malformed JSDoc that breaks TypeScript parsing fails here.

- [ ] **Step 5: Commit**

Run:
```bash
git add packages/design-system/src/components/Button/Button.tsx
git commit -m "Button: document xs size, icon-only example, and anti-pattern"
```

---

## Task 7: Update AGENTS.md TL;DR

**Files:**
- Modify: `packages/design-system/AGENTS.md:43`

- [ ] **Step 1: Update the size list**

Line 43 currently reads:
```
- `size`: `sm` / `md` (default) / `lg`
```

Replace with:
```
- `size`: `xs` / `sm` / `md` (default) / `lg` — use `xs` for icon-only or dense inline actions; pass `aria-label` when icon-only.
```

- [ ] **Step 2: Commit**

Run:
```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: list xs in Button size options"
```

---

## Task 8: Extend playground ButtonDemo

**Files:**
- Modify: `packages/playground/src/pages/components/ButtonDemo.tsx:2` (icon imports)
- Modify: `packages/playground/src/pages/components/ButtonDemo.tsx:102-114` (Sizes example)
- Modify: `packages/playground/src/pages/components/ButtonDemo.tsx` (add a new `<Example>` after Sizes)

- [ ] **Step 1: Add `X` and `Pencil` to the lucide-react import**

Line 2 currently reads:
```ts
import { Check, Plus, Search, Trash2 } from 'lucide-react';
```

Replace with:
```ts
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
```

- [ ] **Step 2: Extend the Sizes example**

Find the Sizes `<Example>` block (around lines 102-114):
```tsx
      <Example
        title="Sizes"
        description="Three sizes. sm for dense toolbars/tables, md (default) for most contexts, lg for emphasis."
        code={`<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`}
      >
        <Cluster gap="sm" align="center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Cluster>
      </Example>
```

Replace with:
```tsx
      <Example
        title="Sizes"
        description="Four sizes. xs for icon-only or very dense inline actions, sm for dense toolbars/tables, md (default) for most contexts, lg for emphasis."
        code={`<Button size="xs">Extra small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`}
      >
        <Cluster gap="sm" align="center">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Cluster>
      </Example>
```

- [ ] **Step 3: Add the Icon-only at xs example**

Immediately after the Sizes `<Example>` (and before the "With icons" example), insert:

```tsx
      <Example
        title="Icon-only at xs"
        description="For inline density — row controls, chip-adjacent actions. Always pass an aria-label so screen readers announce what the button does."
        code={`<Button size="xs" variant="ghost" aria-label="Remove">
  <X size={12} />
</Button>
<Button size="xs" variant="secondary" aria-label="Edit">
  <Pencil size={12} />
</Button>`}
      >
        <Cluster gap="sm" align="center">
          <Button size="xs" variant="ghost" aria-label="Remove">
            <X size={12} />
          </Button>
          <Button size="xs" variant="secondary" aria-label="Edit">
            <Pencil size={12} />
          </Button>
        </Cluster>
      </Example>
```

- [ ] **Step 4: Run the playground typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Sanity-check the dev server renders**

Run: `npm run dev -w playground` in a background terminal or another shell, open `http://localhost:8080/components/button`, and confirm:

- The Sizes row shows four buttons (xs, sm, md, lg) of progressively increasing height.
- The new "Icon-only at xs" example renders two icon-only buttons; hovering each reveals their hover state; tabbing reaches both with a visible focus ring.
- Disabled, focused, and hovered states on the xs buttons all read correctly (no clipped focus ring, no invisible disabled state). If the disabled ghost xs renders nearly-invisibly, note it as a finding for Task 10's review.

Stop the dev server before continuing.

- [ ] **Step 6: Commit**

Run:
```bash
git add packages/playground/src/pages/components/ButtonDemo.tsx
git commit -m "ButtonDemo: show xs size + icon-only example"
```

---

## Task 9: Run all quality gates locally

**Files:** (none — verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Run stylelint**

Run: `npm run lint:css`
Expected: exits 0.

- [ ] **Step 4: Run the full build**

Run: `npm run build`
Expected: both packages build successfully. The playground build doubles as a smoke test of the library import path.

- [ ] **Step 5: Verify the published tarball would be clean**

Run: `npm pack --dry-run -w @eocrm/design-system`
Expected: tarball contents include `src/`, `AGENTS.md`, `README.md`, `package.json` only. Confirm no test files (`*.test.tsx`), no demos, no internal-only paths.

If any of steps 1–5 fail, fix and re-run before proceeding to Task 10.

---

## Task 10: Hard Rule 8 review-fix cycle

This task implements `packages/design-system/CLAUDE.md` Rule 8. It is **mandatory** for this change — `feedback_review_loop_mandatory` confirms the rule applies even to small library tweaks.

**Files:** (none directly — review may surface fixes)

- [ ] **Step 1: Confirm Task 9 gates were all green**

If you skipped or failed any gate in Task 9, return to it before spawning the reviewer.

- [ ] **Step 2: Spawn a fresh-context reviewer**

Use the `general-purpose` agent. The prompt must explicitly brief it on the 10 review categories (bugs, a11y, API inconsistencies, type safety, rule violations Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, package/distribution) and ask for output as Critical / Important / Nice-to-have / Regression-watch plus a final verdict (`clean enough to stop` or `keep iterating`). Tell it to read `packages/design-system/CLAUDE.md`, `AGENTS.md`, and `README.md` first. Target scope: `packages/design-system/` plus `packages/playground/src/pages/components/ButtonDemo.tsx`.

- [ ] **Step 3: Fix every Critical and Important finding**

For each finding you act on, make the fix in a small, focused commit. For each finding you deliberately skip, note the reason inline in your handoff so the next reviewer does not re-flag it.

- [ ] **Step 4: Re-run gates**

Run the same five gates from Task 9.

- [ ] **Step 5: Spawn another reviewer with the same prompt**

Repeat steps 2–4 until the verdict is `clean enough to stop` and:

- 0 Critical findings
- 0 Important findings (or each one has an explicit documented skip)
- All five gates green
- `npm pack --dry-run` shows a clean tarball

---

## Task 11: Push, open PR, wait for CI

**Files:** (none — git + GitHub only)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin feat/button-xs`
Expected: pre-push hook runs prettier, stylelint, typecheck. Push succeeds. **Never use `--no-verify` on your own initiative** — if the hook blocks, fix the issue or surface it to the user for an explicit override.

- [ ] **Step 2: Open the pull request**

Run:
```bash
gh pr create --title "Button: add xs size for icon-only and dense inline actions" --body "$(cat <<'EOF'
## Summary
- Adds `xs` (20px) to `Button`'s size scale alongside `sm`/`md`/`lg`.
- Primary use: icon-only buttons in dense surfaces; also supports a short text label.
- Adds `--size-xs: 20px` to the shared `--size-*` token scale.
- Demo, AGENTS.md TL;DR, and JSDoc updated; two new unit tests cover the class application and icon-only accessible-name path.

## Test plan
- [ ] `npm test` green
- [ ] `npm run typecheck` green
- [ ] `npm run lint:css` green
- [ ] `npm run build` green
- [ ] `npm pack --dry-run -w @eocrm/design-system` shows no test files or internal-only paths
- [ ] Playground `Button` demo renders the new Sizes row and the Icon-only example with working focus rings and aria-labels
- [ ] Hard Rule 8 review-fix cycle reached `clean enough to stop`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for `Quality / check` to pass**

Run: `gh pr checks --watch`
Expected: `Quality / check` status check completes successfully. If it fails, fix on the branch and re-push (which will re-trigger CI).

- [ ] **Step 4: Report PR URL back to the user**

The user merges (squash or merge commit — their choice). Do not merge on their behalf without an explicit instruction.

---

## Self-Review Notes

- **Spec coverage:** Every section of the spec maps to a task — token (Task 2), SCSS + union (Tasks 3–4), tests (Tasks 3, 5), JSDoc + anti-pattern + when-not-to-use (Task 6), AGENTS.md (Task 7), demo (Task 8), verification (Tasks 9–10), open risks resurfaced in Task 8 step 5 for visual check.
- **Type consistency:** `ButtonSize = 'xs' | 'sm' | 'md' | 'lg'` consistent across Tasks 3, 4, 6. SCSS class name `xs` consistent across SCSS rule and test assertions.
- **Frequent commits:** 7 separate commits across Tasks 2–8; review-cycle commits in Task 10; PR in Task 11.
