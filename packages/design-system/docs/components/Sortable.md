# `<Sortable>` — drag-to-reorder list (single column)

For reorderable lists — todo priority, image gallery, settings ordering, queue management. Renders `<ol>`/`<li>`. Compound: `Sortable`, `Sortable.Item`, `Sortable.Handle`. Built on `@dnd-kit/sortable`; mouse / touch / pen via PointerSensor + keyboard via KeyboardSensor.

```tsx
import { arrayMove } from '@dnd-kit/sortable';

const [items, setItems] = useState([
  { id: 1, title: 'Onboarding email' },
  { id: 2, title: 'Renewal reminder' },
  { id: 3, title: 'Quarterly report' },
]);

<Sortable onReorder={({ from, to }) => setItems((curr) => arrayMove(curr, from, to))}>
  {items.map((item) => (
    <Sortable.Item key={item.id} id={item.id}>
      <Card>
        <Cluster gap="sm" align="center">
          <Sortable.Handle aria-label={`Reorder ${item.title}`}>
            <GripVertical size={14} />
          </Sortable.Handle>
          <Title order={3}>{item.title}</Title>
        </Cluster>
      </Card>
    </Sortable.Item>
  ))}
</Sortable>;
```

Props on the root: `onReorder?: ({ from, to, id }) => void` — fires only when the drop position differs from the source. Consumer owns the items array and re-renders with the new order. `arrayMove` is shipped by `@dnd-kit/sortable` (the library is already a dep) — import it from there. Items must have a stable `id` prop (`string | number`). `restrictToContainer?: boolean` (default `true`) — clamps the drag to the list's bounding box so the dragged item can't leave the `<ol>`; pass `false` for free-drag (item follows the cursor anywhere on the page). `arrangement?: 'list' | 'grid'` (default `'list'`) + `columns?: number` (grid only, default 12) — see **Grid arrangement** below.

**Grid arrangement** (`arrangement="grid"`): re-lays the `<ol>` as a `columns`-track CSS grid (`columns?: number`, default 12) driven by dnd-kit's `rectSortingStrategy`, so siblings reflow in **2D** during a drag instead of shifting only vertically. Give each item a span via `<Sortable.Item span="50%">` (or `span={6}` / `span="100%"`) — **same values as `Grid.Item`** (`25%`→3 … `75%`→9 tracks of 12; `100%`/`full`→whole row). Rows are equal-height (`align-items: stretch`). Semantics stay order-based: a drop reorders the flow — nothing persists a grid x/y position. `restrictToContainer` still clamps the drag to the grid box. Default `arrangement="list"` is unchanged (single vertical column). Canonical use: a WYSIWYG dashboard customize view where edit mode mirrors view mode's 12-col widget grid.

```tsx
<Sortable arrangement="grid" columns={12} onReorder={handle}>
  {widgets.map((w) => (
    <Sortable.Item key={w.id} id={w.id} span={w.span}>
      <Card style={{ height: '100%' }}>{w.title}</Card>
    </Sortable.Item>
  ))}
</Sortable>
```

`collapseBelow` (grid arrangement only) mirrors Grid's `collapseBelow` exactly — `'sm' | 'md' | 'lg'` for a binary collapse to one column, or `{ md: 6, sm: 1 }` for a graduated step-down with item spans clamped per step. The map form wraps the `<ol>` in an extra size-container `<div>`, for the same reason and with the same consequences as Grid's map form (see `<Grid>` below); `ref`, `className`, `style` and spread props stay on the `<ol>`.

**Drag origin** (hybrid): if `<Sortable.Handle>` is present in the Item subtree, only the Handle initiates drag. If no Handle is present, the entire Item is draggable + focusable. A 5px activation distance means short clicks-without-movement on internal buttons / links pass through.

**Keyboard reorder**: Tab to focus the Handle (or the Item if no Handle), press **Space** to pick up, **ArrowUp** / **ArrowDown** to move, **Space** to drop, **Escape** to cancel. dnd-kit's KeyboardSensor ships built-in `aria-live` announcements describing each move. Inside a `Modal`/`Drawer`, an in-progress drag is an Escape-consuming mode: Escape cancels the drag and the host survives that press; the next Escape closes the host (#282). Same for `DataTable` column reorder.

**Drop visual / async-safe**: the dragged item renders in a dnd-kit `<DragOverlay>` (a portaled, fixed-position clone); the active list `<li>` is an invisible placeholder during drag. Because the overlay owns the drop animation, the in-list row never carries a stale drag transform — so `onReorder` may commit the new order **asynchronously / optimistically** (e.g. an optimistic TanStack mutation's `onMutate` that lands a tick late) without the dropped row glitching ("fly up then settle"). You no longer need to reorder synchronously. The drop animation respects `prefers-reduced-motion` (it's disabled under reduced motion).

**Anti-patterns**

- ❌ Mutating items in place inside `onReorder`. Always return a new array (`arrayMove(items, from, to)` from `@dnd-kit/sortable`) — React needs a fresh reference.
- ❌ Using a non-stable `id` (e.g. array index). The id must persist across reorders for React reconciliation and for `onReorder`'s `id` field to be meaningful.
- ❌ Wrapping non-`Sortable.Item` content inside `<Sortable>`. dnd-kit's `SortableContext` only tracks the ids you pass it; arbitrary children render but won't be reorderable.
- ❌ Relying on whole-item drag (no Handle) for screen-reader-accessible lists. Without a Handle, dnd-kit puts `role="button"` on the `<li>` and the listitem semantics are lost — screen readers stop announcing "item N of M." For accessible lists, always include a `<Sortable.Handle>`.
