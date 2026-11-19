# Rail.Group sub-sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `<Rail.Section title>` be nested inside `<Rail.Group>` to split subitems into titled chunks ("Saved views", "Spaces"), inline and in the collapsed flyout.

**Architecture:** No TSX change. Tests pin that the existing behaviour (named `role="group"`, auto-open, flyout) holds through the extra wrapper. SCSS adds nested-title rules driven by two new component tokens. Docs + playground demo updated.

**Tech Stack:** React, SCSS modules, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-rail-group-sections-design.md`

## Global Constraints

- Tokens, not raw values; new values go in `packages/design-system/src/components/Rail/Rail.tokens.scss` as `--rail-*` referencing global tokens.
- No margin/position in component SCSS.
- Playground imports only from `@eocrm/design-system`.
- Branch from fresh `main` (`git checkout main && git pull && git checkout -b feat/rail-group-sections`); PR via the `pre-push-review` skill (library variant).

## Review Focus

- Group whose only current item sits inside a nested section must auto-open → test in Task 1.
- Collapsed flyout must show the nested section title (it's portaled outside `.collapsed`) → test in Task 1.
- Mixed children (loose `Rail.Item`s followed by a `Rail.Section`) must render both → test in Task 1.
- Closed group must hide nested sections too (they're inside `.subitems[hidden]`) → covered by existing `hidden` wrapper; asserted in Task 1.
- Nested section title indent must line up with subitem labels in both themes → manual playground check in Task 2.

---

### Task 1: Nested sections in Rail.Group (tests + styles)

**Files:**
- Modify: `packages/design-system/src/components/Rail/Rail.module.scss` (after `.subitems .item`, and after `.flyoutBody`)
- Modify: `packages/design-system/src/components/Rail/Rail.tokens.scss` (near line 72)
- Test: `packages/design-system/src/components/Rail/Rail.test.tsx` (new `describe('Rail — sections inside a Group', …)` block)

**Interfaces:**
- Produces: tokens `--rail-subsection-title-padding: var(--space-2) var(--space-3) var(--space-1) var(--rail-subitem-padding-left)` and `--rail-flyout-subsection-title-padding: var(--space-2) var(--space-3) var(--space-1)`.

- [ ] **Step 1: Write the failing/pinning tests** in the new describe block:
  - `renders nested sections as named groups inside an open group` — `<Rail><Rail.Section title="Main"><Rail.Group icon label="Задачи" defaultOpen?>` (if no `defaultOpen` prop, make a subitem `aria-current="page"`) with `<Rail.Section title="Saved views">` (2 items) and `<Rail.Section title="Spaces">` (2 items). Assert `getByRole('group', { name: 'Saved views' })` contains link `Design system`; same for `Spaces`.
  - `auto-opens when the current item is inside a nested section` — `aria-current="page"` on an item in `Spaces`; assert `link.closest('[hidden]')` is `null`.
  - `keeps nested sections hidden while the group is closed` — no current item; assert `getByText('Spaces').closest('[hidden]')` is not null.
  - `mixes loose items and nested sections` — one `Rail.Item` then a `Rail.Section`; both links present.
  - `shows nested section titles in the collapsed flyout` — `defaultCollapsed`, fake timers, pointerEnter trigger, advance 100ms (mirror the test at line ~498); within `getByRole('dialog', { name: 'Задачи' })`, assert `getByRole('group', { name: 'Saved views' })` and text `Saved views` visible.

- [ ] **Step 2: Run** `npx vitest run src/components/Rail/Rail.test.tsx` from `packages/design-system`. Expected: the new tests PASS (behaviour already exists; they pin it). If any fail, fix in `RailGroup.tsx` before styling.

- [ ] **Step 3: Add tokens + SCSS**
  - Tokens above in `Rail.tokens.scss`.
  - `.subitems .sectionTitle { padding: var(--rail-subsection-title-padding); }`
  - `.flyoutBody .sectionTitle { padding: var(--rail-flyout-subsection-title-padding); }`
  - Nothing else; `.section` gap already spaces items.

- [ ] **Step 4: Run** `npx vitest run src/components/Rail` and `npx stylelint "src/components/Rail/*.scss"`. Expected: PASS, no lint errors.

- [ ] **Step 5: Commit** `feat(rail): allow Rail.Section inside Rail.Group for titled subitem chunks`

### Task 2: Docs + playground demo

**Files:**
- Modify: `packages/design-system/docs/components/Rail.md`
- Modify: `packages/design-system/src/components/Rail/RailSection.tsx` (`children` JSDoc: "Items and/or groups belonging to this section — or, nested in a `Rail.Group`, a titled chunk of its subitems.")
- Modify: `packages/design-system/src/components/Rail/RailGroup.tsx` (`children` JSDoc: "Subitems — `<Rail.Item>`s without icons, optionally split into titled chunks with `<Rail.Section>`.")
- Modify: `packages/playground/src/pages/components/RailDemo.tsx`

- [ ] **Step 1: Docs** — in `Rail.md` behaviour notes add a `Rail.Section` inside `Rail.Group` bullet with the "Задачи / Saved views / Spaces" example; replace the anti-pattern "Putting non-`<Rail.Item>` children inside a `<Rail.Group>`" with "anything other than `<Rail.Item>` or a `<Rail.Section>` of `<Rail.Item>`s"; add "❌ Nesting a `Rail.Group` inside a group's `Rail.Section`" (still one level). Run `npm run build:docs` in `packages/design-system` to regenerate the props table.

- [ ] **Step 2: Demo** — add a `DemoSection` to `RailDemo.tsx` titled "Group with sub-sections": a `Задачи` group (icon `ListTodo` from lucide) with `Saved views` (Design system, Eocrm, Home Hub) and `Spaces` (Virtual Planner, Epics, Open Ops), one item current. Follow the surrounding sections' shape/source-display pattern.

- [ ] **Step 3: Verify** — `npm run build:manifest` (in `packages/design-system`, commit any diff), `npm test` and `npm run typecheck` from repo root. Expected: green. Start the playground on port 8090, check the new demo expanded + collapsed flyout, light + dark; titles line up with subitem labels.

- [ ] **Step 4: Commit** `docs(rail): document and demo sections inside Rail.Group`

- [ ] **Step 5:** Pause with a live playground link (`http://127.0.0.1:8090/...`) for the user to check before running `pre-push-review` → PR.
