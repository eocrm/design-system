# `<TreeView>` — lazily loaded hierarchy, as a file list or an org chart

TL;DR: a WAI-ARIA tree for hierarchies the app loads level by level (organization units, folders, categories). Two views of the same data: `list` (file-explorer rows) and `chart` (classic top-down org chart). The app owns fetching, caching and errors; TreeView owns rendering, keyboard, focus, selection and the loading / error / "N more" rows.

```tsx
import { TreeView, type TreeViewNode } from '@eocrm/design-system';

const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
const children = useQueries({ queries: [...expanded].map((id) => unitsQuery({ parent: id })) });
const byId = new Map([...expanded].map((id, i) => [id, children[i]]));

<TreeView
  aria-label="Organization structure"
  view="list" // or "chart"
  roots={roots.map(toNode)}
  childrenOf={(id) => {
    const q = byId.get(id);
    return q?.isError ? { error: true } : q?.data?.units.map(toNode); // undefined = loading
  }}
  expandedIds={expanded}
  onExpandedChange={(id, open) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    })
  }
  selectedId={selectedId}
  onSelect={openDrawer}
  onRetry={(id) => byId.get(id)?.refetch()}
  overflowOf={(parentId) =>
    hiddenCount(parentId) > 0 ? { label: t('more', { count: hiddenCount(parentId) }) } : null
  }
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `aria-label` | `string` | yes | Accessible name of the tree, e.g. "Organization structure". Required. |
| `view` | `'list' \| 'chart'` | no | Presentation. Default `'list'`. - `'list'` — file-explorer rows indented per level with a chevron; ↑/↓ walk rows, →/← expand/collapse. - `'chart'` — classic top-down org chart of boxes with connector lines; scrolls horizontally inside itself when wider than its container. Spatial keys: ↓ into children, ↑ to the parent, ←/→ between siblings. |
| `roots` | `TreeViewNode[]` | yes | Top-level nodes. |
| `childrenOf` | `(id: string) => TreeViewChildren` | yes | Children of an expanded node: the array once loaded, `undefined` while loading, `{ error: true }` on failure. Called only for expanded nodes. |
| `expandedIds` | `ReadonlySet<string>` | yes | Ids of expanded nodes (controlled). Fetch a node's children when it appears here. |
| `onExpandedChange` | `(id: string, expanded: boolean) => void` | yes | Called when the user expands or collapses a node. |
| `selectedId` | `string \| null` | no | Selected node id (controlled). Ignored when `onSelect` is absent. |
| `onSelect` | `((id: string) => void)` | no | Called on click / Enter / Space on a node. Omit for a tree without selection (no `aria-selected`). Selection never follows focus. |
| `onRetry` | `((id: string) => void)` | no | Makes a failed level's "Couldn't load. Retry" row actionable; called with the parent id. Without it the row is inert text. |
| `overflowOf` | `((parentId: string \| null) => TreeViewOverflow \| null)` | no | "N more not shown" row at the end of a level (`parentId` `null` = root level), or `null` for none. Pass `onLoadMore` to make it actionable. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Nodes.** `TreeViewNode = { id: string; label: string; hasChildren: boolean; content?: ReactNode }`. `hasChildren` drives the chevron / toggle and `aria-expanded` even before the children load; `label` is the accessible name and the typeahead text.
- **Lazy by contract.** `childrenOf(id)` is called only for expanded nodes: return the array once loaded, `undefined` while loading (a "Loading…" row), `{ error: true }` on failure (a "Couldn't load. Retry" row; actionable only with `onRetry`). Start the fetch when an id appears in `expandedIds`. A tree already in memory is fine too: return arrays immediately, don't fake loading.
- **Controlled.** `expandedIds` / `onExpandedChange` and `selectedId` / `onSelect` are controlled. Omit `onSelect` for a tree without selection. Selection never follows focus: arrows move, Enter / Space / click select.
- **Overflow.** `overflowOf(parentId)` (`null` = root level) returns `{ label, onLoadMore?, loading? }` (or `null`) and adds a muted "N more not shown" row at the end of a level. `onLoadMore` makes it actionable, `loading` marks the fetch in flight; focus then moves to the first new item (if nothing new arrives it stays on the overflow row).
- **Rows** are named by `label`; `content` is visual only and must not contain buttons, links or inputs (a treeitem's content is not separately reachable). Put actions in the selection target (a drawer, a detail pane).
- **Keyboard — list:** ↑/↓ move, → expands or enters, ← collapses or goes to the parent, Home/End, Enter/Space select, type to jump (the typeahead buffer resets after 500ms). **Chart:** ↓ expands or enters, ↑ collapses or goes to the parent, ←/→ move between siblings; the tree describes these keys to screen readers (merged with your own `aria-describedby`).
- **Screen readers:** one tab stop; levels, positions and expanded state come from ARIA. A slow (≥ 300ms) user-triggered load is announced once ("Loading…"), a failure is announced; success is silent. After Retry focus stays on the status row while loading and moves to the first child when children arrive (if the retry fails again it stays on the Retry row).
- **Sizing.** `list` grows with its content — put it in a scrolling parent for long trees. `chart` fills its parent's width and scrolls horizontally inside itself when the chart is wider; it opens centred on the selected (or first) item, and the focused box scrolls into view.

#### When NOT to use

- ❌ App navigation → `Rail` (with `Rail.Group`).
- ❌ A flat or two-level list → `Card.List`, `Table`, `Accordion`.
- ❌ Multi-select / checkbox trees, drag-and-drop reordering — not supported.

#### Anti-patterns

- ❌ Buttons, links or menus inside `content`.
- ❌ Returning `undefined` forever on a failed fetch — return `{ error: true }`.
- ❌ Selecting on focus (opening a drawer on every arrow key).
- ❌ Wrapping the chart view in a fixed-width scroller — it scrolls itself.
