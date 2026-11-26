# TreeView move — drag and keyboard reorder / reparent (DS-93)

## Intent

eocrm's wiki page tree (EO-273, EO-260 slice C) needs users to reorder pages among siblings and move a page
under another parent — by pointer, touch and keyboard. eocrm's API takes `{ parent_id | null, position }`.
Today eocrm uses a "Move…" dialog (no drag). `Sortable`/`SortableGroup` only reorder flat lists.

## Goals / non-goals

- Goals: opt-in move in `TreeView`'s **list** view: reorder among siblings, reparent (incl. into collapsed or
  unloaded nodes), keyboard parity, visible drop indicators, screen-reader announcements, app veto (`canDrop`).
- Non-goals: chart view (ignores `onMove`; documented), multi-select move, cross-tree drag, undo, moving the
  "loading / error / N more" pseudo-rows (never draggable or droppable).
- Anti-goals: a click or tap must still select (no accidental drags); moving must never silently lose a node
  (refusals are announced; nothing changes unless `onMove` fires).

## Approaches

- **@dnd-kit over flattened rows with custom hit-testing — chosen.** Already a dependency (Sortable,
  DataTable, Calendar); gives pointer + touch sensors, drag overlay, autoscroll; we own collision and ARIA.
- Native HTML5 DnD — no touch, inconsistent previews/ghosts.
- Reuse `Sortable` — flat lists only; nesting would fight its model.

## API (additions to `TreeViewProps`)

```ts
/** Fires after a pointer drop or keyboard move. TreeView stays controlled: update roots / childrenOf. */
onMove?: (move: TreeViewMove) => void;
/** App veto, checked for every candidate target (pointer hover and keyboard moves). Default: allow. */
canDrop?: (id: string, targetParentId: string | null) => boolean;

interface TreeViewMove {
  id: string;
  /** New parent, or null for the root level. */
  parentId: string | null;
  /**
   * Final 0-based position among the new parent's children AFTER the move (i.e. with the node removed
   * from its old place first). `null` = append at the end; the new parent's children are not loaded.
   */
  index: number | null;
}
```

Without `onMove`: no drag, no shortcuts, no description — identical to today.

A no-op (dropping a node back on its own position) does not fire `onMove`.

## Built-in refusals (before `canDrop`)

- The node itself and its **rendered** descendants are never targets (cycles through unloaded branches are
  the app's job → `canDrop`).
- Pseudo-rows (loading / error / overflow) are never sources or targets.

## Pointer & touch

- Whole row is the drag source. Activation: mouse/pen after 4px movement; touch after a ~250ms press with
  ≤5px tolerance (dnd-kit `PointerSensor` / `TouchSensor` constraints), so clicks/taps still select and
  touch scrolling still scrolls.
- Hit-testing on the row under the pointer by vertical position: top 25% → **before**, bottom 25% →
  **after**, middle 50% → **inside**. Exception: "after" on an **expanded** node with visible children means
  "before its first child" (index 0 inside it) — matches what the user sees. Over the empty space below the
  last row → after the last root.
- Indicators: a 2px accent line at the row's top/bottom edge, indented to the target depth (before/after);
  the row tinted + outlined for inside. A refused target shows no indicator and the drop does nothing.
- Drag preview: a compact copy of the row label (dnd-kit `DragOverlay`); the source row is dimmed in place.
- Hover-to-expand: hovering **inside** a collapsed, expandable node for ~700ms calls
  `onExpandedChange(id, true)`; leaving cancels the timer. (Nodes are expandable per `TreeViewNode` as today.)
- Autoscroll inside the tree's own scroll container (dnd-kit autoScroll), never the page beyond it.
- Escape cancels; dropping outside the tree cancels.

## Keyboard (focused node, list view, when `onMove` is set)

| Keys           | Move                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ctrl/⌘+Shift+↑ | swap with previous sibling (index − 1)                                                                                                                  |
| Ctrl/⌘+Shift+↓ | swap with next sibling (index + 1)                                                                                                                      |
| Ctrl/⌘+Shift+→ | become the previous sibling's last child (`index` = its loaded child count, or `null` if not loaded); the new parent is expanded via `onExpandedChange` |
| Ctrl/⌘+Shift+← | move to the grandparent, directly after the old parent                                                                                                  |

- At a boundary (first/last sibling, no previous sibling, already at root) or when refused, nothing moves and
  an announcement says why ("Can't move further up", "Can't move here").
- Focus stays on the moved node after the app re-renders it in its new place (re-focus by id).
- The shortcuts are advertised via `aria-description` on the tree (i18n), and in docs.
- Shortcuts don't fire while typeahead is mid-sequence? — No conflict: typeahead uses printable keys only.

## Announcements (polite live region owned by TreeView, rendered unconditionally)

- Pointer: "Picked up Setup." / "Setup: before FAQ" / "inside Intro" / "Setup moved into Intro, position 3 of
  3." / "Move cancelled." — reuse `_internal/dragAnnouncements` helpers where they fit.
- Keyboard: the result sentence only. Position "N of M" uses loaded sibling counts; when unknown ("index
  null"), "Setup moved into Intro." without a position.
- All strings in i18n (en + ru).

## Resolved details (controller's calls after the builder check)

- **Index is counted among loaded children.** Same-parent moves are adjusted for the removal in the pure
  maths (before X where the source sits above X → X's index − 1). `null` whenever the true end position is
  unknown: the target parent is collapsed (TreeView never calls `childrenOf` for collapsed nodes), its
  children are still loading or errored, or it has an overflow row ("N more" — more children exist beyond
  those loaded) and the drop appends at the end.
- **"Inside" targets:** any real node, leaf or not (a wiki page can gain its first child). A leaf
  (`hasChildren: false`) and a loaded empty node give `index: 0`; whether it's allowed is `canDrop`'s call.
  The app sets `hasChildren: true` on the new parent when it re-renders.
- **Ctrl/⌘+Shift+→ order:** check refusals → fire `onMove` → then `onExpandedChange(newParent, true)` if it
  was collapsed. Unloaded new parent → still moves, `index: null`.
- **Key conflicts:** TreeView has no multi-select and no modifier bindings today; the move handler runs
  before `keyAction` and calls `preventDefault`. The modifier is Ctrl on Windows/Linux, ⌘ on macOS (either
  accepted: `ctrlKey || metaKey`, with `shiftKey`). Plain/Shift-only arrows are unchanged.
- **No virtualization** in TreeView: hit-testing uses the rendered rows' rects; "below the last row" = after
  the last root.
- **RTL:** TreeView has no RTL handling today; the move keys follow the same physical arrows as expand /
  collapse do (→ indent, ← outdent). Indicator indentation uses logical properties so it mirrors in RTL.
  RTL-aware arrows for the whole tree is a separate change.
- **Dragging an expanded node:** it stays expanded; it and its rendered descendants are dimmed and are not
  targets (hit-testing skips them, so hovering them shows no indicator).

## Builder's calls

Exact token names for indicator colours (component tokens defaulting to accent), the drag overlay styling,
how hit-testing is factored (pure function on row rects — must be Node-testable), animation (none required).

## Testing

- Node: pure move maths (keyboard target computation, index semantics incl. same-parent reorder, hit-zone
  → target mapping, refusals).
- jsdom: keyboard shortcuts → `onMove` payloads, boundary/refusal announcements, focus retained,
  `aria-description` present only with `onMove`; no behaviour change without `onMove`.
- Playwright (manual, in the playground): pointer drag before/after/inside, hover-to-expand, autoscroll,
  touch long-press on an emulated phone.
