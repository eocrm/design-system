# DataTable: whole-column drag preview — design

**Date:** 2026-07-27
**Status:** approved

## Problem

`DataTable` supports drag-to-reorder columns. `useSortable` is attached to the
header `<th>` only (`HeaderCell.tsx:66`), and `horizontalListSortingStrategy`
transforms the _other_ header cells as the drag crosses them.

Body cells are never transformed. So mid-drag the header row visibly reorders
while every body cell stays frozen in the old order until drop:

```
before                  during drag (today)
┌────┬────┬────┐        ┌────┬────┬────┐
│ A  │ B  │ C  │        │ A  │ C  │ B  │  ← headers swapped
├────┼────┼────┤        ├────┼────┼────┤
│ a1 │ b1 │ c1 │        │ a1 │ b1 │ c1 │  ← body did NOT
│ a2 │ b2 │ c2 │        │ a2 │ b2 │ c2 │     = the mismatch
```

The table looks momentarily wrong. The fix is for the whole column — header
plus its body cells — to travel with the pointer, so the two halves of the
table never disagree. This becomes the default, with an opt-out for consumers
who want the cheaper preview.

## Design

### API

```ts
interface DataTableProps<T> {
  /**
   * Drag the whole column while reordering, not just its header cell.
   *
   * Default `true` — the dragged column's body cells travel with its header,
   * and every column the drag displaces shifts its body cells too, so the
   * header row and the body never disagree mid-drag. Costs one CSS-variable
   * write per shifted column per frame; the cells move on the compositor, so
   * the table body never re-renders during a drag.
   *
   * Set `false` for the cheaper preview: only the dragged header cell follows
   * the pointer and the body stays put until drop. Worth it for very large
   * tables on low-end hardware, or to restore the previous behavior.
   *
   * Pinned columns never move under either setting — they're excluded from
   * reordering entirely.
   */
  dragWholeColumn?: boolean;
}
```

A boolean was chosen over a `'header' | 'column'` union. Noted trade-off: a
future third preview mode (a floating overlay ghost) would need a second prop
or a breaking change.

**The default is `true`, which changes behavior for every existing consumer.**
This is deliberate: the header/body mismatch is a visual defect, not a taste
preference, so shipping the fix off-by-default would leave every current table
broken. Consequences to accept:

- The CRM's tables change drag feel with no code change on their side.
- `dragWholeColumn={false}` is the documented escape hatch. Because the change
  arrives unannounced by version, the opt-out has to be easy to find: it is
  named in the prop JSDoc, the AGENTS.md DataTable entry, and the PR body.
- Ships on the repo's **normal automatic patch bump** — no `BUMP` edit in
  `release.yml`. Decided deliberately: the mismatch is treated as a defect
  being fixed, not a feature being added, so it rides the ordinary release
  path like any other fix.

### Mechanism

The naive implementation applies dnd-kit's transform to each `<td>` through
React state, re-rendering the body on every pointer move. On a 100-row table
with 3 displaced columns that is 300 elements reconciled per frame, and it
breaks the existing guarantee that the drag-active toggle "re-renders only this
null node, never the table body" (`DataTable.tsx:127-131`).

Instead, drive the cells from CSS custom properties written on the table root:

1. Every **unpinned** data `<td>` carries a static inline
   `transform: translate3d(var(--dt-shift-<key>, 0px), 0, 0)`, written once at
   render and never touched during the drag.
2. A `useColumnDragShift` hook writes `--dt-shift-<key>` onto the table root
   element imperatively (`root.style.setProperty`) from dnd-kit's `onDragMove`.
   One write per _shifted column_ per frame — not per cell.
3. Inheritance carries the value to the cells; the compositor performs the
   translation.

React does no work during the drag. Cells still move, but as a compositor
translate.

`<key>` is a CSS-safe ident derived from `column.id`, since column ids may
contain characters that are invalid in a custom-property name.

```ts
/** Sanitize an arbitrary column id into a CSS custom-property-safe ident. */
function cssIdent(columnId: string): string;
```

### Shift computation

A pure function, so the geometry is testable without a DOM:

```ts
interface ColumnShiftArgs {
  /** Unpinned column ids, in current visual order. */
  orderedIds: string[];
  /** Id of the column being dragged. */
  activeId: string;
  /** Id of the column currently hovered, or null. */
  overId: string | null;
  /** Rendered width per column id, px. */
  widths: Record<string, number>;
  /** Pointer delta on the x axis, px. */
  deltaX: number;
}

/** px translation per column id. Columns not present shift by 0. */
function computeColumnShifts(args: ColumnShiftArgs): Record<string, number>;
```

Rules:

- The active column translates by `deltaX`.
- Columns between the active column's origin and `overId` translate by
  `∓ widths[activeId]` — negative when the active column moves right past them,
  positive when it moves left.
- Every other column translates by `0`.
- `overId === activeId` or `overId === null` → every non-active shift is `0`.

When `dragWholeColumn` is true (the default), `SortableContext` uses a no-op
strategy and **the header cell reads the same `--dt-shift-<key>` variable as
its body cells**. One source of truth means header and body cannot desync —
that is the actual fix for the reported problem, not merely a mitigation.

When `dragWholeColumn` is false, the historical path runs unchanged:
`horizontalListSortingStrategy` plus dnd-kit's own per-item transform on the
header, and no transform on body cells. Both paths must stay exercised by
tests, since the opt-out is now the less-travelled one.

### Pinned columns

Pinned columns are already excluded from reordering (`HeaderCell.tsx:48-50,65`)
and `reorderRespectingPins` confines moves to the unpinned band, so pinned
columns never shift. They keep `transform: none` and their `position: sticky`
is untouched.

**Hard constraint:** the transform goes on individual unpinned `<td>` elements
only — never on `<tr>`, `<tbody>`, or the table root. A transformed ancestor
establishes a containing block, which would break `position: sticky` on the
pinned cells inside it. This gets an explicit code comment and a regression
test.

### Visual treatment

The dragged column's header and body cells share the existing
`--data-table-header-dragging-opacity` fade, so the column reads as lifted
rather than only its header. No new token.

## Files

| File                               | Change                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `DataTable/types.ts`               | `dragWholeColumn?: boolean` on the props interface                      |
| `DataTable/DataTable.tsx`          | thread the prop; swap strategy; mount `useColumnDragShift`; root ref    |
| `DataTable/HeaderCell.tsx`         | in whole-column mode, read the shift var instead of dnd-kit's transform |
| `DataTable/BodyRow.tsx`            | static var-based transform on unpinned data cells                       |
| `DataTable/columnShift.ts`         | new — `computeColumnShifts`, `cssIdent`                                 |
| `DataTable/useColumnDragShift.ts`  | new — imperative per-frame variable writes                              |
| `DataTable/columnShift.test.ts`    | new — pure geometry tests                                               |
| `DataTable/DataTable.test.tsx`     | prop on/off rendering; pinned cells carry no transform                  |
| `playground/.../DataTableDemo.tsx` | example with a live mode toggle                                         |
| `AGENTS.md`                        | one line in the DataTable TL;DR                                         |

## Testing

- `computeColumnShifts`: move right, move left, `over === active` no-op,
  `overId === null`, single-column table, unknown id.
- `cssIdent`: ids with spaces, dots, unicode, leading digits; stability
  (same input → same output) and collision-avoidance for near-identical ids.
- `DataTable`: the default renders var-based transforms on unpinned body cells;
  `dragWholeColumn={false}` renders none and restores the sorting strategy;
  pinned cells never carry a transform in either mode; the sticky pinned
  offsets are unchanged between modes.

jsdom cannot drive a real pointer drag, so drag-motion assertions test the pure
function and the rendered static attributes — matching how the existing
DataTable reorder tests are structured.

## Out of scope

- Drag overlay / portal ghost.
- Insertion-line drop indicator.
- Drop animation on the body.
- Reordering _pinned_ columns.

## Risks

- **Column widths must be known.** The shift math reads `instance.columnSizesPx`,
  which defaults to 120 when unset. A column rendered at its natural width
  rather than a tracked width would shift by the wrong amount. Mitigation: the
  `<colgroup>` already assigns every column an explicit width from the same
  map, so rendered width and tracked width agree by construction.
- **Compositor cost is real, just moved.** 300 translated cells is cheap for
  the compositor but not free on low-end hardware — and because the prop
  defaults to on, **every** consumer pays it unless they opt out. This is the
  main argument against the chosen default; it is accepted knowingly. If a
  large table proves janky in the CRM, the answer is `dragWholeColumn={false}`
  on that table, not a revert of the default.
- **Behavior change on an unremarkable patch release.** Consumers get a new
  drag feel from a version number that signals a bugfix. Accepted; the
  mitigation is discoverability of `dragWholeColumn={false}` (see API above),
  not the version number.
- **CSS variable inheritance is table-wide.** Every `--dt-shift-*` variable
  lives on one element. With many columns that is many custom properties on a
  single node; they are only written while a drag is active and cleared on
  drag end.
