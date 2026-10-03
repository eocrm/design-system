# `<DashboardCanvas>` — 2D snap-grid dashboard

Datadog-style 2D snap-grid dashboard. `value` is `{ items: DashboardPlacement[], sections: DashboardSection[] }` — top-level items plus an ordered array of full-width collapsible sections, each with its own sub-grid on the same column count (`columns` prop, default 24 — pass `columns={12}` for layouts saved against a 12-column schema like the eocrm layout-v2 spec; placements are NOT converted between column counts). Always controlled, no uncontrolled mode: `onChange(next)` fires once per completed gesture (a drop, a resize end, a collapse toggle, a band reorder, a cross-container move) with the whole engine-computed next value; omit it for a static layout — drags still preview live but nothing persists past pointerup. `renderItem(id)` renders every item's body — including items inside a COLLAPSED section, whose body stays mounted and `inert` rather than unmounting, so a widget that fetches on mount pays that cost even while collapsed — called once more for the drag ghost mid-gesture, so keep it pure. **The grid cell is chrome-less** (no background/border/radius/shadow, no minimum height beyond its `h` row-span) — wrap the return in `<Card>` for the boxed widget look, and size the content to the cell or accept bare (dotted, in edit mode) space showing below a shorter widget. `renderSectionHeader(id)` adds small extras (a title editor, a `DropdownMenu` trigger) to the right of a section's title, in the same `Accordion.Trigger` `actions` slot as the section's own band-reorder grip handle — neither ever starts a collapse toggle or a drag. `constraints` — a `Record<id, { minW?, minH?, maxH? }>` or a `(id) => constraints | undefined` function — clamps resize gestures per item; unlisted items default to `minW: 1`, `minH: 1`, no `maxH`. Section bands compose the DS `Accordion` (`type="multiple"`) for their header/chevron/panel look; edit mode (not `readOnly`, not below `stackBelow`) also shows a snap-grid of dots on each container so a drag/resize's destination cell is visible before you commit.

Gestures: drag-to-move with push-down collision + live compaction preview, E/S/SE resize handles, cross-container drag (top level ↔ any expanded section), and vertical band reorder by dragging a section header. Full keyboard: Tab to an item, Enter/Space picks it up, arrows move it (crossing a container's edge moves it into the next band), Shift+arrows resize, Enter/Space drops, Escape cancels; Shift+arrows on a focused section header reorders bands.

```tsx
const [value, setValue] = useState<DashboardCanvasValue>(initialLayout);

<DashboardCanvas
  value={value}
  onChange={setValue}
  renderItem={(id) => <Card>{widgets[id].title}</Card>}
  constraints={{ kpi: { minW: 2, maxH: 4 } }}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `DashboardCanvasValue` | yes | — | The controlled layout: top-level items plus an ordered array of collapsible sections. `DashboardCanvas` never mutates this value — every change flows out through `onChange`. |
| `onChange` | `((next: DashboardCanvasValue) => void)` | no | — | Fires once per completed gesture — a drop, a resize end, a collapse toggle, a section reorder, or a cross-container move — with the whole next `value`. Omit for a read-only or fully static canvas; without it, drags preview live but nothing persists on drop. |
| `renderItem` | `(id: string \| number) => ReactNode` | yes | — | Renders the body of an item by id. Called for every item on every render — including items inside a COLLAPSED section (its body stays mounted and `inert`, not unmounted, so Accordion's own collapse animation has real content to animate) — and once more for the dragged item mid-gesture (the cursor-following ghost). Keep it pure; a widget that fetches on mount pays that cost even while its section is collapsed. The cell itself is a bare positioned box with no background/border/radius/shadow of its own and no minimum height beyond its `h` row-span — that chrome belongs here, in whatever this returns (typically a `<Card>`); size the content to the cell, or accept that a shorter widget in a taller cell shows bare (dotted, in edit mode) space below it. |
| `renderSectionHeader` | `((id: string \| number) => ReactNode)` | no | — | Optional extra controls in a section's header (a title editor, a `DropdownMenu` trigger) rendered by section id, to the right of the title. Keep it small — the header row is not a general-purpose toolbar. Pointer presses inside the slot never start a band-reorder drag. |
| `constraints` | `DashboardCanvasConstraintsProp` | no | — | Per-item size constraints, consulted when clamping resize gestures. |
| `columns` | `number` | no | 24 | Column count of every container grid (top level and each section's sub-grid). All placement/resize bounds clamp against it. Minimum 1; fractional or sub-1 values are the consumer's bug, not validated. Layouts are NOT converted between column counts — a `value` saved at one `columns` renders at half width when the count doubles. Schemas written for the earlier 12-column grid (e.g. the eocrm layout-v2 spec) either pass `columns={12}` to match, or migrate their saved placements to 24. |
| `stackBelow` | `'sm' \| 'md' \| 'lg'` | no | 'md' | Container width at (inclusive) and below which every container grid re-templates to one column and pointer + keyboard editing turns off: `sm` 480px / `md` 640px / `lg` 768px, measured against the canvas's OWN width (container query), not the viewport. Section collapse toggles keep working at any width. |
| `readOnly` | `boolean` | no | false | View-only mode: identical geometry, but no drag/resize wiring, no resize handles, and no keyboard editing — the canvas renders `value` and lets section collapse toggles keep working. The canvas also disables editing on its own, without this prop, once its own width drops to or below the `stackBelow` breakpoint (single-column stack) — `readOnly` is for a consumer-chosen view mode, the width gate is automatic. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

**Cells are SQUARE by default**: the row unit derives from the canvas's own width (`(width - (columns - 1) * gap) / columns`), so cell height == cell width at every size and the whole layout scales fluidly — override `--dashboard-canvas-row` with a fixed length for fixed-height rows (`--dashboard-canvas-row-stacked`, default 48px, is the row unit of the single-column stack, where the square unit would be uselessly tiny).

`readOnly` turns off all editing (no handles, no keyboard editing) while section collapse toggles keep working — collapse is navigation, not editing. Independent of `readOnly`, at and below the `stackBelow` breakpoint (`'sm'` 480px / `'md'` 640px, the default / `'lg'` 768px) of the canvas's OWN width (a CSS container query, not the viewport) every container automatically re-templates to one column and editing turns off the same way — a `ResizeObserver` mirrors the breakpoint so a gesture can never half-start below it.

When NOT to use: a single ordered list (priority queue, simple reordering) — use `Sortable`; fixed kanban-style columns — use `Kanban`; a free-form node/edge graph — use `FlowCanvas`. The canvas is ALWAYS a size container (named `dashboard-canvas`, unconditionally) — give it a parent with a concrete width; an intrinsic-width context (a `Cluster` item, `width: max-content`) renders it at width 0, same caveat as Grid's `collapseBelow`.

A collapsed section's band is NOT a drop target — expand it first (no hover-to-expand). Escape or a pointer cancel mid-gesture restores the current `value` without firing `onChange`.

#### Anti-patterns

- ❌ Treating `value` as uncontrolled — passing it once with no `onChange`. Drags and resizes still preview live, but nothing persists past pointerup; the next render snaps the item back to the stale `value`.
- ❌ Nesting a `DashboardCanvas` inside another one's `renderItem`: a nested canvas fights its parent for pointer capture and Escape handling.
- ❌ Expecting the grid cell to draw a card-like surface. It is chrome-less by design so widgets with transparent bodies (charts, images) don't sit inside a redundant box — wrap `renderItem`'s output in `<Card>` for the boxed look.
- ❌ Using it for a simple ordered list — see "When NOT to use" above.
- ❌ Placing it in an intrinsic-width parent (a `Split` aside's default `auto` track, a `Cluster` item): the canvas is always a size container and renders at width 0. At and below `stackBelow` pointer + keyboard editing turns off (handles hidden, items not editing-focusable).

#### More examples

```tsx
// Persist every completed gesture: keep the canvas controlled AND save.
// Debounce / fire-and-forget is the caller's job.
const handleChange = (next: DashboardCanvasValue) => {
  setValue(next);
  saveDashboardLayout(dashboardId, next);
};

// Read-only record view — same value shape, no editing affordances.
<DashboardCanvas
  value={savedLayout}
  renderItem={(id) => <Card>{widgets[id].title}</Card>}
  readOnly
/>

// Constraints computed from data, e.g. locking size for chart widgets.
<DashboardCanvas
  value={value}
  onChange={setValue}
  renderItem={(id) => <Card>{widgets[id].title}</Card>}
  constraints={(id) => (widgets[id]?.kind === 'chart' ? { minW: 4, minH: 3, maxH: 6 } : undefined)}
/>
```
