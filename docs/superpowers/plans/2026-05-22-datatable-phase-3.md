# DataTable Phase 3 Implementation Plan — Expandable Rows

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the final phase of `<DataTable>` — when the consumer passes `renderExpandedRow`, each row gets a chevron auto-cell that toggles an expanded detail row beneath it. State plumbing already exists from Phase 1; this phase wires it to actual UI.

**Architecture:** `BodyRow` returns a Fragment when expandable: the main row + an optional detail `<Table.Row>` rendered immediately after when `instance.expandedRows[rowId]` is true. The detail row spans all columns (`colSpan={totalColumnsIncludingAuto}`) and contains the consumer's `renderExpandedRow(row)` output. The chevron lives in an auto-cell (44px, sticky-left like the selection cell) that sits after the selection auto-cell (or first if selection isn't enabled). `pinStyle.ts`'s left-pin offset now accounts for both auto-cells.

**Tech Stack:** Same as Phase 1/2 — React 18 + TS, source-distributed, CSS Modules + SCSS tokens. No new deps. Uses `lucide-react`'s `ChevronRight` / `ChevronDown` (already a transitive dep). Composes existing `<Table.Row>`, `<Table.Cell>`, `<Table.HeaderCell>`.

**Source of truth:** `docs/superpowers/specs/2026-05-22-datatable-design.md` — Phase 3 section under "Phasing", plus "Expanded row" subsection under "Rendering pipeline". Read those for any requirement not explicit in a task.

**Branch:** `feat/datatable-expansion`. Commit per task. Open a PR after the Hard-Rule-8 cycle.

**What already exists** (don't re-implement):

- `expandedRows: Record<string, boolean>` state — full controllable/uncontrolled triplet on `UseDataTableOptions`
- `instance.toggleRowExpanded(rowId)` helper method
- `instance.expandedRows` resolved state
- `instance.hasExpansion: boolean` (derived: `renderExpandedRow != null`)
- `renderExpandedRow?: (row: T) => ReactNode` option
- Auto-cell sticky-left pattern (44px, `.autoCellStickyHeader` / `.autoCellStickyBody` classes, `position: sticky; left: 0` inline style)
- Body-row click-vs-interactive-child filter (the chevron `<button>` will be one of those interactive children)

---

## File Structure

```
packages/design-system/src/components/DataTable/
  pinStyle.ts                       ← MODIFY: offset shift accounts for hasExpansion
  pinStyle.test.ts                  ← MODIFY: 3 new tests (expansion-only shift, both, neither)
  BodyRow.tsx                       ← MODIFY: render chevron auto-cell + detail row Fragment
  DataTable.tsx                     ← MODIFY: header auto-cell for expand col + colgroup <col> + JSDoc example
  DataTable.module.scss             ← MODIFY: .expandButton, .expandedDetailRow, .expandedDetailCell
  DataTable.test.tsx                ← MODIFY: add Phase 3 integration tests

packages/design-system/AGENTS.md                ← MODIFY: flip "Phase 3 lands later" → "Phase 3 ships"
packages/playground/src/pages/components/DataTableDemo.tsx ← MODIFY: add ExpansionExample
```

No new files. Phase 3 is small — everything fits in existing surfaces.

**Decomposition rationale:**

- `BodyRow` already returns a single `<Table.Row>`. Phase 3 wraps it in a Fragment when `hasExpansion` is true, with the detail row as the optional second child. Keeps the auto-expand cell colocated with the per-row state it controls.
- `pinStyle.ts`'s `AUTO_CELL_WIDTH` shift becomes the sum of selection + expansion presence. Same pure-helper pattern; tests get 3 new cases.
- The detail row's `<Table.Cell colSpan={...}>` lives in `BodyRow` (it's a per-row concern). The header empty cell lives in `DataTable.tsx` (header is composed there, not per-row).
- No new tokens needed — detail row tint reuses `--color-table-row-bg-striped`.

---

## Task 1 — `pinStyle.ts` offset shift accounts for `hasExpansion`

Currently `getPinStyle` shifts left-pinned column offsets by `AUTO_CELL_WIDTH` when `enableRowSelection`. With Phase 3, the expand auto-cell also occupies leftmost sticky space. Update to add both shifts.

**Files:**

- Modify: `packages/design-system/src/components/DataTable/pinStyle.ts`
- Modify: `packages/design-system/src/components/DataTable/pinStyle.test.ts`

- [ ] **Step 1: Verify branch + clean tree**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
git log --oneline -3
```

Expected:

- Branch: `feat/datatable-expansion`
- Working tree clean
- Most recent commit: the Phase 3 plan commit (this file), preceded by `4e1b19e DataTable Phase 2: column + row pinning rendering (#38)`

- [ ] **Step 2: Append the 3 new tests to `pinStyle.test.ts`**

Find the closing `})` of the `describe('getPinStyle', () => { ... })` block. Insert these tests right before it:

```ts
it('shifts left offset by AUTO_CELL_WIDTH when hasExpansion is true and enableRowSelection is false', () => {
  const result = getPinStyle(
    'name',
    makeInstance({
      hasExpansion: true,
      columnPinning: { left: ['name'], right: [] },
      leftPinOffsets: { name: 0 },
    }),
  );
  expect(result.left).toBe(AUTO_CELL_WIDTH);
});

it('shifts left offset by 2 × AUTO_CELL_WIDTH when both selection and expansion are enabled', () => {
  const result = getPinStyle(
    'name',
    makeInstance({
      enableRowSelection: true,
      hasExpansion: true,
      columnPinning: { left: ['name'], right: [] },
      leftPinOffsets: { name: 0 },
    }),
  );
  expect(result.left).toBe(AUTO_CELL_WIDTH * 2);
});

it('does NOT shift right offset for expansion either', () => {
  const result = getPinStyle(
    'actions',
    makeInstance({
      hasExpansion: true,
      columnPinning: { left: [], right: ['actions'] },
      rightPinOffsets: { actions: 0 },
    }),
  );
  expect(result.right).toBe(0);
});
```

The `makeInstance` helper at the top of the test file already accepts a `Partial<DataTableInstance<unknown>>`; `hasExpansion` and `enableRowSelection` are both fields on the resolved instance, so the spread works without changes.

- [ ] **Step 3: Run — expect failures**

```bash
make test -- pinStyle.test.ts
```

Expected: the 2 new shift tests fail (the implementation still ignores `hasExpansion`). The third (`right` not shifted) passes incidentally since the right branch already doesn't shift.

- [ ] **Step 4: Update `pinStyle.ts` to read `hasExpansion`**

In `packages/design-system/src/components/DataTable/pinStyle.ts`, find the function body. Replace this block:

```ts
if (leftPinned) {
  const offset = instance.leftPinOffsets[columnId] ?? 0;
  const shift = instance.enableRowSelection ? AUTO_CELL_WIDTH : 0;
  return { position: 'sticky', left: offset + shift, pinSide: 'left' };
}
```

With:

```ts
if (leftPinned) {
  const offset = instance.leftPinOffsets[columnId] ?? 0;
  // Each auto-cell on the left contributes AUTO_CELL_WIDTH to the
  // sticky-left offset of the first data column. In sliding order:
  //   [ select? ][ expand? ][ left-pinned data... ]
  const shift =
    (instance.enableRowSelection ? AUTO_CELL_WIDTH : 0) +
    (instance.hasExpansion ? AUTO_CELL_WIDTH : 0);
  return { position: 'sticky', left: offset + shift, pinSide: 'left' };
}
```

Update the JSDoc comment immediately above the function — the existing comment mentions only `enableRowSelection`. Replace:

```ts
/**
 * Compute the sticky-positioning inline style for a column cell.
 *
 * - Unpinned columns return an empty object (no sticky styles).
 * - Left-pinned columns return `{ position: 'sticky', left: <px>, pinSide: 'left' }`.
 *   The `left` value is the column's cumulative offset from the hook
 *   (`instance.leftPinOffsets[columnId]`), shifted by `AUTO_CELL_WIDTH` when
 *   `enableRowSelection` is true (the auto-select cell consumes the leftmost
 *   `AUTO_CELL_WIDTH` of sticky space).
 * - Right-pinned columns return `{ position: 'sticky', right: <px>, pinSide: 'right' }`.
 *   No auto-cell shift on the right (the selection cell is on the left).
 */
```

With:

```ts
/**
 * Compute the sticky-positioning inline style for a column cell.
 *
 * - Unpinned columns return an empty object (no sticky styles).
 * - Left-pinned columns return `{ position: 'sticky', left: <px>, pinSide: 'left' }`.
 *   The `left` value is the column's cumulative offset from the hook
 *   (`instance.leftPinOffsets[columnId]`), shifted by one `AUTO_CELL_WIDTH`
 *   per active auto-cell on the left: `enableRowSelection` and
 *   `hasExpansion` each contribute when true.
 * - Right-pinned columns return `{ position: 'sticky', right: <px>, pinSide: 'right' }`.
 *   No auto-cell shift on the right (selection + expand cells both live on the left).
 */
```

- [ ] **Step 5: Run — expect pass**

```bash
make test -- pinStyle.test.ts
```

Expected: all 10 tests pass (7 from Phase 2 + 3 new).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DataTable/pinStyle.ts \
        packages/design-system/src/components/DataTable/pinStyle.test.ts
git commit -m "DataTable Phase 3: pinStyle offset shift accounts for hasExpansion auto-cell

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — SCSS classes for expand button + detail row

**Files:**

- Modify: `packages/design-system/src/components/DataTable/DataTable.module.scss`

- [ ] **Step 1: Append the new rules at the end of `DataTable.module.scss`**

Open `packages/design-system/src/components/DataTable/DataTable.module.scss`. After the existing rules (the pinned-row tint section near the bottom), append:

```scss
// Expand chevron button — small clickable target inside the auto-expand
// cell. Mirrors the visual weight of the auto-select Checkbox: 14px icon
// inside ~24px hit area, transparent background, focus-visible ring.
.expandButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background: var(--color-bg-muted);
    color: var(--color-fg);
  }

  &:focus-visible {
    @include focus-ring;

    outline: none;
  }
}

// Expanded detail row — the extra <Table.Row> rendered below a data row
// when its expansion state is true. Spans all columns via colSpan and gets
// a subtle tint to differentiate it from neighboring data rows. Crucially
// NOT clickable (no .clickableRow class) so onRowClick doesn't fire when
// the consumer interacts with their rendered detail content.
.expandedDetailRow {
  background: var(--color-table-row-bg-striped);
}

// The single colSpan cell that holds the consumer's renderExpandedRow output.
// More vertical breathing room than a data cell — typically the detail
// content is a panel of multiple lines, not a single value.
.expandedDetailCell {
  padding: var(--space-3) var(--space-4);
  white-space: normal;
}
```

**Notes:**

- `--color-fg-muted`, `--color-bg-muted`, `--color-fg`, `--radius-sm`, `--transition-fast` all exist from Phase 1/2.
- `--color-table-row-bg-striped` exists in `tokens.scss` (used by Table primitive's striped variant).
- `--space-3` / `--space-4` exist (used elsewhere in DataTable.module.scss).
- `@include focus-ring` is already imported via `@use '../../styles/mixins' as *` at the top of this file.
- The `white-space: normal` on `.expandedDetailCell` deliberately opts out of DataTable's default `white-space: nowrap` (set on every cell via the `.root :where(th, td)` rule). Consumer detail content typically wraps across multiple lines.

- [ ] **Step 2: Verify lint passes**

```bash
make lint
```

Expected: clean. If stylelint complains about any of the tokens, inspect `tokens.scss` for the closest equivalent and adjust.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DataTable/DataTable.module.scss
git commit -m "DataTable Phase 3: SCSS classes for expand button + detail row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Phase 3 integration tests (failing first)

Write the integration tests up front so they drive the implementation. They live in `DataTable.test.tsx`.

**Files:**

- Modify: `packages/design-system/src/components/DataTable/DataTable.test.tsx`

- [ ] **Step 1: Append Phase 3 tests inside the `describe('<DataTable>', () => { ... })` block**

Find the existing Phase 2 section (a comment line like `// ─── Phase 2: pinning rendering ──────`). After the last `it()` in that section, add:

```tsx
// ─── Phase 3: expandable rows ──────────────────────────────────────────

it('renders expand auto-column when renderExpandedRow is provided', () => {
  function ExpandableHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      renderExpandedRow: (r) => <div>Detail of {r.name}</div>,
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  const { container } = render(<ExpandableHarness />);
  // Each body row should have an expand button (per-row aria-expanded toggle).
  const expandButtons = container.querySelectorAll('button[aria-expanded]');
  expect(expandButtons.length).toBe(rows.length);
});

it('does NOT render expand auto-column when renderExpandedRow is omitted', () => {
  const { container } = render(<Harness />);
  expect(container.querySelectorAll('button[aria-expanded]').length).toBe(0);
});

it('clicking the expand chevron toggles expandedRows', async () => {
  const onChange = vi.fn();
  function ExpandableHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      renderExpandedRow: (r) => <div>Detail of {r.name}</div>,
      defaultExpandedRows: {},
      onExpandedRowsChange: onChange,
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  const user = userEvent.setup();
  render(<ExpandableHarness />);
  const firstChevron = screen.getAllByRole('button', { name: /expand row/i })[0]!;
  await user.click(firstChevron);
  expect(onChange).toHaveBeenLastCalledWith({ r1: true });
});

it('renders the detail row beneath an expanded row with correct colSpan + aria', () => {
  function ExpandableHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      renderExpandedRow: (r) => <div data-testid="detail-content">Detail of {r.name}</div>,
      defaultExpandedRows: { r1: true },
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  render(<ExpandableHarness />);
  // Detail content present
  expect(screen.getByTestId('detail-content')).toHaveTextContent('Detail of Alpha');
  // The detail cell spans all columns: 2 data columns + 1 expand auto-cell = 3
  const detailCell = screen.getByTestId('detail-content').closest('td');
  expect(detailCell).not.toBeNull();
  expect(Number(detailCell!.getAttribute('colspan'))).toBe(3);
});

it('expand button has aria-expanded reflecting the row state', () => {
  function ExpandableHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      renderExpandedRow: () => null,
      defaultExpandedRows: { r1: true },
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  render(<ExpandableHarness />);
  const buttons = screen.getAllByRole('button', { name: /expand row/i });
  expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
  expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
});

it('expand button aria-controls points to the detail row id', () => {
  function ExpandableHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      renderExpandedRow: () => <div>x</div>,
      defaultExpandedRows: { r1: true },
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  const { container } = render(<ExpandableHarness />);
  const firstButton = screen.getAllByRole('button', { name: /expand row/i })[0]!;
  const controlsId = firstButton.getAttribute('aria-controls');
  expect(controlsId).toBeTruthy();
  expect(container.querySelector(`#${controlsId}`)).not.toBeNull();
});

it('clicking the expand button does NOT fire onRowClick', async () => {
  const onRowClick = vi.fn();
  function ExpandableHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      renderExpandedRow: () => <div>x</div>,
      onRowClick,
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  const user = userEvent.setup();
  render(<ExpandableHarness />);
  const firstChevron = screen.getAllByRole('button', { name: /expand row/i })[0]!;
  await user.click(firstChevron);
  expect(onRowClick).not.toHaveBeenCalled();
});

it('shifts left-pin offsets by 2 × AUTO_CELL_WIDTH when both selection and expansion are active', () => {
  function BothHarness() {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      enableRowSelection: true,
      renderExpandedRow: () => null,
      defaultColumnPinning: { left: ['name'], right: [] },
    });
    return <DataTable instance={instance} aria-label="t" />;
  }
  render(<BothHarness />);
  const nameHeader = screen.getByRole('columnheader', { name: /name/i });
  // 44px (select) + 44px (expand) = 88px
  expect(nameHeader).toHaveStyle({ left: '88px' });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
make test -- DataTable.test.tsx
```

Expected: the 8 new tests fail. The implementation will land in Task 4.

(Do NOT commit these failing tests in isolation — bundle the commit with the implementation in Task 4 below.)

---

## Task 4 — Render expand auto-cell + detail row (the implementation)

This task bundles the changes to `BodyRow.tsx` and `DataTable.tsx` that make the Task 3 tests pass.

**Files:**

- Modify: `packages/design-system/src/components/DataTable/BodyRow.tsx`
- Modify: `packages/design-system/src/components/DataTable/DataTable.tsx`

- [ ] **Step 1: Update `BodyRow.tsx`**

Replace the contents of `packages/design-system/src/components/DataTable/BodyRow.tsx` with:

```tsx
import { Fragment, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import { AUTO_CELL_WIDTH, getPinStyle } from './pinStyle';
import type { DataTableInstance, ColumnDef } from './types';
import styles from './DataTable.module.scss';

export interface BodyRowProps<T> {
  row: T;
  instance: DataTableInstance<T>;
  /** When true, paint the row with the pinned-row background tint. */
  isPinnedRow?: boolean;
}

/**
 * One row of the body. Handles:
 *  - selection auto-cell (when `instance.enableRowSelection`) — sticky-left
 *  - expand auto-cell (when `instance.hasExpansion`) — sticky-left, after select
 *  - row click (when `instance.onRowClick`) — ignored if click target is an
 *    interactive child so checkbox/button clicks don't bubble.
 *  - row Enter keypress fires onRowClick when row is focusable.
 *  - data cells rendered in pin order: [left-pinned, unpinned, right-pinned].
 *    Pinned cells receive `position: sticky` with cumulative offsets via
 *    `getPinStyle`.
 *  - detail row when `instance.expandedRows[rowId]` is true — rendered as
 *    a sibling row immediately after the main row (Fragment return).
 *  - `isPinnedRow` paints the row with `--color-bg-row-pinned` tint (used by
 *    the pinned-rows section above the main body).
 */
export function BodyRow<T>({ row, instance, isPinnedRow }: BodyRowProps<T>) {
  const rowId = instance.getRowId(row);
  const selected = instance.rowSelection[rowId] === true;
  const expanded = instance.expandedRows[rowId] === true;
  const detailRowId = `${rowId}-detail`;

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], [role="checkbox"]')) return;
    instance.onRowClick(row, e);
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (
      target !== e.currentTarget &&
      target.closest('button, input, a, [role="button"], [role="checkbox"]')
    ) {
      return;
    }
    e.preventDefault();
    instance.onRowClick(row, e as unknown as MouseEvent<HTMLTableRowElement>);
  };

  // Pin-ordered render list — same composition as DataTable.tsx's renderColumns.
  const renderColumns: ColumnDef<T>[] = [
    ...instance.leftPinnedColumns,
    ...instance.unpinnedColumns,
    ...instance.rightPinnedColumns,
  ];

  // colSpan for the detail row: data columns + auto-cells (select, expand).
  const detailColSpan =
    renderColumns.length + (instance.enableRowSelection ? 1 : 0) + (instance.hasExpansion ? 1 : 0);

  return (
    <Fragment>
      <Table.Row
        selected={selected || undefined}
        onClick={instance.onRowClick ? onRowClick : undefined}
        onKeyDown={instance.onRowClick ? onRowKeyDown : undefined}
        tabIndex={instance.onRowClick ? 0 : undefined}
        className={clsx(
          instance.onRowClick && styles.clickableRow,
          isPinnedRow && styles.pinnedRow,
        )}
      >
        {instance.enableRowSelection && (
          <Table.Cell
            className={clsx(styles.autoCell, styles.autoCellStickyBody)}
            align="center"
            style={{ position: 'sticky', left: 0 }}
            // Stop clicks anywhere in the selection cell from bubbling to the row's
            // onRowClick handler. The closest(...) filter in onRowClick catches the
            // input but not the styled checkbox span sibling.
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onChange={() => instance.toggleRowSelection(rowId)}
              aria-label={`Select row ${rowId}`}
            />
          </Table.Cell>
        )}
        {instance.hasExpansion && (
          <Table.Cell
            className={clsx(styles.autoCell, styles.autoCellStickyBody)}
            align="center"
            style={{ position: 'sticky', left: instance.enableRowSelection ? AUTO_CELL_WIDTH : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.expandButton}
              aria-expanded={expanded}
              aria-controls={detailRowId}
              aria-label={`Expand row ${rowId}`}
              onClick={() => instance.toggleRowExpanded(rowId)}
            >
              {expanded ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronRight size={14} aria-hidden="true" />
              )}
            </button>
          </Table.Cell>
        )}
        {renderColumns.map((col) => {
          const pin = getPinStyle(col.id, instance);
          const cellStyle = pin.position
            ? { position: pin.position, left: pin.left, right: pin.right }
            : undefined;
          return (
            <Table.Cell
              key={col.id}
              align={col.align ?? 'start'}
              className={clsx(
                pin.pinSide === 'left' && styles.pinnedLeft,
                pin.pinSide === 'right' && styles.pinnedRight,
              )}
              style={cellStyle}
            >
              {col.cell(row, { row, rowId, column: col, instance })}
            </Table.Cell>
          );
        })}
      </Table.Row>
      {expanded && instance.renderExpandedRow && (
        <Table.Row id={detailRowId} className={styles.expandedDetailRow}>
          <Table.Cell colSpan={detailColSpan} className={styles.expandedDetailCell}>
            {instance.renderExpandedRow(row)}
          </Table.Cell>
        </Table.Row>
      )}
    </Fragment>
  );
}
```

**Key changes from Phase 2:**

- Imports `Fragment`, `ChevronDown`, `ChevronRight`.
- Reads `expanded = instance.expandedRows[rowId] === true`.
- Computes `detailRowId = \`${rowId}-detail\``.
- After the selection cell, conditionally renders the expand auto-cell with a `<button>` containing the chevron icon. The cell is sticky-left at offset 0 (no selection) or 44 (selection enabled). Its `onClick` stops propagation so row-click doesn't fire.
- The button has `aria-expanded`, `aria-controls`, and `aria-label="Expand row {rowId}"`. The chevron flips icon based on state.
- The whole return is a `Fragment` containing the main row + an optional detail row.
- The detail row has `id={detailRowId}` (matches `aria-controls`), class `expandedDetailRow`, and a single colSpan cell holding the consumer's content.

- [ ] **Step 2: Update `DataTable.tsx` — header expand cell + colgroup col + totalColCount**

Open `packages/design-system/src/components/DataTable/DataTable.tsx`.

(a) Find the `<colgroup>` block. Currently:

```tsx
<colgroup>
  {instance.enableRowSelection && <col style={{ width: AUTO_CELL_WIDTH }} />}
  {renderColumns.map((col) => (
    <col key={col.id} style={{ width: instance.columnSizesPx[col.id] ?? 120 }} />
  ))}
</colgroup>
```

Insert the expand `<col>` between the selection col and the data cols:

```tsx
<colgroup>
  {instance.enableRowSelection && <col style={{ width: AUTO_CELL_WIDTH }} />}
  {instance.hasExpansion && <col style={{ width: AUTO_CELL_WIDTH }} />}
  {renderColumns.map((col) => (
    <col key={col.id} style={{ width: instance.columnSizesPx[col.id] ?? 120 }} />
  ))}
</colgroup>
```

(b) Find the header row's selection auto-cell:

```tsx
<Table.Header>
  <Table.Row>
    {instance.enableRowSelection && (
      <Table.HeaderCell ...>
        <Checkbox ... />
      </Table.HeaderCell>
    )}
    {renderColumns.map((col) => (
      <HeaderCell key={col.id} column={col} instance={instance} />
    ))}
  </Table.Row>
</Table.Header>
```

After the selection `<Table.HeaderCell>` (and before the `renderColumns.map`), insert the expand header cell. It has no visible content (consumer doesn't "expand all"), just sticky-left positioning to keep the column aligned:

```tsx
<Table.Header>
  <Table.Row>
    {instance.enableRowSelection && (
      <Table.HeaderCell
        align="center"
        scope="col"
        className={clsx(styles.autoCell, styles.autoCellStickyHeader)}
        style={{ position: 'sticky', left: 0 }}
      >
        <Checkbox
          checked={instance.isAllOnPageSelected()}
          indeterminate={instance.isSomeOnPageSelected()}
          onChange={() => instance.toggleAllOnPage()}
          aria-label="Select all rows on page"
        />
      </Table.HeaderCell>
    )}
    {instance.hasExpansion && (
      <Table.HeaderCell
        align="center"
        scope="col"
        className={clsx(styles.autoCell, styles.autoCellStickyHeader)}
        style={{ position: 'sticky', left: instance.enableRowSelection ? AUTO_CELL_WIDTH : 0 }}
        // Empty header — the expand column has no per-column action.
        aria-label="Row expansion"
      />
    )}
    {renderColumns.map((col) => (
      <HeaderCell key={col.id} column={col} instance={instance} />
    ))}
  </Table.Row>
</Table.Header>
```

(c) Find this line (it sets `totalColCount` used by SkeletonRows and EmptyRow):

```tsx
const totalColCount = instance.visibleColumns.length + (instance.enableRowSelection ? 1 : 0);
```

Change to:

```tsx
const totalColCount =
  instance.visibleColumns.length +
  (instance.enableRowSelection ? 1 : 0) +
  (instance.hasExpansion ? 1 : 0);
```

(d) Add a new `@example` to the JSDoc above `DataTableInner`. Find the existing `@example` blocks and add (after the pinning example, before `@remarks When NOT to use`):

```tsx
 * @example
 * // Expandable rows — chevron auto-column at left, detail row below on expand:
 * const instance = useDataTable({
 *   data, columns, getRowId,
 *   renderExpandedRow: (row) => (
 *     <Stack gap="sm">
 *       <p>Full description: {row.description}</p>
 *       <Button onClick={() => archive(row.id)}>Archive</Button>
 *     </Stack>
 *   ),
 * });
 * <DataTable instance={instance} aria-label="Deals" />;
```

- [ ] **Step 3: Run all tests — expect pass**

```bash
make test
make build-lib
make lint
```

Expected: all tests pass (1080+ previous + 8 new Phase 3 tests = ~1088). Build + lint clean.

If a test fails because the `aria-expanded` button can't be queried by accessible name `/expand row/i`, double-check the `aria-label` is exactly `Expand row ${rowId}` (lower-case "Expand row", per the BodyRow code above).

- [ ] **Step 4: Commit the Phase 3 implementation + tests together**

```bash
git add packages/design-system/src/components/DataTable/BodyRow.tsx \
        packages/design-system/src/components/DataTable/DataTable.tsx \
        packages/design-system/src/components/DataTable/DataTable.test.tsx
git commit -m "DataTable Phase 3: expand auto-cell + detail row + ARIA

BodyRow now returns a Fragment with the main row and (when expanded) a
sibling detail row. Expand auto-cell mirrors the selection cell: 44px
sticky-left, after select if selection is enabled. Chevron button toggles
instance.toggleRowExpanded with aria-expanded + aria-controls pointing to
the detail row id. DataTable.tsx renders the empty expand header cell and
adds the <col> in <colgroup>.

Tests cover: auto-column conditional render, chevron click toggles state,
detail row colSpan, ARIA wiring, no row-click bubble, double-shift of
left-pin offsets when both auto-cells active.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Playground demo: ExpansionExample

**Files:**

- Modify: `packages/playground/src/pages/components/DataTableDemo.tsx`

- [ ] **Step 1: Add an `ExpansionExample` component**

Open `packages/playground/src/pages/components/DataTableDemo.tsx`. Find the `DataTableDemo` function's JSX (the list of `<Example />` calls inside `<DemoLayout>`). After `<EmptyExample />`, add:

```tsx
<ExpansionExample />
```

Then add the function near the bottom of the file (alongside the other example functions):

```tsx
function ExpansionExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);
  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
    renderExpandedRow: (row) => (
      <Stack gap="sm">
        <p style={{ margin: 0 }}>
          <strong>{row.name}</strong> — {row.stage} stage, owned by {row.owner}.
        </p>
        <p style={{ margin: 0 }}>
          Full deal value: ${row.amount.toLocaleString()}. The detail panel is your
          consumer-rendered JSX — drop in whatever you need: forms, tabs, charts, notes,
          related-records lists.
        </p>
      </Stack>
    ),
  });

  return (
    <Example
      title="Expandable rows"
      description="Pass `renderExpandedRow` to enable a per-row chevron auto-column at the left edge. Clicking the chevron toggles a detail row beneath the main row, spanning all columns. The detail content is whatever JSX the consumer returns — DataTable just provides the container and the toggle state."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  sort, onSortChange: setSort,
  renderExpandedRow: (row) => (
    <Stack gap="sm">
      <p><strong>{row.name}</strong> — {row.stage}, {row.owner}.</p>
      <p>Drop in whatever detail JSX you need.</p>
    </Stack>
  ),
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} aria-label="Deals (expandable)" />
    </Example>
  );
}
```

(`COLUMNS_SNIPPET`, `useClientSort`, `Stack`, `dealColumns`, `deals` are all already in the file from Phase 2.)

- [ ] **Step 2: Verify**

```bash
make build
```

Both library and playground build cleanly.

- [ ] **Step 3: Manual smoke test (recommended)**

```bash
make dev &
sleep 5
```

Open http://localhost:8080/components/datatable. Scroll to the new "Expandable rows" example. Click a chevron — the row's detail panel should appear below it. Click again — collapse.

Stop dev:

```bash
kill %1 2>/dev/null || pkill -f "vite" || true
```

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/DataTableDemo.tsx
git commit -m "playground: DataTableDemo — ExpansionExample

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — AGENTS.md update

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Flip the "Phase 3 lands later" note**

In `packages/design-system/AGENTS.md`, find the DataTable TL;DR section. The Phase-status bullet currently says something like (search for "still lands in Phase 3"):

> **Phase 2 ships pinning rendering.** [...] Expandable rows (`renderExpandedRow`) still lands in Phase 3.

Replace the trailing "still lands in Phase 3" sentence with:

> **Phase 3 ships expandable rows.** Pass `renderExpandedRow: (row) => ReactNode` to add a per-row chevron auto-column at the left edge. Clicking the chevron toggles a detail row beneath the main row, spanning all columns. ARIA-wired with `aria-expanded` + `aria-controls`. The chevron auto-column is sticky-left like the selection cell; when both are enabled, selection is first and expand is second. DataTable is now feature-complete per the original spec.

Add to the anti-patterns list:

> - ❌ Putting interactive controls in `renderExpandedRow` that need to participate in row selection or row click. The detail row is its own `<tr>`, not part of the main row — `onRowClick` doesn't fire from inside it (by design), and `rowSelection` only tracks main-row checkboxes.

- [ ] **Step 2: Verify**

```bash
make test
make build-lib
make lint
```

All gates green.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "DataTable Phase 3: AGENTS.md flip — Phase 3 ships expandable rows

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Pre-push review-fix cycle (Hard rule 8)

This is **non-optional** per `packages/design-system/CLAUDE.md` Rule 8.

- [ ] **Step 1: Run all gates locally**

```bash
make test
make build-lib
make build
make lint
npm pack --dry-run --workspace @eocrm/design-system
```

Each must exit 0. If any fail, fix before proceeding.

- [ ] **Step 2: Spawn a fresh-context review subagent**

Use the `Agent` tool with `subagent_type: "general-purpose"`, model `opus`. Prompt:

```
Review the DataTable Phase 3 work on `feat/datatable-expansion` at /home/dpws/projects/design-system.

Scope: changes to packages/design-system/src/components/DataTable/ and the playground demo since main. Specifically:
- pinStyle.ts offset shift for hasExpansion
- BodyRow.tsx Fragment return with optional detail row + expand auto-cell
- DataTable.tsx header expand auto-cell + colgroup col + totalColCount update + JSDoc example
- DataTable.module.scss expand button + detail row classes
- DataTable.test.tsx Phase 3 integration tests
- DataTableDemo.tsx ExpansionExample
- AGENTS.md TL;DR flip

REQUIRED READING FIRST (in order):
1. packages/design-system/CLAUDE.md — 10 hard rules
2. packages/design-system/AGENTS.md — component contracts (read the DataTable TL;DR)
3. docs/superpowers/specs/2026-05-22-datatable-design.md — design source of truth; pay attention to "Expanded row" subsection and the Phase 3 entry under Phasing

Then review `git diff main...HEAD -- packages/design-system/ packages/playground/` against the 10 categories:
1. Bugs / correctness — especially:
   - Detail row colSpan math (data cols + select + expand)
   - aria-controls id stability (`${rowId}-detail`)
   - Expand button stopPropagation on cell — does it match the selection cell pattern?
   - Pin offset math: shift = (select ? 44 : 0) + (expand ? 44 : 0). What about a sorted header row's expand cell offset?
   - Detail row inherits row-level hover styles (since it's a sibling <tr>)? Should it?
   - tabIndex on detail row — should it be focusable for Enter? Spec implies no (only the main row is focusable for onRowClick).
2. A11y — aria-expanded/aria-controls correctness, button has accessible name, ChevronRight/Down are aria-hidden, focus-visible on the button.
3. API consistency — renderExpandedRow signature unchanged from Phase 1 plumbing.
4. Type safety — no new `any` casts; existing patterns preserved.
5. Hard rule violations (Rules 1–7): tests, demo, tokens-only SCSS, focus-visible, no layout in component SCSS, forwardRef preserved, JSDoc updated.
6. Test coverage — does the test suite catch all the expansion behaviors? (Chevron click, detail row render, ARIA, colSpan, both-auto-cells offset.)
7. Token discipline — detail row tint reuses --color-table-row-bg-striped; expand button uses --color-fg-muted, --color-bg-muted, --color-fg, --radius-sm, --transition-fast — all exist?
8. SCSS quality — .expandButton uses focus-ring mixin; .expandedDetailCell white-space: normal overrides DataTable's nowrap default.
9. Cross-package leakage — none expected.
10. Package / distribution — no changes to package.json files field.

End with verdict: "clean enough to stop" or "keep iterating".
```

- [ ] **Step 3: Fix every Critical + Important finding**

For each Critical or Important finding, fix in the codebase. Document any deliberate skips.

- [ ] **Step 4: Re-run gates after fixes**

```bash
make test && make build-lib && make build && make lint
```

- [ ] **Step 5: Spawn a second review subagent with the same prompt**

If verdict is "clean enough to stop", proceed. Otherwise loop back to Step 3.

- [ ] **Step 6: Commit fixes (if any)**

Use a single commit per round of fixes:

```bash
git add -A
git commit -m "DataTable Phase 3: review-cycle fixes (round N)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Push the branch**

```bash
git push -u origin feat/datatable-expansion
```

If Husky pre-push hook blocks on prettier, run `npx prettier --write` on the flagged files, commit, retry the push.

---

## Task 8 — Open PR

- [ ] **Step 1: Open the PR**

```bash
gh pr create --title "DataTable Phase 3: expandable rows" --body "$(cat <<'EOF'
## Summary

- `renderExpandedRow: (row) => ReactNode` becomes operational. State plumbing
  (\`expandedRows\` + \`toggleRowExpanded\`) was already shipped in Phase 1.
- Per-row chevron auto-column at the left edge — sticky-left like the
  selection cell, 44px wide, ChevronRight at rest / ChevronDown when expanded.
  ARIA: \`aria-expanded\`, \`aria-controls\` → detail row id.
- Detail row renders as a sibling \`<Table.Row>\` immediately after a row
  when expanded; spans all columns via colSpan. Subtle tint
  (\`--color-table-row-bg-striped\`) differentiates it from data rows.
- \`pinStyle.ts\` left-pin offset now accounts for both auto-cells (select
  and expand each contribute \`AUTO_CELL_WIDTH = 44\` when active).
- Playground demo: new ExpansionExample.

**Phase 3 of 3 — DataTable is feature-complete per the original spec.**

Spec: \`docs/superpowers/specs/2026-05-22-datatable-design.md\`
Plan: \`docs/superpowers/plans/2026-05-22-datatable-phase-3.md\`

## Test plan

- [x] \`pinStyle\` unit tests for the new shift cases (3 new)
- [x] \`<DataTable>\` integration tests: auto-column conditional render,
      chevron click toggles state, detail row colSpan + ARIA, no row-click
      bubble from chevron, double-shift of left-pin offsets when both
      auto-cells active (8 new)
- [x] All previous Phase 1/2 tests still pass
- [x] Playground demo manually exercised at /components/datatable
- [x] Hard-rule-8 pre-push review-fix cycle completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Watch CI**

```bash
gh pr checks --watch
```

Expected: `Quality / check` passes.

- [ ] **Step 3: Report PR URL to the user**

```bash
gh pr view --json url --jq .url
```

---

## Plan complete

After Task 8, DataTable Phase 3 ships and the feature is complete end-to-end:

- Column ordering / sizing / visibility / pinning
- Row selection, row pinning, row click, row expansion
- Sticky header, sticky-left auto-columns, sticky-pinned columns
- Server-driven sort
- All keyboard-accessible (where the underlying primitives allow)

There is no Phase 4 — close the loop on the original spec and move on.
