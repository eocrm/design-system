# `<SortableGroup>` — multi-container sortable (drag between lists)

`<SortableGroup onMove>` + `<SortableGroup.Container id items>` under one shared `DndContext` — drag `<Sortable.Item>`s within a list AND between lists. Controlled + live: `onMove({ id, from:{container,index}, to:{container,index} })` fires on each cross-container handoff during the drag AND on drop; apply it with the exported pure `moveSortableItem(containers, event)` (immutable, generic over item type). For a single list, use `<Sortable>`.

```tsx
const [groups, setGroups] = useState<Record<string, Field[]>>(initial);
<SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
  {Object.entries(groups).map(([gid, fields]) => (
    <SortableGroup.Container key={gid} id={gid} items={fields.map((f) => f.id)}>
      {fields.map((f) => (
        <Sortable.Item key={f.id} id={f.id}>
          <Sortable.Handle>⋮⋮</Sortable.Handle>
          {f.label}
        </Sortable.Item>
      ))}
    </SortableGroup.Container>
  ))}
</SortableGroup>;
```

<!-- props:start -->

## Props

### `SortableGroupProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `onMove` | `((event: SortableMoveEvent) => void)` | no | — | Fires on every cross-container handoff (during the drag) AND on the final drop. Apply it to your controlled per-container state — see `moveSortableItem`. |
| `children` | `ReactNode` | yes | — | The `<SortableGroup.Container>` lists. |

### `SortableGroupContainerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `Id` | yes | — | Stable container id (the `container` reported in `SortableMoveEvent`). |
| `items` | `Id[]` | yes | — | Ordered item ids in THIS container — the controlled source of truth. |
| `children` | `ReactNode` | yes | — | `<Sortable.Item>`s for the ids in `items`. |
| …native | | | | plus native `<ol>` attributes |

<!-- props:end -->

- Give each `Container` an `aria-label` (or `aria-labelledby`) — it names the `<ol>` for screen readers AND names the list in drag announcements ("…position 2 of 4 in In review").
- Container ids and item ids share dnd-kit's one id namespace — keep them all unique.
- Each `Container.items` must match its `<Sortable.Item>` child ids (it's the ordering source of truth).
- Esc-cancel doesn't revert (moves are applied to your state optimistically) — snapshot before drag to undo.

- The root renders no host DOM node, so it forwards no `ref`; attach refs to `<SortableGroup.Container>`, which forwards to its `<ol>`.
- `Container` renders an `<ol>` registered as a droppable, so an empty list still accepts cross-container drops.
- Mutating state inside `onMove` is wrong: return a NEW object (use `moveSortableItem`).
