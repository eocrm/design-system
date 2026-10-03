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

**Cells are SQUARE by default**: the row unit derives from the canvas's own width (`(width - (columns - 1) * gap) / columns`), so cell height == cell width at every size and the whole layout scales fluidly — override `--dashboard-canvas-row` with a fixed length for fixed-height rows (`--dashboard-canvas-row-stacked`, default 48px, is the row unit of the single-column stack, where the square unit would be uselessly tiny).

`readOnly` turns off all editing (no handles, no keyboard editing) while section collapse toggles keep working — collapse is navigation, not editing. Independent of `readOnly`, at and below the `stackBelow` breakpoint (`'sm'` 480px / `'md'` 640px, the default / `'lg'` 768px) of the canvas's OWN width (a CSS container query, not the viewport) every container automatically re-templates to one column and editing turns off the same way — a `ResizeObserver` mirrors the breakpoint so a gesture can never half-start below it.

When NOT to use: a single ordered list (priority queue, simple reordering) — use `Sortable`; fixed kanban-style columns — use `Kanban`; a free-form node/edge graph — use `FlowCanvas`. The canvas is ALWAYS a size container (named `dashboard-canvas`, unconditionally) — give it a parent with a concrete width; an intrinsic-width context (a `Cluster` item, `width: max-content`) renders it at width 0, same caveat as Grid's `collapseBelow`.
