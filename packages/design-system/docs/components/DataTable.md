# `<DataTable>` — server-driven data table with column features

- `loading` is non-destructive for populated tables: existing rows stay mounted
  during refetches so focused controls and row-local state survive. Skeleton
  rows are for the initial empty load only; the table exposes `aria-busy` in
  both cases and announces from its own polite live region — you do not need to
  wrap it, and wrapping it means two regions fire for one event.
- For an empty initial load, `skeletonDelay` (default `0`) hides quick loads and
  `skeletonMinDuration` (default `0`) keeps an appearing skeleton stable. The
  table renders neither empty state nor arriving rows during the visual window;
  `aria-busy` still follows actual `loading`, not the skeleton's visual tail.

```tsx
const instance = useDataTable<Deal>({
  data,
  columns,
  getRowId: (r) => r.id,
  enableRowSelection: true,
  sort,
  onSortChange: setSort,
});

<Cluster>
  <ColumnVisibilityTrigger instance={instance} />
</Cluster>
<DataTable instance={instance} aria-label="Deals" />
```

- Config-driven via `columns: ColumnDef<T>[]`. Each column has a stable `id` used as the key for all per-column state.
- **Column header names.** The `<th>` is named by the label span's content — the header text — so the resize handle is never folded into it (#500). The one override: a header that renders no TEXT OF ITS OWN — a ReactNode, a render function, or `''` — is named by `visibilityLabel` when you set one. So `header: <strong>Revenue</strong>` announces "Revenue", and adding `visibilityLabel="Revenue (USD)"` makes it announce "Revenue (USD)". That is a name-vs-label mismatch, and a WCAG 2.5.3 one only when `sortable` makes the label a button — 2.5.3 is scoped to user interface components, and it is violated only when the label does not CONTAIN the visible text, so "Revenue (USD)" over "Revenue" passes. Accepted because the alternative — a runtime measurement deciding which source names the header — produced UNNAMED column headers ten separate times before it was deleted. A string header that renders text is always named by that text; `visibilityLabel` does not override it. `header: ''` is not such a string: it renders nothing, so the label wins, which is what the trailing row-actions column wants. `column.id` is used for nothing a user hears — not the header, not the drag grip, not the resize handle. What such a header announces, measured off Chromium's AX tree: an `aria-labelledby` resolving to no text is marked INVALID, not treated as a name, so naming falls through to the cell's contents — the drag grip, or under `collapseBelow` the resize handle's live pixel width. `header: ''` is special-cased to a generic "Unlabelled column" so the width cannot win; a ReactNode rendering nothing is indistinguishable from one that names itself, so it is not. Either way it is not a name you chose, so set `visibilityLabel` on every text-less header. That is a change from before #500, where such a header WAS named — from content, which swept in the resize handle, so it announced the handle's label, `column.id` when the column had nothing better. That name was the #500 bug, not a feature worth preserving. (The "Resize … column" wrapper came WITH #500; before it the handle's label was the bare identifier.) There is no dev warning for it: nothing static can tell a node that names itself (`<strong>Revenue</strong>`) from one that does not (an icon), so a warning fired on the commonest valid shape and was removed. Give any non-text header a `visibilityLabel`.
- **Responsive rows:** `collapseBelow="sm" | "md" | "lg"` re-templates rows as labelled cards based on the DataTable container. Labels use `visibilityLabel`, then a string `header`; give non-text headers a `visibilityLabel` when a visible card label is required. Plain non-sortable string headers leave the compact strip, while React-node and render-function headers remain because they may contain controls. Sorting, selection, expansion, row actions, and `ColumnVisibilityTrigger` remain available. Column sizing, pinning, and ordering state is retained while stacked, but resize/reorder controls and sticky pin presentation are unavailable until the table widens again. Give the table concrete available width because inline-size containment has no intrinsic-width contribution.
- All state pieces (column order/sizing/visibility/pinning, row selection/expansion, sort) follow the Radix controlled/uncontrolled pattern: `value` + `onValueChange`, OR `defaultValue` only, OR neither.
- Server-driven sort/search/pagination. DataTable does NOT transform data — `data` must be the server's pre-sorted, pre-paginated slice. `onSortChange` is your trigger to refetch.
- `enableRowSelection: true` adds a leading checkbox column with select-all (indeterminate when partial). `toggleAllOnPage` ignores `pinnedRows`.
- Drag-to-reorder is keyboard-accessible (Tab to grip → Space to pick up → ←/→ to move → Space/Enter to drop → Esc to cancel). The grip is hover-revealed on desktop.
- Resize via the right-edge handle. Without `collapseBelow`, the legacy keyboard path stays on a focused sortable header label: `←`/`→` for −/+8px; Shift+`←`/`→` for ±32px. With `collapseBelow`, the wide presentation exposes a dedicated focusable resize separator with the same keys; the separator and resize interaction are unavailable while stacked and return after widening.
- `ColumnVisibilityTrigger` is the only built-in companion. For column pinning UI (Phase 2 ships state, no built-in UI), wire your own using `instance.pinColumn(id, side)`.
- **Phase 2 ships pinning rendering.** `columnPinning` now applies sticky CSS with cumulative offsets and an inside-edge shadow; `pinnedRows` renders in a separate `<tbody>` above the main body. The selection auto-column is auto-left-pinned at offset 0. Pinned columns are LOCKED in place — no drag grip, can't be reordered. Their sort still works. Declare initial pinning either on the hook (`defaultColumnPinning: { left: ['name'], right: ['actions'] }`) or directly on each column (`pin: 'left' | 'right'`); the hook prop wins when both are set. **Phase 3 ships expandable rows.** Pass `renderExpandedRow: (row) => ReactNode` to add a per-row chevron auto-column at the left edge. Clicking the chevron toggles a detail row beneath the main row, spanning all columns. ARIA-wired with `aria-expanded` + `aria-controls`. The chevron auto-column is sticky-left like the selection cell; when both are enabled, selection is first and expand is second. DataTable is now feature-complete per the original spec.
- **Cell content is single-line + ellipsized by default.** DataTable's internal table uses `table-layout: fixed` so column widths from `ColumnDef.size` (or runtime `columnSizing`) are authoritative, and every cell gets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Wide content truncates with `…` at the column boundary; the column does NOT expand to fit. If you need multi-line cells, render `<Table>` directly — DataTable is opinionated here so pinning offsets stay pixel-correct.
- **`dragWholeColumn`** (default `true`): while a column is dragged to reorder, its body cells travel with its header and displaced columns shift their cells too, so the header row and body never disagree mid-drag. Offsets ride a CSS custom property on the table element, so pointer movement never re-renders the body. Set `false` for the cheaper preview where only the header cell moves. Pinned columns never move either way.
- **A column drag commits wherever the preview parked it** — however far the pointer roams, including over a pinned column or clear off the table (#383). There is no "outside" to release into: the column is clamped to the unpinned band, so the preview is always showing a real slot and the drop honors it. This deliberately differs from `Kanban`, where releasing outside the columns cancels (#387) — there the pointer can genuinely aim somewhere else. **Escape is the only cancel.** The `dragWholeColumn={false}` opt-out is the exception: its preview is dnd-kit's own and RETRACTS (the header snaps home) when no unpinned slot is under the column, so a release there is discarded — matching what that preview shows.

**Anti-patterns:**

- ❌ Mutating `columns` array identity on every render. `useDataTable` captures `defaultColumnOrder` from `columns` once at mount — later identity changes don't trigger a re-derive of the default order. Use a stable reference (`useMemo` or module-level).
- ❌ Client-sorting `data` AND passing `sort` controlled. Pick one — server is the canonical source. Spinning both means rows reorder twice and ghost-rows appear during fetches.
- ❌ Rolling your own column visibility UI when `ColumnVisibilityTrigger` does the job. The built-in handles the "last column" guard for you.
- ❌ Using `<Table>` directly when you want any of: ordering, sizing, visibility, selection, sort indicator wiring. Compose `<DataTable>` instead — the primitive `<Table>` is for static read-only views.
- ❌ Putting interactive controls in `renderExpandedRow` that need to participate in row selection or row click. The detail row is its own `<tr>`, not part of the main row — `onRowClick` doesn't fire from inside it (by design), and `rowSelection` only tracks main-row checkboxes.
- ⚠ Pinned rows (passed via `pinnedRows`) ALSO render a chevron when `renderExpandedRow` is set — they're expandable just like main-body rows. Decide whether your starred/anchored rows should reveal detail; if not, omit `renderExpandedRow` or filter `expandedRows` state in the consumer to ignore pinned-row ids.
