# DataTable Responsive Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `DataTable collapseBelow` presentation that re-templates existing table rows into labelled cards at a shared container-width breakpoint.

**Architecture:** A conditional wrapper establishes an inline-size query container while consumer attributes and the forwarded ref remain on the table. Responsive classes and data attributes let CSS re-template the same semantic header, rows, and cells without duplicate interactive DOM or JavaScript measurement.

**Tech Stack:** React 19, TypeScript, CSS Modules/SCSS container queries, Vitest, React Testing Library, Vite.

## Global Constraints

- Use `CollapseBreakpoint`: `sm` 480px, `md` 640px, `lg` 768px.
- Measure the DataTable container, not the viewport.
- Omitting `collapseBelow` preserves current markup and horizontal scrolling.
- Label precedence is `visibilityLabel`, then string `header`, then no label.
- Preserve sorting, selection, row actions, expansion, visibility, pinned rows, loading, empty state, DOM instances, and state.
- Do not add width measurement, column priority, duplicate card markup, dependencies, or raw SCSS values.
- Keep the ref, `className`, caption, and spread HTML attributes on `<table>`.

---

### Task 1: Public API and responsive DOM metadata

**Files:**
- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx`
- Modify: `packages/design-system/src/components/DataTable/BodyRow.tsx`
- Modify: `packages/design-system/src/components/DataTable/HeaderCell.tsx`
- Test: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

**Interfaces:**
- Consumes: `CollapseBreakpoint`, `ColumnDef<T>`, `DataTableInstance<T>`.
- Produces: `collapseBelow?: CollapseBreakpoint`; wrapper hooks `responsiveContainer`, `collapseSm|Md|Lg`; `data-responsive-label`; `data-responsive-sortable`; `responsiveDataCell` and `responsiveFullWidth`.

- [ ] **Step 1: Write failing wrapper tests**

Add tests equivalent to:

```tsx
const ref = createRef<HTMLTableElement>();
const { container } = render(
  <DataTable ref={ref} instance={instance} collapseBelow="sm"
    data-testid="deals" className="consumer-table" />,
);
const table = screen.getByTestId('deals');
expect(ref.current).toBe(table);
expect(table).toHaveClass('consumer-table');
expect(container.querySelector('[data-collapse-below="sm"]')).not.toBeNull();
expect(table.closest('[data-collapse-below]')).not.toBe(table);
```

Also render without the prop and assert `container.querySelector('[data-collapse-below]')` is null.

- [ ] **Step 2: Verify the tests fail**

Run `npm test --workspace @eocrm/design-system -- --run src/components/DataTable/DataTable.test.tsx`. Expected: type/assertion failures because the API and wrapper are absent.

- [ ] **Step 3: Implement the prop and conditional wrapper**

Add documented API and mapping:

```tsx
import type { CollapseBreakpoint } from '../_internal/collapse';
const collapseClass: Record<CollapseBreakpoint, string> = {
  sm: styles.collapseSm, md: styles.collapseMd, lg: styles.collapseLg,
};
// DataTableProps<T>
collapseBelow?: CollapseBreakpoint;
```

Build the current DnD/table tree as `table`. Return it unchanged when omitted; otherwise return:

```tsx
<div className={clsx(styles.responsiveContainer, collapseClass[collapseBelow])}
  data-collapse-below={collapseBelow}>
  {table}
</div>
```

Keep the table ref and props where they are. Extend JSDoc with breakpoints, container basis, intrinsic-width caveat, preserved features, and an example.

- [ ] **Step 4: Write failing metadata and interaction-preservation tests**

Use columns covering all label cases:

```tsx
const columns: ColumnDef<Row>[] = [
  { id: 'preferred', header: 'Fallback', visibilityLabel: 'Preferred', cell: () => 'A' },
  { id: 'fallback', header: 'Header label', sortable: true, cell: () => 'B' },
  { id: 'absent', header: <span>Visual only</span>, cell: () => <button>Action</button> },
];
```

Assert `A`'s cell has `data-responsive-label="Preferred"`, `B`'s has `Header label`, and Action's has no attribute. Assert the sortable `<th>` has `data-responsive-sortable="true"`. With selection and expansion enabled, assert there is exactly one row checkbox, expansion button, and Action button, and that their existing click callbacks still fire.

- [ ] **Step 5: Verify metadata tests fail**

Run the focused test command. Expected: failures for missing attributes/classes.

- [ ] **Step 6: Implement minimal metadata**

In `BodyRow.tsx`:

```tsx
const responsiveLabel = col.visibilityLabel ??
  (typeof col.header === 'string' ? col.header : undefined);
<Table.Cell className={clsx(styles.responsiveDataCell, existingClasses)}
  data-responsive-label={responsiveLabel}>
```

Add `data-responsive-sortable={sortable || undefined}` to `HeaderCell`. Add `responsiveFullWidth` to skeleton and empty-state cells. Do not change consumer cell children or callbacks.

- [ ] **Step 7: Verify and commit**

Run the focused tests and `npm run typecheck --workspace @eocrm/design-system`; expect PASS. Commit the four files as `feat(DataTable): add responsive stack metadata`.

### Task 2: Container-query card presentation

**Files:**
- Modify: `packages/design-system/src/components/DataTable/DataTable.module.scss`
- Modify if needed: `packages/design-system/src/components/DataTable/HeaderCell.tsx`
- Test: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

**Interfaces:**
- Consumes: Task 1 wrapper, breakpoint, label, sortable, data-cell, and full-width hooks.
- Produces: three container queries and the compact header/stacked-card presentation.

- [ ] **Step 1: Write failing class-contract tests**

Parameterize `sm`, `md`, and `lg`; assert each prop places the corresponding CSS-module class on `[data-collapse-below]`, while a value cell has `styles.responsiveDataCell`. Assert ordinary and sortable header metadata differs.

- [ ] **Step 2: Verify the tests fail**

Run the focused DataTable test. Expected: missing responsive CSS-module classes.

- [ ] **Step 3: Implement the container and shared SCSS mixin**

Use the established breakpoint source:

```scss
@use '../_internal/collapse' as bp;
.responsiveContainer { container-type: inline-size; }
@mixin stacked-presentation {
  > * { width: 100%; }
  .root { display: block; width: 100%; }
  .root colgroup { display: none; }
  .root tbody { display: grid; }
  .root tbody > tr { display: grid; }
  .responsiveDataCell[data-responsive-label]::before {
    content: attr(data-responsive-label);
  }
}
@container (max-width: #{bp.$collapse-sm}) { .collapseSm { @include stacked-presentation; } }
@container (max-width: #{bp.$collapse-md}) { .collapseMd { @include stacked-presentation; } }
@container (max-width: #{bp.$collapse-lg}) { .collapseLg { @include stacked-presentation; } }
```

The mixin must:

- make table/body groups block-level at `width: 100%` and hide `colgroup` visually;
- make the header row a wrapping compact strip, retaining auto header cells and `[data-responsive-sortable='true']` while hiding ordinary headers;
- make each normal body row a card-like grid using existing DataTable/Table tokens for gap, border, radius, background, and states;
- make `.responsiveDataCell` a label/value grid and paint `[data-responsive-label]::before { content: attr(data-responsive-label) }`;
- keep auto cells as compact controls with no generated label;
- override inline sticky offsets with scoped `position: static !important`, `left/right: auto !important`, and neutral transforms;
- hide or disable drag grips and resize handles through stable data hooks, never hashed cross-module selectors;
- make expanded detail, empty, skeleton, and pinned rows occupy the full card width;
- use normal wrapping for card values while preserving focus, hover, selected, striped, and pinned paint.

- [ ] **Step 4: Verify emitted queries and behavior hooks**

Run `npm run build --workspace @eocrm/playground`; expect PASS. Run `rg "max-width:480px|max-width:640px|max-width:768px" packages/playground/dist/assets -g '*.css'`; expect all thresholds.

- [ ] **Step 5: Run tests/stylelint and commit**

Run the focused test and `npm run stylelint`; expect PASS. Commit production, test, and style files as `feat(DataTable): stack rows below container breakpoint`.

### Task 3: Playground proof and consumer guidance

**Files:**
- Modify: `packages/playground/src/pages/components/DataTableDemo.tsx`
- Modify: `packages/design-system/AGENTS.md`

**Interfaces:**
- Consumes: `<DataTable collapseBelow="sm">`.
- Produces: resizable example and published agent-facing guidance.

- [ ] **Step 1: Add a realistic responsive demo**

Add `ResponsiveExample` near `BasicExample`. Reuse `dealColumns`, enable selection and expansion, include `ColumnVisibilityTrigger`, and render:

```tsx
<DataTable instance={instance} collapseBelow="sm" aria-label="Responsive deals" />
```

Use the demo's existing resizable wrapper/classes, not inline layout. The description tells users to resize below 480px and confirms sorting, selection, expansion, actions, and the columns menu remain reachable. Provide a self-contained public-import code sample.

- [ ] **Step 2: Document the contract in AGENTS.md**

Add to the DataTable section:

```md
- **Responsive rows:** `collapseBelow="sm" | "md" | "lg"` re-templates rows as labelled cards based on the DataTable container. Labels use `visibilityLabel`, then a string `header`; give non-text headers a `visibilityLabel` when a visible card label is required. Sorting, selection, expansion, row actions, and `ColumnVisibilityTrigger` remain available. Give the table concrete available width because inline-size containment has no intrinsic-width contribution.
```

- [ ] **Step 3: Run the full local gate and commit**

Run `npm run build --workspace @eocrm/playground` and `make check`; expect PASS. Commit the demo and guidance as `docs(DataTable): demonstrate responsive stacking`.

### Task 4: Mandatory review, PR, release, and issue closure

**Files:** Review the complete branch diff; modify only confirmed findings.

**Interfaces:** Produces a reviewed merged PR, published package version, and closed #444.

- [ ] **Step 1: Invoke `.claude/skills/pre-push-review/SKILL.md`, variant A**

Follow it exactly: baseline gates, draft PR, two independent fresh-context reviewers per round, fix/verify/commit/push loops, and a clean two-reviewer exit round before marking ready.

- [ ] **Step 2: Wait for `Quality / check`**

Run `gh pr checks --watch`; expect success.

- [ ] **Step 3: Squash-merge**

Run `gh pr merge --squash --delete-branch`; expect merged PR and deleted remote branch.

- [ ] **Step 4: Verify release**

Find the merge-triggered Release run with `gh run list --workflow Release --limit 3`, then `gh run watch <run-id>`. Expect quality, publish/tag, and playground deployment jobs to pass. Record the new package version and tag.

- [ ] **Step 5: Comment and close #444**

Run `gh issue comment 444 --body "Shipped in @eocrm/design-system@<version> via <PR URL>."`, then `gh issue close 444`.

- [ ] **Step 6: Synchronize local main**

Run `git checkout main`, `git pull --ff-only`, and `git status --short`; expect clean `main` at the merged commit.
