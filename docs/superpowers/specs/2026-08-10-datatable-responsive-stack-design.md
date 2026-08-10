# DataTable responsive stacked presentation

Issue: #444

## Goal

Add an opt-in responsive presentation that keeps a `DataTable` legible when its own container is narrow. Consumers enable it with `collapseBelow="sm"`, `"md"`, or `"lg"`. Below that container-width threshold, each existing table row is visually re-templated as a labelled card instead of requiring horizontal scrolling.

The first version is deliberately table-wide. Per-column responsive priority remains a possible future escape hatch and is not part of this change.

## Public API

`DataTableProps<T>` gains:

```ts
collapseBelow?: CollapseBreakpoint;
```

The breakpoints use the shared responsive scale: `sm` 480px, `md` 640px, and `lg` 768px. The measurement basis is the DataTable's own container, not the viewport. Omitting the prop preserves the current markup, styling, and horizontal-scroll behavior.

Enabling the prop adds an outer inline-size container. The forwarded ref, `className`, HTML attributes, caption, and table semantics remain on the underlying `<table>`.

As with other container-query components, consumers must give the DataTable a concrete available width. Inline-size containment removes the wrapper's intrinsic-width contribution, so a collapsible DataTable inside an intrinsic-width parent can resolve to zero width.

## Responsive presentation

At or below the selected threshold:

- The existing table header becomes a compact control strip.
- Sortable headers remain visible and interactive so server-driven sorting is still reachable.
- The select-all checkbox remains available when row selection is enabled.
- Plain string, non-sortable data headers are omitted from the strip because their text labels the corresponding field in every card. Rich React-node and render-function headers remain visible because they may contain focusable controls; only proven plain labels are hidden.
- The compact strip has no paint when it has no retained item. In particular, the expansion auto-column's blank header does not create an empty band.
- Each existing body row becomes a stacked card. Column order remains the field order.
- Sticky pinning, fixed column widths, resizing, drag grips, and reorder presentation are neutralized because they describe the wide table layout. Their state is retained and governs again when the container widens.

The responsive mode re-templates the existing semantic table elements rather than rendering a second card tree. Consumer-rendered cells, focused controls, IDs, selection state, and expansion state therefore remain mounted when the breakpoint changes.

## Field labels

Each visible data cell receives a non-interactive visual label resolved in this order:

1. `column.visibilityLabel`
2. `column.header` when it is a string
3. no label

React nodes and header render functions are never duplicated into card fields. This avoids repeating sortable controls or other interactive header content in every row. A missing resolved label leaves the field value unlabelled rather than guessing from the column ID.

Each opted-in data cell renders an always-mounted `aria-hidden="true"` visual-label element and one stable value wrapper containing the consumer's unchanged cell subtree. In the wide presentation the label is hidden and the value wrapper is layout-neutral. In the stacked presentation the label and value become the two grid items; an empty label is hidden and the value spans the card. The underlying table headers and cell relationship remain in the DOM for assistive technology, while the duplicated visual label is excluded from accessible-name computation.

## Existing behavior

Responsive stacking changes presentation only:

- Per-row selection checkboxes and selected state remain attached to each row.
- Row action controls remain in their original cells and render as ordinary card fields.
- Expansion controls remain attached to the row; expanded detail content appears beneath its card.
- `onRowClick` and Enter-key row activation retain their current interactive-descendant safeguards.
- Hidden columns remain absent, and `ColumnVisibilityTrigger` continues to control visibility through the shared instance.
- Pinned rows retain their tint and appear before the regular rows.
- Loading skeletons and the empty state occupy the full card width below the threshold.
- Sorting, selection, expansion, column visibility, and consumer callbacks keep their existing state contracts.
- Prop-less tables keep their existing sortable-label Arrow-key resize behavior and non-focusable pointer resize handle. Opted-in tables use a dedicated focusable resize separator while wide; CSS removes it with the other wide-layout controls when stacked.

## Implementation boundaries

- `DataTable.tsx` maps `collapseBelow` to a breakpoint class and owns the conditional container wrapper.
- `BodyRow.tsx` resolves the visual label and, only for opted-in tables, mounts the label/value wrappers around the unchanged consumer subtree.
- `HeaderCell.tsx` identifies plain and retained rich headers, exposes scoped styling hooks, and preserves the default versus responsive keyboard-resize contracts.
- `DataTable.module.scss` owns the container queries, card re-template, label painting, and neutralization of wide-table-only affordances.
- Existing shared collapse constants remain the breakpoint source of truth. No resize observer or viewport hook is introduced.

## Testing and demonstration

Unit tests will verify:

- each breakpoint maps to the correct responsive class and wrapper;
- omitting `collapseBelow` preserves the current unwrapped behavior;
- field-label precedence is `visibilityLabel`, then string header, then absent;
- visual labels are `aria-hidden`, every opted-in cell has one stable value wrapper, and fragments/arrays remain inside that single wrapper;
- forwarded refs and consumer attributes stay on the table;
- responsive hooks do not remove sorting, selection, row actions, expansion, or semantic table elements;
- nested `Table` and `DataTable` instances are not selected by the owning table's responsive rules;
- rich non-sortable headers stay visible, empty compact strips are suppressed, and default/responsive resize keyboard paths remain distinct;
- loading and empty rows receive the full-width responsive treatment.

Because jsdom does not evaluate container queries, tests assert the DOM and CSS hooks while the stylesheet defines the visual transition. The playground DataTable page will include a resizable example demonstrating the breakpoint and the retained interactions.

The playground currently duplicates inline horizontal-resize wrappers across Grid, Split, Sortable, and DashboardCanvas demos. This change introduces a shared playground-only `ResizablePreview` helper and migrates those existing examples alongside DataTable. The helper owns resize and overflow presentation in one CSS Module; it is not exported by the design-system package.

## Out of scope

- Per-column responsive priority or `column.collapseBelow`
- A row expander that gathers lower-priority columns
- A separate card renderer or consumer-provided mobile template
- JavaScript container measurement
- Changes to persisted column order, sizing, visibility, or pinning state
