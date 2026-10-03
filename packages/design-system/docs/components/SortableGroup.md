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

- Give each `Container` an `aria-label` (or `aria-labelledby`) — it names the `<ol>` for screen readers AND names the list in drag announcements ("…position 2 of 4 in In review").
- Container ids and item ids share dnd-kit's one id namespace — keep them all unique.
- Each `Container.items` must match its `<Sortable.Item>` child ids (it's the ordering source of truth).
- Esc-cancel doesn't revert (moves are applied to your state optimistically) — snapshot before drag to undo.
