# Kanban live cross-column re-insertion — v2 design

**Date:** 2026-05-26
**Component:** `<Kanban>` (enhancement, not new component)
**Motivation:** PR #70 (commits `a4db3ca`) shipped Kanban v1 with `commit-on-drop` behavior — the dragged card follows the cursor but other cards don't reflow until release. v2 adds live cross-column re-insertion: cards in the target column shift to make room as the dragged card crosses in, matching Trello/Jira UX.

**Supersedes:** the "commit-on-drop only" v1 limitation documented in `2026-05-26-kanban-design.md`. A prior attempt (PR #70 commit `464ab75`) added live re-insertion via consumer-state mutation in `onDragOver`; this caused an infinite `measureRect → setState → re-render → measureRect` loop in dnd-kit. The loop was the consumer-state-mutation approach being wrong — the right approach is to keep the live-reorder state INTERNAL to Kanban (per dnd-kit's official `MultipleContainers` storybook).

## Why the v1 approach failed

`v1.5` (commit `464ab75`, reverted): updated **consumer state** mid-drag in `onDragOver`. Consumer's `setState` triggered a re-render of the parent component holding the children. dnd-kit's internal resize observer fired for every layout shift. The dragged card's DOM node remounted across columns. dnd-kit dispatched a setState in its `measureRect` layout-effect. That setState scheduled another render. Cascade.

`v2`: update **internal state in Kanban** mid-drag. Only Kanban's subtree re-renders. Consumer state is untouched until drop. dnd-kit's reconciliation works as designed (this is the pattern its official kanban storybook ships).

## Architecture

```
Consumer's JSX (unchanged)
       │
       ▼
  <Kanban>
       │
       │  useMemo over children → extract:
       │  • columnOrder: columnId[]
       │  • initialItems: Map<columnId, cardId[]>
       │  • cardElements: Map<cardId, ReactElement<KanbanCardProps>>
       │  • columnNonCardChildren: Map<columnId, ReactNode[]>
       │
       ▼
  liveItems: Map<columnId, cardId[]> | null
  (null when idle; populated from initialItems on drag start)
       │
       ▼
  effectiveItems = liveItems ?? initialItems
       │
       ▼
  Render each column from effectiveItems[columnId], looking up
  each cardId in cardElements to get its React element. Non-card
  children (header, etc.) render BEFORE the cards in the order
  the consumer wrote them.
```

### Drag lifecycle

```
idle:           liveItems = null, render from initialItems (= children's natural order)

onDragStart:    setLiveItems(new Map(initialItems))  ← snapshot

onDragOver:     if (active card's container ≠ over target's container):
                  setLiveItems(prev => move active to new container at over's index)
                else: no-op (within-column reorder happens automatically via dnd-kit's
                                 verticalListSortingStrategy + useSortable transforms)

onDragEnd:      compute (from, to, cardId) by diffing liveItems against initialItems
                fire onMove?.(...)  once
                setLiveItems(null)  ← reset

onDragCancel:   setLiveItems(null)  ← discard
```

### Reconciling consumer state changes

If the consumer mutates state mid-drag (rare but possible), `children` changes → `useMemo` recomputes `initialItems`. The current `liveItems` may reference cardIds that no longer exist or miss new ones. v2 detects this via:

```ts
useEffect(() => {
  // When initialItems changes (consumer state mutation), reset liveItems.
  // If a drag is in flight, this cancels the live overlay; dnd-kit's
  // onDragEnd will still fire and fire onMove with whatever final
  // state it had — consumer should expect this.
  setLiveItems(null);
}, [initialItemsKey]); // serialized signature of initialItems
```

`initialItemsKey` is a stable string serialization of `initialItems` (e.g. `JSON.stringify([...initialItems])`). It changes only when the underlying card→column assignment changes.

This means: if the consumer adds/removes a card during a drag, the live overlay resets to the new "truth" from children, and the drag continues from there. Conservative.

## Public API impact

**Zero.** Same `<Kanban onMove={...}><Kanban.Column id=...><Kanban.Card id=...>...</Kanban.Card></Kanban.Column></Kanban>` shape. `onMove` still fires exactly once per drag (on drop), with the same `{from, to, cardId}` payload.

The JSDoc / AGENTS.md "anti-patterns" bullet that documented the v1 commit-on-drop limitation gets removed. Replaced with a note that cards reflow live as the dragged card crosses columns.

## Render rule: cards must be contiguous within a column's children

To re-arrange cards via internal state, Kanban needs to know WHERE in the column's child list to insert the reordered cards. The implementation assumes: **a `<Kanban.Column>`'s `<Kanban.Card>` children are a contiguous block** (typically after a header / before a footer).

Concretely, when extracting column children at memo time:

- Split each column's children into `[beforeCards, ...cards, afterCards]`.
- `beforeCards` = all non-card children before the first card.
- `cards` = the contiguous block of `KanbanCard` children.
- `afterCards` = all non-card children after the last card.
- Render: `[...beforeCards, ...reorderedCards, ...afterCards]`.

If a consumer interleaves non-cards within the cards (e.g. `<Card><Header><Card>`), the reorder still works but the non-card lands in a weird position. Document as anti-pattern: keep header(s) before cards, footer(s) after.

## Implementation outline (Kanban.tsx)

```tsx
const KanbanRoot = forwardRef<HTMLDivElement, KanbanProps>(function KanbanRoot(
  { onMove, className, children, ...rest },
  ref,
) {
  // Extract from children
  const { columnOrder, initialItems, cardElements, columnNonCardChildren } = useMemo(() => {
    // walk children, build all four
  }, [children]);

  const initialItemsKey = useMemo(
    () => JSON.stringify([...initialItems].map(([col, cards]) => [col, [...cards]])),
    [initialItems],
  );

  const [liveItems, setLiveItems] = useState<Map<string | number, (string | number)[]> | null>(
    null,
  );

  // Reset live items when consumer state mutates
  useEffect(() => {
    setLiveItems(null);
  }, [initialItemsKey]);

  const effectiveItems = liveItems ?? initialItems;

  const findContainer = (id: string | number): string | number | null => {
    if (effectiveItems.has(id)) return id; // dropped on column itself
    for (const [colId, cards] of effectiveItems) {
      if (cards.includes(id)) return colId;
    }
    return null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setLiveItems(new Map([...initialItems].map(([col, cards]) => [col, [...cards]])));
    },
    [initialItems],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !liveItems) return;
      const activeId = active.id as string | number;
      const overId = over.id as string | number;

      const activeContainer = findContainer(activeId);
      const overContainer = findContainer(overId);
      if (activeContainer == null || overContainer == null) return;
      if (activeContainer === overContainer) return;

      setLiveItems((prev) => {
        if (!prev) return prev;
        const activeItems = prev.get(activeContainer) ?? [];
        const overItems = prev.get(overContainer) ?? [];
        const activeIdx = activeItems.indexOf(activeId);
        if (activeIdx < 0) return prev;

        // Insertion index: where in overContainer to place the active card.
        // If over.id is a card in overContainer → insert at its position.
        // If over.id is the column itself (empty drop) → append.
        let insertAt: number;
        if (overItems.includes(overId)) {
          insertAt = overItems.indexOf(overId);
        } else {
          insertAt = overItems.length;
        }

        const next = new Map(prev);
        next.set(
          activeContainer,
          activeItems.filter((id) => id !== activeId),
        );
        const newOverItems = [...overItems];
        newOverItems.splice(insertAt, 0, activeId);
        next.set(overContainer, newOverItems);
        return next;
      });
    },
    [liveItems, findContainer],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = active.id as string | number;

      // Compute the from-position from initialItems and to-position from liveItems
      const final = liveItems ?? initialItems;
      let toColumn: string | number | null = null;
      let toIndex = -1;
      for (const [colId, cards] of final) {
        const idx = cards.indexOf(activeId);
        if (idx >= 0) {
          toColumn = colId;
          toIndex = idx;
          break;
        }
      }

      let fromColumn: string | number | null = null;
      let fromIndex = -1;
      for (const [colId, cards] of initialItems) {
        const idx = cards.indexOf(activeId);
        if (idx >= 0) {
          fromColumn = colId;
          fromIndex = idx;
          break;
        }
      }

      setLiveItems(null);

      if (fromColumn == null || toColumn == null) return;
      // Within-column reorder finalization: use dnd-kit's arrayMove on the
      // initial items if active and over are in the same column
      if (over && fromColumn === toColumn) {
        const overId = over.id as string | number;
        const containerItems = initialItems.get(fromColumn) ?? [];
        const overIdx = containerItems.indexOf(overId);
        if (overIdx >= 0 && overIdx !== fromIndex) {
          // Final position is the overIdx (or its neighbor)
          toIndex = overIdx;
        } else {
          // No move
          return;
        }
      }

      if (fromColumn === toColumn && fromIndex === toIndex) return;

      onMove?.({
        from: { columnId: fromColumn, index: fromIndex },
        to: { columnId: toColumn, index: toIndex },
        cardId: activeId,
      });
    },
    [liveItems, initialItems, onMove],
  );

  const handleDragCancel = useCallback(() => {
    setLiveItems(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={ref}
        role="region"
        aria-label="Kanban board"
        className={clsx(styles.board, className)}
        {...rest}
      >
        {columnOrder.map((colId) => {
          const columnElement = Children.toArray(children).find(
            (c): c is ReactElement<KanbanColumnProps> =>
              isValidElement(c) &&
              c.type === KanbanColumn &&
              (c.props as KanbanColumnProps).id === colId,
          );
          if (!columnElement) return null;
          const cardIds = effectiveItems.get(colId) ?? [];
          const cards = cardIds
            .map((id) => cardElements.get(id))
            .filter((c): c is ReactElement => c != null);
          const { before, after } = columnNonCardChildren.get(colId) ?? { before: [], after: [] };
          return cloneElement(columnElement, {}, ...before, ...cards, ...after);
        })}
      </div>
    </DndContext>
  );
});
```

## Tests

Same shape as v1 — drag interaction is not unit-tested (dnd-kit covers it). The v1 test file's 10 cases still apply (they test structure, ref forwarding, classes, ids, etc.). Add 2 new cases:

- `onMove` fires once at end of drag (not multiple times during).
- Re-arrange children mid-drag doesn't crash (state reset on initialItems change).

## Risks

- **Cards-must-be-contiguous assumption** is new. If a real consumer interleaves, they get a layout glitch. Documented anti-pattern.
- **Reconcile on consumer state mutation** is conservative — cancels the live overlay. If a consumer mutates state on every cursor move (unlikely), live re-insertion gets jittery.
- **Performance**: every `liveItems` setState during drag re-renders the entire Kanban subtree. For 100+ cards this might lag. Same constraint as v1.

## Out of scope (still deferred to v3)

- Cross-column keyboard reorder (dnd-kit's stock `sortableKeyboardCoordinates` is per-`SortableContext`).
- Column reordering.
- Custom `canDrop` validation.
- DragOverlay (portal-rendered cursor-following ghost).
