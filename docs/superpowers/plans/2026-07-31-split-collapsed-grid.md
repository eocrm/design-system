# Split Collapsed Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix issue #394 so a collapsible `Split` with a pinned `asideWidth` does not retain that width as an overflow floor once its panes stack.

**Architecture:** Keep non-collapsible `Split` templates byte-for-byte unchanged. For collapsible splits, use shrink-safe `minmax(0, …)` tracks before the container query stacks both children; this is necessary because CSS cannot use a container's own size query to restyle the container itself. Update the public prop documentation so it describes the corrected behavior instead of documenting the defect.

**Tech Stack:** React, TypeScript, CSS Modules/SCSS, Vitest.

## Global Constraints

- Exactly one issue is in scope: GitHub issue #394.
- Follow `packages/design-system/CLAUDE.md`: token-only SCSS, internal-layout exception only, and mandatory pre-push review-fix cycle.
- Preserve `Split` DOM order, breakpoint classes, gap behavior, and non-collapsible templates.
- Use strict TDD: add the regression assertion and observe the expected failure before changing production SCSS or JSDoc.
- Do not add dependencies or broaden the public API.

---

### Task 1: Remove the collapsed pinned-width floor

**Files:**

- Modify: `packages/design-system/src/components/Split/Split.test.tsx`
- Modify: `packages/design-system/src/components/Split/Split.module.scss`
- Modify: `packages/design-system/src/components/Split/Split.tsx`

**Interfaces:**

- Consumes: existing `SplitProps.asideWidth`, `SplitProps.collapseBelow`, `.sideStart`, `.sideEnd`, and `.collapsible` classes.
- Produces: shrink-safe grid templates only when `collapseBelow` is present; no new exports or props.

- [ ] **Step 1: Write the failing regression test**

Extend the existing SCSS contract suite in `Split.test.tsx` with an assertion that the compiled/source contract contains collapsible side selectors whose track definitions are shrink-safe in both directions:

```tsx
it('makes both collapsible side templates shrink-safe for pinned aside widths', () => {
  expect(scss).toMatch(
    /\.sideStart\.collapsible\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*var\(--split-aside-width,\s*auto\)\)\s+minmax\(0,\s*1fr\)/s,
  );
  expect(scss).toMatch(
    /\.sideEnd\.collapsible\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*var\(--split-aside-width,\s*auto\)\)/s,
  );
});
```

This catches the regression where collapsible splits fall back to the fixed `asideWidth 1fr` / `1fr asideWidth` templates and overflow below `asideWidth + gap`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test --workspace @eocrm/design-system -- Split/Split.test.tsx
```

Expected: FAIL only on the new shrink-safe-template assertion because no `.sideStart.collapsible` or `.sideEnd.collapsible` template exists yet.

- [ ] **Step 3: Implement the minimal SCSS fix**

In `Split.module.scss`, leave the existing `.sideStart` and `.sideEnd` rules unchanged, then add:

```scss
.sideStart.collapsible {
  grid-template-columns:
    minmax(0, var(--split-aside-width, auto))
    minmax(0, 1fr);
}

.sideEnd.collapsible {
  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, var(--split-aside-width, auto));
}
```

Document next to these rules that the shrink-safe tracks preserve the pin while space is available and allow the tracks to contract without overflow when the container becomes narrower; also document that the container query cannot re-template its own query container.

- [ ] **Step 4: Correct the public JSDoc**

In `Split.tsx`, replace the `collapseBelow` paragraph claiming the pinned width remains a floor with prose stating that a pinned width is preserved side-by-side while space is available, but is allowed to shrink when the container becomes narrower so stacked panes remain within the split. Keep the existing DOM-order and intrinsic-width warnings.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test --workspace @eocrm/design-system -- Split/Split.test.tsx
npm run typecheck --workspace @eocrm/design-system
npm run lint:css --workspace @eocrm/design-system
```

Expected: all commands pass with no new warnings.

- [ ] **Step 6: Commit the task**

```bash
git add packages/design-system/src/components/Split/Split.test.tsx packages/design-system/src/components/Split/Split.module.scss packages/design-system/src/components/Split/Split.tsx docs/superpowers/plans/2026-07-31-split-collapsed-grid.md
git commit -m "fix(Split): remove collapsed width floor (#394)"
```
