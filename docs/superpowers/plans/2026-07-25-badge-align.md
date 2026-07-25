# Badge align — Implementation Plan (#327)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `<Badge align="middle">` vertically centers an inline Badge on the surrounding line box, so a status badge beside large heading text (`<PageHeader.Title>`, `<Title>`) sits visually centered instead of riding the baseline. Default `align="baseline"` = current behavior, zero visual change for existing usage.

**Architecture:** One new prop + one CSS declaration. Badge is already `display: inline-flex` (an inline-level box), so `vertical-align: middle` on the badge itself is the whole mechanism — exactly what the eocrm `InlineMiddle` shim does. `vertical-align` is inline-flow self-alignment, not parent-owned layout (Rule 4 lists margin/position/offsets/flex-grow/width/grid-\*; EntityChip already uses `vertical-align: baseline`).

**Tech Stack:** React 18, TypeScript, SCSS modules, Vitest + RTL (globals — no describe/it/expect imports).

## Global Constraints

- Repo `/home/dpws/projects/design-system`, branch `feat/badge-align` (already checked out).
- Full JSDoc on the new prop + exported type (rule 7). Vitest globals. Tests from inside the package; gates from repo root. Commit per task; do NOT push.
- If stylelint objects to the `vertical-align` keywords, mirror the `.alignLeft` disable pattern in Text.module.scss (`scale-unlimited/declaration-strict-value -- keyword, not a raw value`).

---

### Task 1: The prop (code + tests + JSDoc)

**Files:**

- Modify: `packages/design-system/src/components/Badge/Badge.tsx`
- Modify: `packages/design-system/src/components/Badge/Badge.module.scss`
- Modify: `packages/design-system/src/components/Badge/index.ts` + `packages/design-system/src/index.ts` (export `BadgeAlign`)
- Test: `packages/design-system/src/components/Badge/Badge.test.tsx`

**Interfaces:**

```ts
/** Vertical alignment of the Badge on the surrounding line box. */
export type BadgeAlign = 'baseline' | 'middle';
// BadgeProps:
  /**
   * Vertical alignment within the surrounding line of text.
   * - `baseline` (default) — rides the text baseline; right for body-size text.
   * - `middle` — centers the badge on the line box; use for a badge inside a
   *   heading line (`<Title>` / `<PageHeader.Title>`), where baseline riding
   *   makes the badge look sunken next to large text.
   */
  align?: BadgeAlign;
```

- [ ] **Step 1: Failing tests** — append to Badge.test.tsx (read it first, match style):

```tsx
describe('Badge align (#327)', () => {
  it('align="middle" adds the alignMiddle class', () => {
    render(<Badge align="middle">To Do</Badge>);
    expect(screen.getByText('To Do').className).toMatch(/alignMiddle/);
  });
  it('no align class by default (baseline = current behavior)', () => {
    render(<Badge>To Do</Badge>);
    expect(screen.getByText('To Do').className).not.toMatch(/alignMiddle/);
  });
});
```

- [ ] **Step 2:** `cd packages/design-system && npx vitest run src/components/Badge/Badge.test.tsx` — FAIL.
- [ ] **Step 3: Implement.** `align = 'baseline'` in destructure; clsx adds `align === 'middle' && styles.alignMiddle` (no class for baseline — the UA default; keeps existing DOM identical). SCSS after the base `.badge` block:

```scss
// align="middle" — center the badge on the surrounding LINE BOX instead of
// riding the text baseline. For badges inside a heading line (Title /
// PageHeader.Title), where baseline riding looks sunken next to large text.
.alignMiddle {
  vertical-align: middle;
}
```

Add one `@example` to Badge's JSDoc (badge inside `<Title order={1}>` beside a `<Text size="inherit">` run — the #319 + #327 pairing) and, if Badge has a "When NOT to use"/anti-patterns remark about headings, reconcile it. Export `BadgeAlign` from Badge/index.ts and src/index.ts.

- [ ] **Step 4:** Tests PASS; `npm run typecheck`; root `make lint`.
- [ ] **Step 5:** Commit — `feat(Badge): align="middle" — center a badge on a heading's line box (#327)`

---

### Task 2: Docs + demo + gates

**Files:**

- Modify: `packages/design-system/AGENTS.md` (Badge section: one line — `align="middle"` for badges inside heading lines; pairs with `Text size="inherit"`)
- Modify: `packages/playground/src/pages/components/BadgeDemo.tsx` (new example: `<Title order={2}>` line with prefix + name + `<Badge align="middle">` vs default baseline badge for contrast — mirror the file's Example pattern)

- [ ] **Step 1:** Read both files; implement.
- [ ] **Step 2:** `npx prettier --write docs/superpowers/plans/2026-07-25-badge-align.md`; include plan doc in commit.
- [ ] **Step 3:** Full gates: `make test && make build-lib && make lint && npm run format:check && make build`; commit regenerated props.manifest.json if changed.
- [ ] **Step 4:** Commit — `docs(Badge): align demo + AGENTS.md note (#327)`

---

## Self-review notes

- No Title-side slot component — the Badge prop is the smallest surface and matches the proven shim; a heading slot would be a second API for the same pixel.
- `middle` (not a numeric offset): aligns badge middle to baseline + half x-height — the standard visually-centered-enough choice at heading sizes, and exactly what the retired shim used.
