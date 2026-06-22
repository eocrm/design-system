# Multi-container `<SortableGroup>` — Design

**Status:** design approved (user said "yes"), ready for plan
**Date:** 2026-06-22
**Component:** `@eocrm/design-system` → `src/components/SortableGroup/`
**Resolves:** GitHub issue eocrm/design-system#191
**Depends on:** the existing single-container `<Sortable>` (`Sortable.Item` / `Sortable.Handle` are reused unchanged) + `@dnd-kit/core` + `@dnd-kit/sortable` (already DS deps).

## Goal

A **multi-container sortable** — drag items _between_ sortable lists (cross-container), in addition to reordering within a list. Custom-field GROUPS render one section per group; users drag a field from one group's section into another. The existing single-container `<Sortable>` stays the simple case, untouched.

## Resolved design decisions (from brainstorm)

1. **Live handoff** — `onMove` fires DURING the drag (dnd-kit `onDragOver`) the moment the item crosses into another container, AND again on drop for the final index. The consumer applies each move to their controlled per-container state → the item visibly slides into the target list. (Not commit-on-drop-only.)
2. **`<SortableGroup>` + explicit per-container `items`** — a new compound, NOT a `groupId` bolted onto `<Sortable>`. Each container takes an explicit ordered `items` id[] (the controlled source of truth). `Sortable.Item` / `Sortable.Handle` are reused inside.

## Architecture

```
src/components/SortableGroup/
  SortableGroup.tsx          ← (new) <SortableGroup> root + <SortableGroup.Container> + context
  moveSortableItem.ts        ← (new) pure immutable cross/within-container move helper
  moveSortableItem.test.ts   ← (new)
  SortableGroup.test.tsx     ← (new)
  SortableGroup.module.scss  ← (new) — minimal; reuses Sortable's list/item tokens
  index.ts                   ← (new)
```

- **`<SortableGroup onMove>`** owns ONE shared `DndContext` (pointer + keyboard sensors, **`closestCorners`** collision — dnd-kit's recommended strategy for multi-list sorting) and ONE shared `DragOverlay`. It provides a `SortableGroupContext` (active id, a container registry, the move dispatcher). No `restrictToContainer` clamp (the point is dragging out of a container).
- **`<SortableGroup.Container id items={ids}>`** renders an `<ol>` wrapped in its own `<SortableContext items={ids} strategy={verticalListSortingStrategy}>`, AND registers as a **droppable** (`useDroppable({ id })`) so an _empty_ container still accepts drops and is a valid `over` target. It builds an `id → content` map from its `<Sortable.Item>` children (the existing `Children.forEach` / `child.type === SortableItem` pattern) and **registers `{ id, items, itemContent }` into the group's container registry** (a ref-based `Map` + an overlay-version bump) on each render.
- **`<Sortable.Item>` / `<Sortable.Handle>`** — reused UNCHANGED. They call `useSortable({ id })`, which works inside any `SortableContext`. The group's shared `DragOverlay` renders the active item's content by reading the registry (`registry[containerOfActive].itemContent.get(activeId)`), so `Sortable.Item` needs no group awareness.

This keeps `Sortable.Item`/`Handle` untouched: the **Container** does all the registration (it has both the `items` prop and the children).

## Public API

```ts
/** A move within or across containers — fired by SortableGroup.onMove. */
export interface SortableMoveEvent {
  /** The dragged item's id. */
  id: string | number;
  /** Where it came from. */
  from: { container: string | number; index: number };
  /** Where it goes. `from.container === to.container` is a within-list reorder. */
  to: { container: string | number; index: number };
}

export interface SortableGroupProps {
  /**
   * Fires on every cross-container handoff (during the drag) AND on the final
   * drop. Apply it to your controlled per-container state — see `moveSortableItem`.
   */
  onMove?: (event: SortableMoveEvent) => void;
  /** The `<SortableGroup.Container>` lists. */
  children: ReactNode;
}

export interface SortableGroupContainerProps extends Omit<HTMLAttributes<HTMLOListElement>, 'id'> {
  /** Stable container id (the `container` reported in `SortableMoveEvent`). */
  id: string | number;
  /** Ordered item ids in THIS container — the controlled source of truth. */
  items: (string | number)[];
  /** `<Sortable.Item>`s for the ids in `items`. */
  children: ReactNode;
}

export const SortableGroup: typeof SortableGroupRoot & {
  Container: typeof SortableGroupContainer;
};

/**
 * Immutable, index-based move across/within containers. Generic over the item
 * type, so it works whether your arrays hold ids or whole objects.
 */
export function moveSortableItem<T>(
  containers: Record<string, T[]>,
  event: SortableMoveEvent,
): Record<string, T[]>;
```

Consumer usage:

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

`moveSortableItem` splices by `from.index` / `to.index`, so it moves whole `Field` objects even though the `event` only carries ids + indices (the indices come from the container `items` id arrays the component already has).

## Container registry (overlay + container resolution)

The group needs, at drag time: (a) which container holds the active id, (b) each container's `items` order (for index math), (c) the active id's content node (for the overlay).

- `SortableGroupContext` exposes `register(containerId, { items, itemContent })` / `unregister(containerId)` writing into a `useRef<Map<containerId, { items, itemContent }>>`.
- Each `<SortableGroup.Container>` calls `register` in a `useEffect` (and `unregister` on unmount), keyed on `id` + `items` + children, and the group bumps an `overlayVersion` state so the `DragOverlay` re-reads the registry.
- `containerOf(id)` = the registry entry whose `items` includes `id`. `indexIn(container, id)` = `items.indexOf(id)`.
- The shared `DragOverlay` renders `registry.get(containerOf(activeId))?.itemContent.get(activeId)` inside the same overlay chrome the single `<Sortable>` uses (`styles.overlayItem`, the inert `OVERLAY_ITEM_CONTEXT`).

(This mirrors the established ref-registry-plus-version-bump pattern used elsewhere in the codebase, e.g. `useMention`. The implementer must guard against render loops: register in an effect, not during render.)

## Data flow (live handoff)

- **`onDragStart`** → `setActiveId(active.id)`.
- **`onDragOver`** → resolve `activeContainer = containerOf(active.id)` and `overContainer` (the `over.id` is either an item id → `containerOf(over.id)`, or a container droppable id → itself). If `overContainer && overContainer !== activeContainer`:
  - compute the insertion index in the target: if `over` is an item, `items.indexOf(over.id)` adjusted by pointer side (below the item's vertical midpoint → +1); if `over` is the empty container droppable, append (`items.length`).
  - fire `onMove({ id: active.id, from: { container: activeContainer, index: indexIn(activeContainer, id) }, to: { container: overContainer, index: insertIndex } })`.
  - The consumer applies it → the item re-renders into the target container → live preview. The registry updates; the next `onDragOver` sees the new container.
- **`onDragEnd`** → if `active.id !== over.id` and both are in the SAME container now, fire `onMove` for the final within-container reorder (`from`/`to` indices via `indexIn`). Then `setActiveId(null)`.
- **`onDragCancel`** → `setActiveId(null)`. **Documented limitation:** because moves are applied optimistically to the consumer's controlled state, Esc-cancel leaves the item at its last hovered position (the component does NOT snapshot/revert the consumer's state). Consumers needing revert-on-cancel snapshot before the drag. (`@remarks` + AGENTS note.)

## `moveSortableItem` (pure)

```ts
export function moveSortableItem<T>(containers, { id, from, to }): Record<string, T[]> {
  const next = { ...containers };
  const fromArr = next[from.container]?.slice() ?? [];
  const [moved] = fromArr.splice(from.index, 1);
  next[from.container] = fromArr;
  if (moved === undefined) return containers; // out-of-range guard → no-op
  const toArr = from.container === to.container ? fromArr : (next[to.container]?.slice() ?? []);
  toArr.splice(to.index, 0, moved);
  next[to.container] = toArr;
  return next;
}
```

Pure + immutable; handles within-container (same array spliced twice), cross-container, and empty-target. Out-of-range `from.index` → returns the input unchanged.

## Keyboard a11y

`KeyboardSensor` + `sortableKeyboardCoordinates`; `closestCorners` lets arrow-key moves cross into an adjacent container. Within-container keyboard reorder is the primary guarantee (same as `<Sortable>`); cross-container keyboard is best-effort and exercised in tests. The reused `Sortable.Handle` is the `<button>` activator, so keyboard reorder is reachable.

## Testing

- **`moveSortableItem.test.ts` (pure):** within-container reorder; cross-container move (removed from source, inserted at target index); empty target; first/last index; out-of-range no-op; immutability (inputs untouched, new refs for the two affected arrays only).
- **`SortableGroup.test.tsx`:** renders multiple containers with `Sortable.Item`s; a within-container drag fires `onMove` with `from.container === to.container` and the right indices; a cross-container `over` fires `onMove` with the target container + index; the shared `DragOverlay` shows the active item's content regardless of which container it's in; keyboard reorder fires `onMove`. (jsdom has no pointer geometry, so the cross-container handler logic is unit-tested via synthetic dnd-kit events + the pure helper.)
- **Browser (Playwright, manual):** two+ group sections; drag a field within a group (reorders); drag a field across groups (it slides into the target list live; on drop the consumer state reflects the move); the overlay follows the cursor; keyboard reorder.

## Packaging (CLAUDE.md core invariant — new component)

- **Component + tests** beside it (above).
- **Exports** from `src/index.ts`: `SortableGroup`, `SortableMoveEvent`, `SortableGroupProps`, `SortableGroupContainerProps`, `moveSortableItem` (and re-export from `SortableGroup/index.ts`).
- **Demo page** `packages/playground/src/pages/components/SortableGroupDemo.tsx` (two/three group sections of fields; drag within + across; an output showing the per-group order) + wiring: `App.tsx` route `/components/sortable-group`, `navItems.ts` (Forms group, near Sortable), `ComponentsIndex.tsx` overview card, `registry.ts` `ComponentName` union (`'SortableGroup'`).
- **Manifest CLUSTERS:** `SortableGroup: 'Forms'` in BOTH `src/_meta/manifest.ts` AND `scripts/generate-manifest.mjs`; then `npm run build:manifest` (entry will be a `composition` — it imports `Sortable.Item`/`Handle`). Commit the regenerated JSON.
- **JSDoc** (Rule 7): full description + `@example` (the groups usage) + `@remarks` anti-patterns (don't mutate state in `onMove` — return a new object via `moveSortableItem`; don't expect Esc to revert; don't nest a `<SortableGroup>` inside a `<Sortable>`; each `Container.items` MUST match its `Sortable.Item` children ids).
- **AGENTS.md** TL;DR in the Sortable area: `<SortableGroup>` + `Container` + `onMove` + `moveSortableItem`, the live-handoff + cancel note, the `align`/empty-container behavior.
- **i18n:** none (no new user-facing strings; the reused `Sortable.Handle` already has its label).

## Risks / decisions (resolved)

- **Registry render-loop risk:** register in a `useEffect` (not during render), bump an overlay-version state for the overlay only. The implementer must verify no infinite loop (adversarial review + browser pass).
- **Cancel doesn't revert:** accepted + documented (controlled state is the consumer's; the component can't revert it).
- **Cross-container keyboard:** best-effort via `closestCorners` + `sortableKeyboardCoordinates`; within-container guaranteed.
- **`Sortable.Item`/`Handle` unchanged:** the Container registers content, so no churn to the shipped single-container component.
- **Demo is its own page** (`SortableGroupDemo`) + nav/route/overview, per the Core invariant for a new exported component.
