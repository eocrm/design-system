# TreeView — lazy hierarchical tree, list + org-chart views (#637)

## Goal

eocrm's tenant Organization screen (`apps/web/src/tenant/organization/StructureTab.tsx`) needs a lazily
loaded hierarchy of organization units (company → department → team …). It ships a shim
(`apps/web/src/shared/ds-shims/TreeView.tsx`). Replace it with a DS `TreeView` that:

- follows the WAI-ARIA APG tree pattern (one tab stop, arrow-key navigation, expand/collapse);
- leaves data fetching to the app (controlled expansion; children supplied per node);
- fixes the shim's gaps: a failed child load spins forever, overflow rows are dead ends, strings bypass i18n;
- offers two presentations of the same tree: `list` (file-explorer) and `chart` (classic top-down org chart).

Success: eocrm swaps the shim with a mostly mechanical diff and gains error/retry and load-more.

## Public API

```ts
/** One node of the tree. */
export interface TreeViewNode {
  id: string;
  /** Accessible name and typeahead text; rendered when `content` is absent. */
  label: string;
  /** Whether the node can expand (children may not be loaded yet). */
  hasChildren: boolean;
  /** Rich, NON-interactive row content. Visual only — the row is named by `label`. */
  content?: ReactNode;
}

/** Children of a node: loaded array, `undefined` while loading, `{ error: true }` when the load failed. */
export type TreeViewChildren = TreeViewNode[] | undefined | { error: true };

/** "N more not shown" row at the end of a level. */
export interface TreeViewOverflow {
  label: string;
  /** Makes the row actionable (Enter / click). */
  onLoadMore?: () => void;
  /** Load-more fetch in flight: the row shows the translated loading text and is inert. */
  loading?: boolean;
}

export type TreeViewView = 'list' | 'chart';

export interface TreeViewProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect' | 'children'
> {
  'aria-label': string; // required
  view?: TreeViewView; // default 'list'
  roots: TreeViewNode[];
  childrenOf: (id: string) => TreeViewChildren;
  expandedIds: ReadonlySet<string>; // controlled only
  onExpandedChange: (id: string, expanded: boolean) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void; // omitted → no selection, no aria-selected
  onRetry?: (id: string) => void; // omitted → error row is inert text
  overflowOf?: (parentId: string | null) => TreeViewOverflow | null; // null = root level
}
```

Differences from the issue's API, and why:

- `loadingLabel` / `expandLabel` dropped (Hard rule 9: no per-component label props). New `Messages` keys
  `treeView.loading`, `treeView.loadError`, `treeView.retry`, `treeView.chartHint` (en + ru). The chevron is not
  focusable and not named (see Interaction), so `expandLabel` has nothing to name.
- `overflowLabel(parentId) => string | null` → `overflowOf(parentId) => TreeViewOverflow | null`, which also covers
  the root level (`parentId = null`) so eocrm can drop its out-of-tree root "N more" text.
- `childrenOf` may return `{ error: true }`; `onRetry` makes the error row actionable.
- `expandedIds` is controlled only: the consumer must react to every expand to fetch anyway, so an uncontrolled
  mode buys nothing for a lazy tree.
- `view` added (user request): `'list'` | `'chart'`.

Spread order: `{...rest}` FIRST on the tree root so `role="tree"`, `aria-label`, `aria-describedby` and
`onKeyDown` cannot be overridden (Pattern B). `forwardRef` to the tree root (`HTMLDivElement`); `className` merged.

## Structure (both views)

```
div[role=tree][aria-label]                     (chart: also aria-describedby=hint, internal scroll container)
  div[role=treeitem][aria-level][aria-setsize][aria-posinset][aria-expanded?][aria-selected?][aria-label=label]
    <row visual: chevron/toggle + content>
    div[role=group]                            (only when expanded)
      …child treeitems
      status treeitem (loading | error | overflow), when applicable
```

- `aria-expanded` only on `hasChildren` nodes; `aria-selected` only when `onSelect` is passed.
- `aria-setsize` / `aria-posinset` count real nodes only (status rows excluded), so they stay right with
  paginated levels.
- Root-level overflow renders as a status treeitem after the last root (level 1).
- Status treeitems: `aria-level` of their siblings, no `aria-expanded` / `aria-selected`.
  - Loading: `aria-disabled="true"`, name `treeView.loading` ("Loading…"); shows an `aria-hidden`
    indeterminate `CircularProgress` + text.
  - Error: name `"{loadError}. {retry}"` ("Couldn't load. Retry") when `onRetry` is passed (actionable),
    else `loadError` with `aria-disabled`.
  - Overflow: name = `label`; actionable when `onLoadMore` and not `loading`; while `loading`, name and text are
    `treeView.loading` and it is `aria-disabled`.
  - Inert status rows are still focusable (reachable by arrows) — `aria-disabled`, not removed.
- Implementation note: build the flat list of _visible items_ (nodes + status rows, with level / parent / index)
  in a pure function `visibleItems()` in `treeModel.ts` (Node-tested, `*.test.ts`). Rendering stays nested;
  keyboard navigation reads the flat list.

## Interaction

### Focus

- Roving tabindex: exactly one item has `tabIndex=0` — the focused item if still visible, else the selected
  item if visible, else the first item. All others `-1`.
- If the focused item becomes invisible (an ancestor collapsed), focus moves to that ancestor (only when focus
  was inside the tree).
- After load-more / retry, when new children appear, focus moves to the first newly arrived node (remember the
  child count when the action fired; when the count grows, focus `children[oldCount]`). For retry this is the
  first child.

### Keys — shared

- Home / End: first / last visible item.
- Enter / Space: on a node → `onSelect(id)` (if passed). On an actionable error row → `onRetry(parentId)`; on an
  actionable overflow row → `onLoadMore()`. Selection never follows focus.
- Typeahead: a printable character moves to the next visible node (after the focused one, wrapping) whose
  label starts with the typed string; characters typed within 500ms accumulate. Status rows are skipped.
- `*` (expand all siblings) deliberately not implemented: it would fire a burst of fetches.
- Handled keys `preventDefault`; keys from nested elements (`event.target !== currentTarget` of the item)
  are ignored.

### Keys — `view="list"` (APG)

- ↓ / ↑: next / previous visible item.
- →: collapsed parent → `onExpandedChange(id, true)`; expanded parent → first child item (status row counts);
  leaf → nothing.
- ←: expanded parent → `onExpandedChange(id, false)`; otherwise → parent item (root → nothing).

### Keys — `view="chart"` (spatial, user decision)

- ↓: collapsed parent → expand; expanded parent → first child item; leaf → nothing.
- ↑: expanded parent → collapse; otherwise → parent (root → nothing).
- ← / →: previous / next sibling item (status rows are siblings); no wrap.
- The tree's `aria-describedby` points at a visually hidden `treeView.chartHint` ("Use up and down arrows to move
  between levels, left and right arrows to move between siblings.").

### Mouse

- Click a node row: focus it and `onSelect(id)`.
- Click the chevron (list) / bottom-edge toggle (chart): `onExpandedChange(id, !expanded)` only (no select);
  the toggle is a non-focusable `aria-hidden` element (`span`), clicks stop propagation.
- Click an actionable status row: same as Enter.

### Announcements (Hard rule 10)

- One visually hidden live region (the DS `LiveRegion`), always mounted, outside every treeitem.
- It speaks only for transitions the user triggered (expand, retry, load-more), and only once the triggered
  item has been pending ≥ 300ms: "Loading…". If the triggered load then fails: "Couldn't load". Success is
  silent (focus moving to the new node / the items appearing is the feedback). Initial render is silent.
- Rationale: the expanding user is focused on the parent, not the loading row (a change while attention is
  elsewhere → region); arrivals later find the state in the status row's name (property on arrival).
- No `aria-busy` (never sufficient alone; the region + names cover it).

## Visuals

### `view="list"`

- Rows are full-width bands, `min-height: var(--tree-view-row-height)`, indented by
  `calc(var(--tree-view-level) * var(--tree-view-indent))` via `padding-inline-start` (RTL-aware), with
  `--tree-view-level` set inline per row. No per-level wrapper element.
- Fixed-width chevron slot (`--tree-view-toggle-size`); leaves keep the empty slot so text aligns. Lucide
  `ChevronRight`, rotated 90° when expanded (like `Rail`'s group chevron), `prefers-reduced-motion` respected.
- Hover: `--tree-view-row-hover-bg`. Selected: `--tree-view-row-selected-bg` + `--tree-view-row-selected-fg`.
  `:focus-visible` → standard `focus-ring` mixin. No guide lines.
- Height is content-driven; the parent scrolls a long tree.

### `view="chart"`

- Root: internal scroll container (`overflow: auto`, `width: 100%`); content centred when it fits, scrolls
  horizontally when wider. Focusing an item calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })`.
- Node = box: `--tree-view-box-border`, `--tree-view-box-radius`, `--tree-view-box-padding`,
  `max-inline-size: var(--tree-view-box-max-width)`; text wraps. Selected: `--tree-view-box-selected-border` +
  selected background. Hover background as list.
- Parent toggle: small circle centred on the box's bottom edge (chevron-down collapsed / minus expanded).
- Children: centred flex row under the parent. Connectors via `::before` / `::after` in
  `--tree-view-connector` at `--tree-view-connector-width`: vertical drop from the parent, horizontal bar
  spanning first-to-last child centre, vertical stub into each child (classic CSS org-chart technique — no
  measurement, lazy children just flow in). Several roots sit side by side.
- Status rows are small muted boxes in the child row (they get connectors too).

### Tokens (`TreeView.tokens.scss`, all default to primitives)

row-height, gap, indent, toggle-size, row-hover-bg, row-selected-bg, row-selected-fg, status-fg,
error-fg (`--color-fg-danger`), box-border, box-radius, box-padding, box-max-width, box-selected-border,
connector, connector-width, level-gap (chart vertical spacing), sibling-gap (chart horizontal spacing), ring.

## Testing

- `treeModel.test.ts` (Node): `visibleItems` — collapsed/expanded, loading/error/overflow rows, root overflow,
  setsize/posinset exclude status rows; key → target resolution for list and chart maps; typeahead matching.
- `TreeView.test.tsx` (jsdom): roles + aria attributes; roving tabindex & fallback order; each key in both views
  (incl. expand/collapse callbacks); click vs toggle click; selection omitted without `onSelect`; retry and
  load-more via Enter and click; focus to first new child after load-more; focus to ancestor on collapse;
  live region: silent on mount, "Loading…" after 300ms of a user-triggered pending load (fake timers), error
  announcement, silent on success; ref + className + spread order (consumer `role` can't override); i18n keys
  in en + ru.
- Playwright only if a chart-view layout fact can't be shown in jsdom (not planned).

## Deliverables (Core invariant)

Component + tests, `src/index.ts` export (component + types), i18n keys (en/ru), `docs/components/TreeView.md`
(TL;DR, both views, eocrm-style lazy example, when NOT to use: navigation menus → `Rail`, flat lists,
selectable trees with checkboxes, interactive content in rows) + `npm run build:docs`, `AI-PRIMER.md` line,
CLUSTERS entry in both manifest maps + `npm run build:manifest`, playground `TreeViewDemo.tsx` (list, chart,
lazy with simulated latency + failure + load-more) wired into App route, navItems, ComponentsIndex +
overviewSchematics, registry `ComponentName`; `build:props`.

## Out of scope

Multi-select / checkboxes, drag-and-drop reorder, `*` expand-all, uncontrolled expansion, zoom/pan in the chart
view, horizontal (left-to-right) org chart.
