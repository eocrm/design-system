# SortableGroup (multi-container Sortable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<SortableGroup>` multi-container sortable (drag items BETWEEN lists, live handoff) to `@eocrm/design-system`, resolving issue eocrm/design-system#191. The single-container `<Sortable>` is reused (`Sortable.Item` / `Sortable.Handle`) and otherwise untouched.

**Architecture:** `<SortableGroup onMove>` owns ONE shared `DndContext` (pointer + keyboard sensors, `closestCorners`) + ONE shared `DragOverlay`. `<SortableGroup.Container id items>` is each list (own `SortableContext` + a `useDroppable` so empty lists accept drops) and registers its `{items, id→content}` into a group registry so the shared overlay can render the active item from any container. `onMove({id, from:{container,index}, to:{container,index}})` fires during the drag (cross-container handoff) and on drop; the consumer applies it via the pure `moveSortableItem` helper.

**Tech Stack:** TypeScript, React, `@dnd-kit/core` + `@dnd-kit/sortable` (existing DS deps), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-22-sortable-group-design.md`

---

## File map

Library (`packages/design-system/`):

- `src/components/SortableGroup/moveSortableItem.ts` (new) — pure move helper.
- `src/components/SortableGroup/moveSortableItem.test.ts` (new).
- `src/components/SortableGroup/SortableGroup.tsx` (new) — root + Container + context + registry + handlers + overlay.
- `src/components/SortableGroup/SortableGroup.module.scss` (new) — list/overlay styles (reuses `--sortable-*` tokens).
- `src/components/SortableGroup/SortableGroup.test.tsx` (new).
- `src/components/SortableGroup/index.ts` (new).
- `src/index.ts` (modify) — exports.
- `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (modify) — `SortableGroup: 'Forms'`; then `npm run build:manifest`.
- `AGENTS.md` (modify) — TL;DR.

Playground (`packages/playground/`):

- `src/pages/components/SortableGroupDemo.tsx` (new).
- `src/App.tsx` (modify) — route.
- `src/layout/AppShell/navItems.ts` (modify) — Forms nav item.
- `src/pages/components/ComponentsIndex.tsx` (modify) — overview card.
- `src/pages/mockups/registry.ts` (modify) — `ComponentName` union `'SortableGroup'`.

---

## Task 1: `moveSortableItem` pure helper

**Files:**

- Create: `packages/design-system/src/components/SortableGroup/moveSortableItem.ts`
- Test: `packages/design-system/src/components/SortableGroup/moveSortableItem.test.ts`

- [ ] **Step 1: Write the failing test (`moveSortableItem.test.ts`)**

```ts
import { moveSortableItem } from './moveSortableItem';

const ev = (id: string, fromC: string, fromI: number, toC: string, toI: number) => ({
  id,
  from: { container: fromC, index: fromI },
  to: { container: toC, index: toI },
});

describe('moveSortableItem', () => {
  it('reorders within one container (matches arrayMove semantics)', () => {
    const c = { a: ['x', 'y', 'z'] };
    expect(moveSortableItem(c, ev('x', 'a', 0, 'a', 2))).toEqual({ a: ['y', 'z', 'x'] });
    expect(moveSortableItem(c, ev('z', 'a', 2, 'a', 0))).toEqual({ a: ['z', 'x', 'y'] });
  });

  it('moves an item across containers at the target index', () => {
    const c = { a: ['x', 'y'], b: ['p', 'q'] };
    expect(moveSortableItem(c, ev('y', 'a', 1, 'b', 1))).toEqual({ a: ['x'], b: ['p', 'y', 'q'] });
  });

  it('moves into an empty container', () => {
    const c = { a: ['x'], b: [] as string[] };
    expect(moveSortableItem(c, ev('x', 'a', 0, 'b', 0))).toEqual({ a: [], b: ['x'] });
  });

  it('moves whole objects (generic over item type), by index', () => {
    const c = { a: [{ id: 'x' }, { id: 'y' }], b: [{ id: 'p' }] };
    const next = moveSortableItem(c, ev('y', 'a', 1, 'b', 0));
    expect(next.a).toEqual([{ id: 'x' }]);
    expect(next.b).toEqual([{ id: 'y' }, { id: 'p' }]);
  });

  it('is a no-op for an out-of-range source index', () => {
    const c = { a: ['x'], b: [] as string[] };
    expect(moveSortableItem(c, ev('x', 'a', 5, 'b', 0))).toBe(c);
  });

  it('does not mutate the input (new refs only for affected arrays)', () => {
    const a = ['x', 'y'];
    const b = ['p'];
    const c = { a, b };
    const next = moveSortableItem(c, ev('y', 'a', 1, 'b', 1));
    expect(a).toEqual(['x', 'y']); // original untouched
    expect(b).toEqual(['p']);
    expect(next.a).not.toBe(a);
    expect(next.b).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/SortableGroup/moveSortableItem.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `moveSortableItem.ts`**

```ts
// moveSortableItem.ts — pure, immutable cross/within-container move for the
// controlled state behind <SortableGroup>. Operates by index, so it's generic
// over the item type (id arrays or whole objects). Owns the SortableMoveEvent
// type (SortableGroup.tsx imports + re-exports it) so this module is self-contained.

/** A move within or across containers — fired by `SortableGroup.onMove`. */
export interface SortableMoveEvent {
  /** The dragged item's id. */
  id: string | number;
  /** Where it came from. */
  from: { container: string | number; index: number };
  /** Where it goes. `from.container === to.container` is a within-list reorder. */
  to: { container: string | number; index: number };
}

/**
 * Apply a `SortableMoveEvent` to a `{ containerId: items[] }` map, immutably.
 * Splices the item out of `from` and into `to` by index — supports within-
 * container reorder, cross-container moves, and an empty target. Returns the
 * input unchanged when `from.index` is out of range.
 *
 * @example
 * <SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
 */
export function moveSortableItem<T>(
  containers: Record<string, T[]>,
  { from, to }: SortableMoveEvent,
): Record<string, T[]> {
  const fromKey = String(from.container);
  const toKey = String(to.container);
  const fromArr = (containers[fromKey] ?? []).slice();
  const [moved] = fromArr.splice(from.index, 1);
  if (moved === undefined) return containers; // out-of-range → no-op
  const next = { ...containers, [fromKey]: fromArr };
  const toArr = fromKey === toKey ? fromArr : (containers[toKey] ?? []).slice();
  toArr.splice(to.index, 0, moved);
  next[toKey] = toArr;
  return next;
}
```

(`SortableMoveEvent` is defined HERE, in `moveSortableItem.ts`, so Task 1 is fully self-contained. Task 2's `SortableGroup.tsx` imports it from `./moveSortableItem` and re-exports it for the public API.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/SortableGroup/moveSortableItem.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/SortableGroup/moveSortableItem.ts \
        packages/design-system/src/components/SortableGroup/moveSortableItem.test.ts
git commit -m "feat(SortableGroup): moveSortableItem pure cross/within-container move helper"
```

---

## Task 2: `SortableGroup` component

**Files:**

- Create: `packages/design-system/src/components/SortableGroup/SortableGroup.tsx`
- Create: `packages/design-system/src/components/SortableGroup/SortableGroup.module.scss`
- Create: `packages/design-system/src/components/SortableGroup/index.ts`
- Test: `packages/design-system/src/components/SortableGroup/SortableGroup.test.tsx`

- [ ] **Step 1: Implement `SortableGroup.module.scss`** (reuses `--sortable-*` tokens, which are global `:root`)

```scss
@use '../Sortable/Sortable.tokens';

.list {
  // UA reset for <ol> default margin/padding.
  // stylelint-disable-next-line property-disallowed-list -- UA reset for <ol> default margin
  margin: 0;
  // stylelint-disable-next-line property-disallowed-list -- UA reset for <ol> default padding
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sortable-list-gap);
}

// Overlay chrome — mirrors <Sortable>'s lifted-item visual (#165).
.item {
  position: relative;
}

.overlayItem {
  box-shadow: var(--sortable-item-shadow-dragging);
  cursor: grabbing;
}
```

- [ ] **Step 2: Implement `SortableGroup.tsx`**

```tsx
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  SortableItem,
  SortableItemContext,
  type SortableItemContextValue,
  type SortableItemProps,
} from '../Sortable';
import { type SortableMoveEvent } from './moveSortableItem';
import styles from './SortableGroup.module.scss';

type Id = string | number;

// SortableMoveEvent is defined in ./moveSortableItem (Task 1) and re-exported by
// index.ts — keeps the helper module self-contained.

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
  id: Id;
  /** Ordered item ids in THIS container — the controlled source of truth. */
  items: Id[];
  /** `<Sortable.Item>`s for the ids in `items`. */
  children: ReactNode;
}

interface ContainerRecord {
  items: Id[];
  itemContent: Map<Id, ReactNode>;
}
interface GroupContextValue {
  register: (containerId: Id, rec: ContainerRecord) => void;
  unregister: (containerId: Id) => void;
}
const GroupContext = createContext<GroupContextValue | null>(null);

// Inert context for the overlay clone (mirrors Sortable's internal
// OVERLAY_ITEM_CONTEXT) — the overlay is a static visual; a Handle inside it
// must render without wiring real drag listeners.
const OVERLAY_ITEM_CONTEXT: SortableItemContextValue = {
  listeners: undefined,
  attributes: {} as SortableItemContextValue['attributes'],
  setActivatorNodeRef: () => {},
};

/** Build an id → content map from a container's `<Sortable.Item>` children. */
function itemContentMap(children: ReactNode): Map<Id, ReactNode> {
  const map = new Map<Id, ReactNode>();
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === SortableItem) {
      const props = child.props as SortableItemProps;
      map.set(props.id, props.children);
    }
  });
  return map;
}

/**
 * Multi-container drag-to-sort — drag items WITHIN a list and BETWEEN lists.
 * Compound API: `<SortableGroup onMove>` + `<SortableGroup.Container id items>`,
 * with the same `<Sortable.Item>` / `<Sortable.Handle>` inside. Built on
 * `@dnd-kit`. For a single list, use `<Sortable>`.
 *
 * Controlled + live: `onMove` fires the moment the item crosses into another
 * container (and again on drop). Apply it to your per-container state with the
 * exported `moveSortableItem` helper and the item slides into the target list.
 *
 * @example
 * const [groups, setGroups] = useState<Record<string, Field[]>>(initial);
 * <SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
 *   {Object.entries(groups).map(([gid, fields]) => (
 *     <SortableGroup.Container key={gid} id={gid} items={fields.map((f) => f.id)}>
 *       {fields.map((f) => (
 *         <Sortable.Item key={f.id} id={f.id}>
 *           <Sortable.Handle>⋮⋮</Sortable.Handle>
 *           {f.label}
 *         </Sortable.Item>
 *       ))}
 *     </SortableGroup.Container>
 *   ))}
 * </SortableGroup>
 *
 * @remarks When NOT to use
 * - A single reorderable list → `<Sortable>` (no cross-container machinery).
 *
 * @remarks Anti-patterns
 * - ❌ Mutating state inside `onMove` — return a NEW object (use `moveSortableItem`).
 * - ❌ Reusing an id as both a container id AND an item id — dnd-kit shares one id
 *   namespace, so container ids and item ids must all be unique.
 * - ❌ A `Container`'s `items` not matching its `<Sortable.Item>` child ids — the
 *   `items` array is the source of truth for ordering + index reporting.
 * - ❌ Expecting Esc to revert — moves are applied to YOUR state optimistically;
 *   cancel leaves the item at its last hovered spot. Snapshot before drag to undo.
 */
const SortableGroupRoot = function SortableGroup({ onMove, children }: SortableGroupProps) {
  const [activeId, setActiveId] = useState<Id | null>(null);
  const registryRef = useRef<Map<Id, ContainerRecord>>(new Map());
  const [overlayVersion, setOverlayVersion] = useState(0);

  const register = useCallback((containerId: Id, rec: ContainerRecord) => {
    registryRef.current.set(containerId, rec);
    setOverlayVersion((v) => v + 1);
  }, []);
  const unregister = useCallback((containerId: Id) => {
    registryRef.current.delete(containerId);
    setOverlayVersion((v) => v + 1);
  }, []);
  const ctx = useMemo<GroupContextValue>(() => ({ register, unregister }), [register, unregister]);

  const containerOf = useCallback((id: Id | null | undefined): Id | undefined => {
    if (id == null) return undefined;
    for (const [cid, rec] of registryRef.current) if (rec.items.includes(id)) return cid;
    return undefined;
  }, []);
  // over.id is either an item (→ its container) or a container droppable id (→ itself).
  const resolveContainer = useCallback(
    (id: Id): Id | undefined => containerOf(id) ?? (registryRef.current.has(id) ? id : undefined),
    [containerOf],
  );
  const indexIn = useCallback((containerId: Id | undefined, id: Id): number => {
    if (containerId == null) return -1;
    return registryRef.current.get(containerId)?.items.indexOf(id) ?? -1;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as Id);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const id = active.id as Id;
    const overId = over.id as Id;
    const fromC = containerOf(id);
    const toC = resolveContainer(overId);
    if (!fromC || !toC || fromC === toC) return; // within-container handled in dragEnd
    const overItems = registryRef.current.get(toC)?.items ?? [];
    const overIndex = overItems.indexOf(overId);
    let toIndex: number;
    if (overIndex >= 0) {
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      const isBelow =
        activeRect && overRect ? activeRect.top > overRect.top + overRect.height / 2 : false;
      toIndex = overIndex + (isBelow ? 1 : 0);
    } else {
      toIndex = overItems.length; // hovered the (possibly empty) container itself
    }
    onMove?.({
      id,
      from: { container: fromC, index: indexIn(fromC, id) },
      to: { container: toC, index: toIndex },
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const id = active.id as Id;
    const overId = over.id as Id;
    if (id === overId) return;
    const fromC = containerOf(id);
    const toC = resolveContainer(overId);
    if (!fromC || !toC || fromC !== toC) return; // cross-container already handled in dragOver
    const from = indexIn(fromC, id);
    const to = indexIn(toC, overId);
    if (from < 0 || to < 0 || from === to) return;
    onMove?.({ id, from: { container: fromC, index: from }, to: { container: toC, index: to } });
  };

  const handleDragCancel = () => setActiveId(null);

  const overlayContent = useMemo<ReactNode>(() => {
    void overlayVersion; // re-read the registry after container (re)registrations
    if (activeId == null) return null;
    const cid = containerOf(activeId);
    return cid == null ? null : (registryRef.current.get(cid)?.itemContent.get(activeId) ?? null);
  }, [activeId, overlayVersion, containerOf]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <GroupContext.Provider value={ctx}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
          {overlayContent != null ? (
            <SortableItemContext.Provider value={OVERLAY_ITEM_CONTEXT}>
              <div className={clsx(styles.item, styles.overlayItem)} data-dragging="true">
                {overlayContent}
              </div>
            </SortableItemContext.Provider>
          ) : null}
        </DragOverlay>
      </DndContext>
    </GroupContext.Provider>
  );
};
SortableGroupRoot.displayName = 'SortableGroup';

/**
 * One list inside a `<SortableGroup>`. Renders an `<ol>` (its own
 * `SortableContext`) and registers as a droppable so even an empty list accepts
 * cross-container drops. Children are `<Sortable.Item>`s for the ids in `items`.
 */
const SortableGroupContainer = forwardRef<HTMLOListElement, SortableGroupContainerProps>(
  function SortableGroupContainer({ id, items, className, children, ...rest }, ref) {
    const group = useContext(GroupContext);
    if (!group) {
      throw new Error('<SortableGroup.Container> must be used inside <SortableGroup>.');
    }
    const { setNodeRef } = useDroppable({ id });

    const contentMap = useMemo(() => itemContentMap(children), [children]);
    useEffect(() => {
      group.register(id, { items, itemContent: contentMap });
      return () => group.unregister(id);
    }, [group, id, items, contentMap]);

    const setRefs = useCallback(
      (node: HTMLOListElement | null) => {
        setNodeRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [setNodeRef, ref],
    );

    return (
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ol ref={setRefs} className={clsx(styles.list, className)} {...rest}>
          {children}
        </ol>
      </SortableContext>
    );
  },
);
SortableGroupContainer.displayName = 'SortableGroup.Container';

export const SortableGroup = Object.assign(SortableGroupRoot, {
  Container: SortableGroupContainer,
});
```

(Note: `SortableGroupRoot` renders no DOM node of its own — it's a context + `DndContext` wrapper, like a provider — so it is intentionally NOT a `forwardRef` (there is no element to ref). The DOM-rendering `Container` IS a `forwardRef<HTMLOListElement>`. If the structure/lint check expects a ref on every component, this is the documented exception for a context-only component.)

- [ ] **Step 3: Implement `index.ts`**

```ts
export { SortableGroup } from './SortableGroup';
export type { SortableGroupProps, SortableGroupContainerProps } from './SortableGroup';
export { moveSortableItem } from './moveSortableItem';
export type { SortableMoveEvent } from './moveSortableItem';
```

- [ ] **Step 4: Write the test (`SortableGroup.test.tsx`)**

Use the existing `Sortable.test.tsx` harness pattern (it fires synthetic dnd-kit drag events — read `Sortable.test.tsx` for how it dispatches `onDragEnd` etc. via the `DndContext`; mirror it). Cover:

```tsx
import { render, screen } from '@testing-library/react';
import { SortableGroup } from './SortableGroup';
import { Sortable } from '../Sortable';

function Group(props: { onMove?: (e: unknown) => void }) {
  return (
    <SortableGroup onMove={props.onMove}>
      <SortableGroup.Container id="a" items={['x', 'y']}>
        <Sortable.Item id="x">X</Sortable.Item>
        <Sortable.Item id="y">Y</Sortable.Item>
      </SortableGroup.Container>
      <SortableGroup.Container id="b" items={['p']}>
        <Sortable.Item id="p">P</Sortable.Item>
      </SortableGroup.Container>
    </SortableGroup>
  );
}

describe('SortableGroup', () => {
  it('renders all containers and items as a listbox of <ol>s', () => {
    render(<Group />);
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(document.querySelectorAll('ol').length).toBe(2);
  });

  it('throws if Container is used outside SortableGroup', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <SortableGroup.Container id="a" items={[]}>
          {null}
        </SortableGroup.Container>,
      ),
    ).toThrow(/must be used inside <SortableGroup>/);
    err.mockRestore();
  });

  // The cross-container index logic lives in handleDragOver/handleDragEnd, which
  // need real dnd-kit events. The pure index math is fully covered by
  // moveSortableItem.test.ts; here, drive the keyboard reorder (the path that
  // works in jsdom, mirroring Sortable.test.tsx) to assert onMove fires with the
  // right from/to for a within-container move. If Sortable.test.tsx uses a
  // synthetic-event helper, reuse it for a cross-container case too.
});
```

Open `Sortable.test.tsx` first and reuse its exact keyboard-drag / synthetic-event approach. At minimum assert: render of both containers, the Container-outside-group throw, and a within-container reorder firing `onMove` with `from.container === to.container` and the right indices (via the keyboard path). If the harness supports it, add a cross-container assertion; otherwise the cross-container math is covered by `moveSortableItem.test.ts` + the Playwright pass (Task 7).

- [ ] **Step 5: Run the tests + typecheck + stylelint**

Run: `cd packages/design-system && npx vitest run src/components/SortableGroup/ && npx tsc --noEmit && npx stylelint "src/components/SortableGroup/*.scss"`
Expected: all green. (If `moveSortableItem.test.ts` was failing on the missing type in Task 1, it now passes since `SortableMoveEvent` exists.)

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/SortableGroup/
git commit -m "feat(SortableGroup): multi-container DndContext + Container + overlay + a11y"
```

---

## Task 3: Exports

**Files:** Modify `packages/design-system/src/index.ts`

- [ ] **Step 1: Add the exports** near the existing `Sortable` export (find `export { Sortable`):

```ts
export { SortableGroup, moveSortableItem } from './components/SortableGroup';
export type {
  SortableGroupProps,
  SortableGroupContainerProps,
  SortableMoveEvent,
} from './components/SortableGroup';
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/design-system && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/index.ts
git commit -m "feat(SortableGroup): export from the package barrel"
```

---

## Task 4: Manifest

**Files:** Modify `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs`

- [ ] **Step 1: Add `SortableGroup: 'Forms'` to the `CLUSTERS` map in BOTH files** (next to `Sortable: 'Forms'`).

- [ ] **Step 2: Regenerate**

Run: `cd packages/design-system && npm run build:manifest`
Expected: `components.manifest.json` gains a `SortableGroup` entry (`tier: "composition"`, `cluster: "Forms"`, `composes` includes `Sortable`).

- [ ] **Step 3: Verify the drift test + typecheck**

Run: `cd packages/design-system && npx vitest run src/_meta/manifest.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "feat(SortableGroup): manifest CLUSTERS (Forms)"
```

---

## Task 5: Playground demo + wiring

**Files:** Create `SortableGroupDemo.tsx`; modify `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`, `registry.ts`.

- [ ] **Step 1: Create `packages/playground/src/pages/components/SortableGroupDemo.tsx`**

```tsx
import { useState } from 'react';
import {
  SortableGroup,
  Sortable,
  moveSortableItem,
  Stack,
  Cluster,
  Card,
  Text,
  Code,
} from '@eocrm/design-system';
import { GripVertical } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface Field {
  id: string;
  label: string;
}
const INITIAL: Record<string, Field[]> = {
  contact: [
    { id: 'first', label: 'First name' },
    { id: 'last', label: 'Last name' },
    { id: 'email', label: 'Email' },
  ],
  company: [
    { id: 'name', label: 'Company name' },
    { id: 'size', label: 'Headcount' },
  ],
  custom: [{ id: 'nps', label: 'NPS score' }],
};
const GROUP_LABELS: Record<string, string> = {
  contact: 'Contact',
  company: 'Company',
  custom: 'Custom',
};

export function SortableGroupDemo() {
  const [groups, setGroups] = useState<Record<string, Field[]>>(INITIAL);
  return (
    <DemoLayout
      name="SortableGroup"
      componentName="SortableGroup"
      description="Multi-container sortable — drag fields within a group AND between groups. Built on dnd-kit with a shared DragOverlay and a live cross-container handoff; apply onMove with the moveSortableItem helper. For a single list, use Sortable."
      files={getComponentFiles('SortableGroup')}
    >
      <Example
        title="Drag fields between groups"
        description="Grab a field's handle and drag it within its group to reorder, or across into another group. onMove fires during the drag (cross-container) and on drop; moveSortableItem applies it to the per-group state."
        code={`const [groups, setGroups] = useState(initial);
<SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
  {Object.entries(groups).map(([gid, fields]) => (
    <SortableGroup.Container key={gid} id={gid} items={fields.map((f) => f.id)}>
      {fields.map((f) => (
        <Sortable.Item key={f.id} id={f.id}>
          <Sortable.Handle><GripVertical size={14} /></Sortable.Handle>
          {f.label}
        </Sortable.Item>
      ))}
    </SortableGroup.Container>
  ))}
</SortableGroup>`}
      >
        <Stack gap="md">
          <SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
            <Cluster gap="md" align="start">
              {Object.entries(groups).map(([gid, fields]) => (
                <Card key={gid} style={{ minWidth: 200, flex: 1 }}>
                  <Stack gap="sm">
                    <Text size="sm" weight="semibold">
                      {GROUP_LABELS[gid]}
                    </Text>
                    <SortableGroup.Container id={gid} items={fields.map((f) => f.id)}>
                      {fields.map((f) => (
                        <Sortable.Item key={f.id} id={f.id}>
                          <Cluster gap="sm" align="center">
                            <Sortable.Handle>
                              <GripVertical size={14} />
                            </Sortable.Handle>
                            <Text size="sm">{f.label}</Text>
                          </Cluster>
                        </Sortable.Item>
                      ))}
                    </SortableGroup.Container>
                  </Stack>
                </Card>
              ))}
            </Cluster>
          </SortableGroup>
          <Text size="sm" tone="muted">
            Order →{' '}
            <Code>
              {Object.entries(groups)
                .map(([g, f]) => `${g}: [${f.map((x) => x.id).join(', ')}]`)
                .join('  ·  ')}
            </Code>
          </Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
```

(Confirm `Card` forwards `style` and accepts the inline `flex`/`minWidth` — demos allow inline styles. If `Card`'s style/flex handling differs, wrap each group in a `<div style>` instead. Confirm `Text` has a `weight` prop; if not, use `<Title order>` or drop it.)

- [ ] **Step 2: Wire the route** (`App.tsx`) — import + route after the Sortable route:

```tsx
import { SortableGroupDemo } from './pages/components/SortableGroupDemo';
// inside <Routes>, after the /components/sortable route:
<Route path="/components/sortable-group" element={<SortableGroupDemo />} />;
```

- [ ] **Step 3: Wire the nav** (`layout/AppShell/navItems.ts`) — add to the **Forms** group after Sortable (reuse an imported icon, e.g. `Rows3` or `Columns3`; import it from lucide-react):

```ts
{ to: '/components/sortable-group', label: 'SortableGroup', icon: Columns3, end: false },
```

(Add `Columns3` to the existing lucide import. If `Columns3` isn't exported by the installed lucide version, use another present icon like `LayoutGrid` or `GripVertical`.)

- [ ] **Step 4: Wire the overview card** (`ComponentsIndex.tsx`) — import `SortableGroup`/`Sortable` if not already, and add a card near the Sortable card:

```tsx
{
  to: '/components/sortable-group',
  name: 'SortableGroup',
  description: 'Drag items between multiple sortable lists (cross-container), with a live handoff.',
  preview: <div className={styles.tile} style={{ width: '100%', maxWidth: 200, height: 40 }} />,
},
```

(A static preview tile is fine — a live multi-list drag in a tiny card is impractical. Match the neighboring cards' shape.)

- [ ] **Step 5: Wire the registry union** (`pages/mockups/registry.ts`) — add `| 'SortableGroup'` to the `ComponentName` union (alphabetical, near `'Sortable'`).

- [ ] **Step 6: Build the playground**

Run: `cd /Users/dpws/projects/design-system && make build`
Expected: typecheck + bundle succeed (validates the demo + all wiring).

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/components/SortableGroupDemo.tsx packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(SortableGroup): playground demo + nav/route/overview/registry wiring"
```

---

## Task 6: AGENTS.md

**Files:** Modify `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add a TL;DR** in the Sortable area:

````md
### `<SortableGroup>` — multi-container sortable (drag between lists)

`<SortableGroup onMove>` + `<SortableGroup.Container id items>` under one shared `DndContext` — drag `<Sortable.Item>`s within a list AND between lists. Controlled + live: `onMove({ id, from:{container,index}, to:{container,index} })` fires on each cross-container handoff during the drag AND on drop; apply it with the exported pure `moveSortableItem(containers, event)` (immutable, generic over item type). For a single list, use `<Sortable>`.

```tsx
const [groups, setGroups] = useState<Record<string, Field[]>>(initial);
<SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
  {Object.entries(groups).map(([gid, fields]) => (
    <SortableGroup.Container key={gid} id={gid} items={fields.map((f) => f.id)}>
      {fields.map((f) => (
        <Sortable.Item key={f.id} id={f.id}>
          {f.label}
        </Sortable.Item>
      ))}
    </SortableGroup.Container>
  ))}
</SortableGroup>;
```
````

- Container ids and item ids share dnd-kit's one id namespace — keep them all unique.
- Each `Container.items` must match its `<Sortable.Item>` child ids (it's the ordering source of truth).
- Esc-cancel doesn't revert (moves are applied to your state optimistically) — snapshot before drag to undo.

````

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(SortableGroup): AGENTS.md TL;DR"
````

---

## Task 7: Full gates + browser verification

- [ ] **Step 1: Run all gates from the repo root**

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

Expected: all PASS; tarball grep `0`. Fix prettier drift with `npx prettier --write` if flagged.

- [ ] **Step 2: Browser (Playwright, manual) on the running playground** (`/components/sortable-group`):
  - Drag a field within a group by its handle → it reorders; the order line updates.
  - Drag a field across into another group → it slides into the target list live; on drop the order line shows it in the new group.
  - The drag overlay follows the cursor showing the field content.
  - Tab to a handle, Space to pick up, Arrow to move, Space to drop → keyboard reorder works.
  - Note any glitch (item not appearing in target, overlay empty, render loop / flicker) and fix before finishing.

---

## Self-review notes

- **Spec coverage:** shared DndContext + overlay (T2) · `<SortableGroup.Container>` with explicit `items` + droppable (T2) · live `onMove` handoff in `onDragOver` + drop in `onDragEnd` (T2) · `moveSortableItem` pure helper (T1) · registry for cross-container overlay content (T2) · keyboard a11y via reused Handle + sortableKeyboardCoordinates (T2) · `Sortable.Item`/`Handle` unchanged (Container does registration) · Core invariant: tests, demo+wiring (T5), exports (T3), manifest (T4), JSDoc (T2), AGENTS (T6).
- **Type consistency:** `SortableMoveEvent { id, from:{container,index}, to:{container,index} }` defined once in `moveSortableItem.ts` (T1), imported by `SortableGroup.tsx` for the `onMove` prop + handlers (T2), re-exported from the barrel (T2 index) → `src/index.ts` (T3). `Id = string | number` throughout.
- **Known risk — registry/overlay render-loop:** `register` runs in the Container's `useEffect` (not during render) and only bumps `overlayVersion` (overlay re-read), not the containers. Adversarial review + the browser pass must confirm no loop/flicker. If `overlayVersion` churn is a problem, gate the bump behind `activeId != null`.
- **Known risk — cross-container index in jsdom:** `handleDragOver`'s pointer-midpoint math needs real geometry, so it's verified in the browser (T7); the pure index/move math is unit-tested (T1) and the within-container path is unit-tested via the keyboard harness (T2).
- **No-forwardRef on `SortableGroupRoot`:** intentional — it renders no DOM node (context + DndContext only). The `Container` forwards its `<ol>` ref.
