# `Sortable` — `restrictToContainer` prop — Design

**Date:** 2026-06-17
**Status:** Approved (design)
**Package:** `@eocrm/design-system`

## Problem

`Sortable` lets the dragged item (and its `DragOverlay`, shipped in v0.1.43) be dragged
anywhere on the page. Consumers want the drag confined to the list's own bounds so the
dragged row can't float off over unrelated UI.

## Solution

Add **`restrictToContainer?: boolean`** to `SortableProps`, **default `true`**. When on,
a dnd-kit **modifier** clamps the drag transform so the dragged item / overlay stays within
the `<ol>` list element's bounding box. `restrictToContainer={false}` restores today's
free-drag.

No new dependency: `@dnd-kit/modifiers` is NOT installed and the dependency policy lists
only `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities`. A modifier is a pure
function `(args) => Transform`; we inline a ~15-line clamp mirroring dnd-kit's
`restrictToParentElement` / `restrictToBoundingRect`, reading the live `<ol>` rect via an
internal ref (deterministic — restricts to the actual list element, not relying on dnd-kit's
`containerNodeRect` detection through the overlay portal).

## API

```tsx
<Sortable onReorder={…}>{…}</Sortable>                    // default: contained
<Sortable restrictToContainer={false} onReorder={…}>{…}</Sortable>  // free drag
```

`restrictToContainer?: boolean` — JSDoc: "When `true` (default), the dragged item is
clamped to the list's bounding box and can't be dragged outside it. Set `false` for
free-drag (the item can be dragged anywhere). For a vertical list this constrains the drag
vertically to the list's extent."

## Implementation (`Sortable.tsx`)

- Pure helper (unit-testable):
  ```ts
  function restrictTransformToRect(transform, nodeRect, boundingRect): Transform {
    const value = { ...transform };
    if (nodeRect.top + transform.y <= boundingRect.top) {
      value.y = boundingRect.top - nodeRect.top;
    } else if (nodeRect.bottom + transform.y >= boundingRect.top + boundingRect.height) {
      value.y = boundingRect.top + boundingRect.height - nodeRect.bottom;
    }
    if (nodeRect.left + transform.x <= boundingRect.left) {
      value.x = boundingRect.left - nodeRect.left;
    } else if (nodeRect.right + transform.x >= boundingRect.left + boundingRect.width) {
      value.x = boundingRect.left + boundingRect.width - nodeRect.right;
    }
    return value;
  }
  ```
- In `SortableRoot`: internal `olRef` merged with the forwarded `ref` via `mergeRefs(olRef, ref)`.
  A memoized `Modifier` closure clamps `draggingNodeRect` to `olRef.current.getBoundingClientRect()`.
  `const modifiers = restrictToContainer ? [restrictModifier] : undefined;`
- Pass `modifiers={modifiers}` to BOTH `<DndContext>` and `<DragOverlay>` (the overlay is the
  visible drag, so it must carry the modifier; DndContext for the underlying transform too).

## Deliverables (Core invariant — changes a component)

- The prop + modifier in `Sortable.tsx`; JSDoc on the prop + a `@remarks` note.
- Tests: unit-test the pure `restrictTransformToRect` clamp math (over-top / over-bottom →
  clamped; within bounds → unchanged); structural test that `restrictToContainer={false}`
  and the default both render without crashing. (jsdom can't measure real drag — the drag
  constraint itself is verified in-browser.)
- `SortableDemo`: an example contrasting `restrictToContainer` on (default) vs `false`.
- `AGENTS.md`: a `<Sortable>` bullet documenting the prop + default.

## Acceptance

- Gates green; `npm pack --dry-run` clean.
- **Verified in-browser**: with the default (on), the dragged overlay cannot leave the list's
  vertical bounds; with `restrictToContainer={false}`, it can be dragged outside. Keyboard
  reorder + existing behavior unchanged.
- Ships as a library patch.

## Out of scope

- Axis-only locking (`restrictToVerticalAxis`) — separate concern; not requested.
- Restricting to a scrollable ancestor rather than the list element.
