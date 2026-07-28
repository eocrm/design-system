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
import { containerAwareClosestCorners } from '../Sortable/containerAwareCollision';
import {
  sortableTarget,
  useDragAccessibility,
  type DescribeDragTarget,
} from '../_internal/dragAnnouncements';
import { useTranslation } from '../../i18n';
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
  /** The container's `aria-label`, used to name it in drag announcements. */
  label?: string;
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
 *
 * @remarks
 * The root renders no host DOM node (it's a `DndContext` + context provider), so
 * it intentionally forwards no `ref` — attach refs to `<SortableGroup.Container>`,
 * which forwards to its `<ol>`.
 */
const SortableGroupRoot = function SortableGroup({ onMove, children }: SortableGroupProps) {
  const t = useTranslation();
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
      // Insert after the over item once the dragged item's MIDPOINT passes the
      // over item's midpoint (matches Kanban's cross-container heuristic).
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      const isBelow =
        activeRect != null && overRect != null
          ? activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
          : false;
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

  // Localized announcements (Hard rule 9, #390). Items name themselves via the
  // `dragLabel` `<Sortable.Item>` publishes; a container names itself with its
  // `aria-label`, falling back to its 1-based registration order.
  const describeDrag: DescribeDragTarget = (entry, activeId) => {
    const reg = registryRef.current;
    const id = entry.id as Id;
    const cid = reg.has(id) ? id : containerOf(id);
    const rec = cid == null ? undefined : reg.get(cid);
    if (cid == null || !rec) return null;
    const container =
      rec.label ??
      t('drag.unnamedContainer', { index: [...reg.keys()].indexOf(cid) + 1, total: reg.size });
    const base = sortableTarget(entry);
    // An item: dnd-kit's own sortable data already carries the slot.
    if (!reg.has(id)) return base && { ...base, container };
    // The container itself (empty list, or the space below the items): the item
    // keeps its slot if a cross-container handoff already seated it here, and
    // is otherwise counted as one more at the end.
    const seated = rec.items.indexOf(activeId as Id);
    return seated >= 0
      ? { index: seated + 1, total: rec.items.length, container }
      : { index: rec.items.length + 1, total: rec.items.length + 1, container };
  };
  const accessibility = useDragAccessibility(describeDrag);

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
        accessibility={accessibility}
        sensors={sensors}
        collisionDetection={containerAwareClosestCorners}
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
 *
 * @remarks
 * Pass `aria-label` with the list's visible heading. It names the `<ol>` for a
 * screen reader AND names the list in drag announcements ("…position 2 of 4 in
 * In review"); without it they fall back to "list 2 of 3".
 */
const SortableGroupContainer = forwardRef<HTMLOListElement, SortableGroupContainerProps>(
  function SortableGroupContainer({ id, items, className, children, ...rest }, ref) {
    const group = useContext(GroupContext);
    if (!group) {
      throw new Error('<SortableGroup.Container> must be used inside <SortableGroup>.');
    }
    const { setNodeRef } = useDroppable({ id });

    const contentMap = useMemo(() => itemContentMap(children), [children]);
    const label = rest['aria-label'];
    useEffect(() => {
      group.register(id, { items, itemContent: contentMap, label });
      return () => group.unregister(id);
    }, [group, id, items, contentMap, label]);

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
