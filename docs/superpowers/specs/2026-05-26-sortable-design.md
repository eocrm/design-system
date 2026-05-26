# Sortable component — design spec (v2, dnd-kit)

**Date:** 2026-05-26
**Component:** `<Sortable>` (compound: Root + Item + Handle)
**Motivation:** Reusable single-column drag-to-reorder primitive. Consumer use cases: image gallery reorder, todo priority, settings ordering, queue management. Also the foundation for a future `<Kanban>` compound (single-column-sortables + cross-list drop support).

**Supersedes:** the previous Sortable spec at `docs/superpowers/specs/2026-05-25-sortable-design.md` which proposed a hand-rolled PointerEvents implementation. The hand-rolled approach was tried (`feat/sortable` branch, 10 commits) but reverted in favor of using `@dnd-kit` — which is already a sanctioned library dependency, present in `packages/design-system/package.json` since commit `391a0dc` for `DataTable`'s column reorder. The hand-rolled implementation duplicated work that `@dnd-kit/sortable` already does and was strictly more code (~600 LOC vs ~150 LOC).

## Why dnd-kit

- **Already in deps.** `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` are installed and actively used by `DataTable` (see `HeaderCell.tsx`'s `useSortable` usage). No new dependency.
- **Built-in accessibility.** Keyboard sensor with Space-pickup flow, ARIA live announcements, focus management — all canonical WAI-ARIA Sortable pattern, hand-tested.
- **Built-in autoscroll** on scroll-ancestor edges.
- **Built-in drag preview with smooth follow** via CSS transforms.
- **Cross-list drag is one prop away**, which makes the future `<Kanban>` compound a trivial extension instead of another full implementation.
- **Hand-rolled is ~4× the code** with weaker a11y story (no Space-pickup, no screen-reader announcements during keyboard reorder).

## Library policy update

`packages/design-system/CLAUDE.md` currently says "Hand-roll over 3rd-party deps. Only `@floating-ui/react-dom` for positioning." This is stale — `@dnd-kit` is already a sanctioned exception used by DataTable. This PR includes a one-line update to that policy line to add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` to the allowlist, with a one-sentence rationale.

## API surface (unchanged from v1)

Compound component, children-as-items:

```tsx
<Sortable
  onReorder?: (event: SortableReorderEvent) => void
  className?: string
  ...HTMLAttributes<HTMLOListElement>      // renders <ol>
>
  {items.map((item) => (
    <Sortable.Item
      key={item.id}
      id={item.id}                         // string | number
      className?: string
      ...HTMLAttributes<HTMLLIElement>     // renders <li>
    >
      {/* arbitrary children — typically a Card */}
    </Sortable.Item>
  ))}
</Sortable>

<Sortable.Handle
  className?: string
  ...ButtonHTMLAttributes<HTMLButtonElement>  // renders <button type="button">
>
  {/* consumer's grip icon (decorative) */}
</Sortable.Handle>

export interface SortableReorderEvent {
  from: number;
  to: number;
  id: string | number;
}
```

Controlled-only: consumer holds the items array, applies the move on `onReorder`, re-renders with new order. Library does not ship `arrayMove` — consumer writes the 3-line utility themselves (or imports `arrayMove` from `@dnd-kit/sortable` which DOES ship it).

## Implementation (dnd-kit)

The component is a thin compound wrapper around `@dnd-kit/sortable`:

- **`Sortable` (Root)** renders an `<ol>` wrapped in `<DndContext sensors onDragEnd>` + `<SortableContext items strategy=verticalListSortingStrategy>`. Sensors: `PointerSensor` with `activationConstraint: { distance: 5 }` (the spec's 5px movement threshold) + `KeyboardSensor` with `sortableKeyboardCoordinates`. `onDragEnd` fires our `SortableReorderEvent` by extracting `from`/`to` indices from `active.id` and `over.id`.
- **`Sortable.Item`** calls `useSortable({ id })` and renders an `<li>` with the returned `setNodeRef`, `attributes`, `transform`, `transition`, and `isDragging` wired up. If the Item subtree contains a `Sortable.Handle`, the `listeners` from `useSortable` are routed to the Handle via a context. If no Handle is present, `listeners` are spread on the `<li>` itself (whole-item drag).
- **`Sortable.Handle`** reads the listeners from the Item's context and spreads them on a `<button type="button">` along with `attributes` (which includes `aria-roledescription="sortable"`, keyboard handlers, etc. — all from dnd-kit).

The hybrid drag-origin model (Handle present → drag only from Handle; no Handle → whole-item drag) is implemented by:

1. The Item providing a context object `{ listeners, attributes, hasHandle }`.
2. The Handle, when rendered, sets `hasHandle: true` via the same context (via a register/unregister effect).
3. The Item, on each render, decides where to spread `listeners`: on its own `<li>` if `hasHandle === false`, or nowhere (the Handle attaches them itself) if `hasHandle === true`.

## Keyboard model (canonical Space-pickup, swapped from v1 arrow-keys)

dnd-kit's `KeyboardSensor` ships the canonical WAI-ARIA Sortable pattern out of the box:

- Tab to an Item (or Handle) — focus indicator visible.
- Press **Space** — item is "picked up." Screen reader announces the action.
- **ArrowUp / ArrowDown** — move by one position.
- **Press Space again** to drop.
- **Press Escape** to cancel mid-pickup.

This replaces v1's "single-button + arrow keys" model. The Space-pickup flow is the established a11y standard (used by Trello, Notion, and every dnd-kit-based UI). dnd-kit also ships built-in `aria-live` announcements ("Item X picked up, position 2 of 4 ... Item X dropped at position 3 of 4 ...") — we don't need to render our own announcer.

**With Handle present**: focus lives on the Handle button; Space picks up, arrows move, Space drops. The Handle gets `aria-roledescription="sortable"` automatically from dnd-kit's `attributes`.

**Without Handle**: dnd-kit attaches keyboard listeners to the Item element. The Item needs to be focusable (tabIndex={0}). The library will set this automatically on Items without a Handle.

## Out of scope (deferred to follow-up)

- **Cross-list drag** — moving an item from one Sortable to another. The basis for `<Kanban>`. Trivially supported by dnd-kit (just share `DndContext` across multiple `SortableContext`s); we'll add the API in the next PR.
- **Horizontal orientation** — image-gallery rows. dnd-kit's `horizontalListSortingStrategy` supports this; we add a `layout='horizontal'` prop when a real consumer asks.
- **`canDrop` / drop validation** — dnd-kit supports `<DndContext modifiers>` for this; defer until consumer driver exists.
- **Custom drag overlay** — dnd-kit supports `<DragOverlay>` for cursor-following ghost rendering; the spec's "placeholder slot" emerges naturally from the default sortable strategy, no overlay needed for v1.

## Files

```
packages/design-system/src/components/Sortable/
  Sortable.tsx              ← Root + Item + Handle + Object.assign + dnd-kit wiring
  Sortable.module.scss      ← list / item / handle styles + reduced-motion
  Sortable.test.tsx         ← ~12 cases
  index.ts                  ← barrel
```

Expected total LOC: ~150 (down from ~600 hand-rolled).

## Public exports (`src/index.ts`)

```ts
export { Sortable } from './components/Sortable';
export type {
  SortableProps,
  SortableItemProps,
  SortableHandleProps,
  SortableReorderEvent,
} from './components/Sortable';
```

Alphabetical position: after `Slider`'s export block, before `Stack`. Manifest cluster: `Forms` (alongside Slider).

## Tests (~12 cases)

dnd-kit components are mostly untestable in jsdom (no real layout / sensors). The library's existing DataTable tests (which use dnd-kit) demonstrate the realistic test scope:

1. Renders `<ol>` with items as `<li>`.
2. `forwardRef` to root `<ol>`.
3. `className` merges on root and on Items.
4. Item `id` accepts string AND number.
5. Item renders the consumer's children inside the `<li>`.
6. Handle renders as `<button type="button">` with default `aria-label="Reorder item"`.
7. Handle's `aria-label` is overridable.
8. `Sortable.Item` forwards ref to `<li>`.
9. `Sortable.Handle` forwards ref to `<button>`.
10. With Handle: Item's `<li>` does NOT receive drag listeners (verify by checking the absence of specific attributes dnd-kit sets on drag-listener-bearing elements).
11. With no Handle: Item's `<li>` IS focusable (`tabIndex={0}`) and receives listeners.
12. Mounted inside React, no crash, no console warnings.

Drag-and-drop interaction (pointer events firing `onReorder`) is intentionally NOT tested — dnd-kit's own test suite covers the state machine; our wrapper just configures it. DataTable follows the same convention (see the comment in `DataTable.test.tsx`: "drag-and-drop coverage is via @dnd-kit's PointerSensor and not unit-tested").

## Playground demo

Same 5 examples as v1 (plain list, cards with Handle + DropdownMenu, image gallery, keyboard walkthrough, long list with autoscroll). The walkthrough text updates to describe the Space-pickup flow instead of arrow-keys-on-Handle.

## AGENTS.md

New section after `<Slider>`, follows canonical TL;DR pattern: intro, snippet, prop summary, anti-patterns. Describes the dnd-kit-based implementation in one sentence and the Space-pickup keyboard flow.

## Out-of-scope additions enabled by dnd-kit (logged for follow-up planning)

- `<Kanban>` (cross-list Sortable composition) — single shared `DndContext`, multiple `SortableContext`s.
- Horizontal `<Sortable layout="horizontal">` — swap to `horizontalListSortingStrategy`.
- `canDrop` callback — wire through `DndContext.onDragOver`.
- Custom drag overlay — `<DragOverlay>` slot.
- `arrayMove` helper re-export from `@dnd-kit/sortable` if consumers consistently want it.
