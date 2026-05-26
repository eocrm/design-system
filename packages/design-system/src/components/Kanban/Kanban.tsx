import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  closestCorners,
  DndContext,
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import {
  SortableHandle,
  SortableItemContext,
  type SortableItemContextValue,
} from '../Sortable/Sortable';
import styles from './Kanban.module.scss';

// ---------------------------------------------------------------------------
// Internal context: Root → Column, passes effective cardIds for SortableContext
// ---------------------------------------------------------------------------

const KanbanColumnItemsContext = createContext<readonly (string | number)[] | null>(null);

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * Payload fired by `onMove` after a successful drag-drop across or within
 * a column. Consumer applies the move by updating their items state.
 */
export interface KanbanMoveEvent {
  /** Source position — where the card was before the drag. */
  from: { columnId: string | number; index: number };
  /** Destination position — where the card landed after the drop. */
  to: { columnId: string | number; index: number };
  /** The id of the card that was dragged. */
  cardId: string | number;
}

export interface KanbanProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Fires once per drag (on drop) with the from/to positions and the cardId.
   * NOT fired on drag cancel. NOT fired when from === to (no-op drop).
   *
   * Consumer should update their items state immutably, e.g.:
   * ```ts
   * const [cols, setCols] = useState({ todo: ['a', 'b'], done: ['c'] });
   * const handleMove = ({ from, to, cardId }) => {
   *   setCols((prev) => {
   *     const next = { ...prev };
   *     next[from.columnId] = [...prev[from.columnId]];
   *     next[from.columnId].splice(from.index, 1);
   *     next[to.columnId] = [...prev[to.columnId]];
   *     next[to.columnId].splice(to.index, 0, cardId);
   *     return next;
   *   });
   * };
   * ```
   */
  onMove?: (event: KanbanMoveEvent) => void;
}

export interface KanbanColumnProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  /**
   * Stable identifier for this column. Must be unique within a `<Kanban>`.
   * Used internally to track which cards belong to which column.
   */
  id: string | number;
  children?: ReactNode;
}

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  /**
   * Stable identifier for this card. Must be unique across ALL columns in
   * the `<Kanban>`. Used by dnd-kit to track the card during drag.
   */
  id: string | number;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// containsHandle — mirrors Sortable's implementation; checks for KanbanHandle
// ---------------------------------------------------------------------------

/**
 * Recursively walk the children subtree looking for a `Kanban.Handle`
 * (`SortableHandle`). Mirrors Sortable's `containsHandle` function.
 *
 * Limitation: only walks `React.Children` and `props.children` — a Handle
 * wrapped inside a custom component is invisible to this walk.
 */
function containsHandle(children: ReactNode): boolean {
  let found = false;
  function walk(node: ReactNode) {
    if (found) return;
    if (!isValidElement(node)) return;
    if (node.type === SortableHandle) {
      found = true;
      return;
    }
    const { children: nested } = node.props as { children?: ReactNode };
    if (nested != null) Children.forEach(nested, walk);
  }
  Children.forEach(children, walk);
  return found;
}

// ---------------------------------------------------------------------------
// KanbanCard
// ---------------------------------------------------------------------------

/**
 * One draggable card inside a `<Kanban.Column>`. Renders a `<div>` with
 * the consumer's children. Must have a stable `id` prop.
 *
 * If the children subtree contains a `<Kanban.Handle>`, only the Handle
 * initiates drag (the card div gets `role="article"`). Otherwise the whole
 * card is draggable (dnd-kit applies `role="button"`).
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { id, className, children, ...rest },
  ref,
) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const hasHandle = useMemo(() => containsHandle(children), [children]);

  const ctxValue = useMemo<SortableItemContextValue>(
    () => ({ listeners, attributes, setActivatorNodeRef }),
    [listeners, attributes, setActivatorNodeRef],
  );

  const setRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    // When no Handle is present, the Card itself is the drag activator.
    if (!hasHandle) setActivatorNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <SortableItemContext.Provider value={ctxValue}>
      <div
        ref={setRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        data-dragging={isDragging ? 'true' : undefined}
        className={clsx(styles.card, className)}
        // dnd-kit drag attrs BEFORE {...rest} so consumer rest wins.
        {...(hasHandle ? {} : listeners)}
        {...(hasHandle ? {} : attributes)}
        {...rest}
        // role="article" AFTER {...rest} so it wins, but only when a Handle
        // is present. Without a Handle, dnd-kit's role="button" is correct
        // (Card IS the drag activator).
        {...(hasHandle ? { role: 'article' } : {})}
      >
        {children}
      </div>
    </SortableItemContext.Provider>
  );
});
KanbanCard.displayName = 'KanbanCard';

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

/**
 * One swimlane in a `<Kanban>`. Renders a droppable `<div>` wrapping a
 * `SortableContext` so cards within it can reorder. Must have a stable `id`.
 *
 * Column layout (header, footer) goes before / after `<Kanban.Card>` children
 * — keep cards as a contiguous block.
 */
export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(function KanbanColumn(
  { id, className, children, ...rest },
  ref,
) {
  const { setNodeRef } = useDroppable({ id });

  // Effective card ids are injected by KanbanRoot via context so that this
  // column's SortableContext sees the live-reordered order.
  const ctxCardIds = useContext(KanbanColumnItemsContext);

  // Fallback: derive card ids from children if not in context (standalone use).
  const fallbackCardIds = useMemo(() => {
    if (ctxCardIds !== null) return null; // skip computation
    const ids: (string | number)[] = [];
    Children.forEach(children, (card) => {
      if (!isValidElement(card) || card.type !== KanbanCard) return;
      ids.push((card.props as KanbanCardProps).id);
    });
    return ids;
  }, [children, ctxCardIds]);

  const cardIds = ctxCardIds ?? fallbackCardIds ?? [];

  const setRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div ref={setRef} className={clsx(styles.column, className)} {...rest}>
      <SortableContext
        items={cardIds as (string | number)[]}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </div>
  );
});
KanbanColumn.displayName = 'KanbanColumn';

// ---------------------------------------------------------------------------
// KanbanRoot
// ---------------------------------------------------------------------------

/**
 * Multi-column drag-and-drop board. Compound API: `Kanban`, `Kanban.Column`,
 * `Kanban.Card`, `Kanban.Handle`. Built on `@dnd-kit/sortable`.
 *
 * Cards reflow live as the dragged card crosses column boundaries — the
 * target column shifts to make room in real time (matching Trello / Jira
 * UX). Internal `liveItems` state drives the live reflow; consumer state is
 * untouched until `onMove` fires on drop.
 *
 * Controlled-only: consumer holds their items state and applies the move in
 * `onMove`, then re-renders. `onMove` fires exactly once per drag (on drop),
 * never during drag.
 *
 * @example
 * // Basic Kanban with two columns and a Handle per card.
 * const [cols, setCols] = useState({
 *   todo: [{ id: 'a', title: 'Write tests' }, { id: 'b', title: 'Fix bug' }],
 *   done: [{ id: 'c', title: 'Ship it' }],
 * });
 *
 * const handleMove = ({ from, to, cardId }) => {
 *   setCols((prev) => {
 *     const fromCards = [...prev[from.columnId]];
 *     const [moved] = fromCards.splice(from.index, 1);
 *     const toCards = prev.to === prev.from
 *       ? fromCards
 *       : [...prev[to.columnId]];
 *     toCards.splice(to.index, 0, moved);
 *     return {
 *       ...prev,
 *       [from.columnId]: fromCards,
 *       [to.columnId]: toCards,
 *     };
 *   });
 * };
 *
 * <Kanban onMove={handleMove}>
 *   {Object.entries(cols).map(([colId, cards]) => (
 *     <Kanban.Column key={colId} id={colId}>
 *       <h3>{colId}</h3>
 *       {cards.map((card) => (
 *         <Kanban.Card key={card.id} id={card.id}>
 *           <Cluster justify="between">
 *             <span>{card.title}</span>
 *             <Kanban.Handle aria-label={`Drag ${card.title}`} />
 *           </Cluster>
 *         </Kanban.Card>
 *       ))}
 *     </Kanban.Column>
 *   ))}
 * </Kanban>
 *
 * @remarks When NOT to use
 * - Single-column drag-to-reorder — use `<Sortable>` instead. It's simpler
 *   and doesn't carry the multi-column DndContext overhead.
 * - Pure display boards with no drag (read-only lists) — use `<Stack>` +
 *   `<Card>`. No need for dnd-kit wiring.
 * - Column reordering — not supported; columns render in source JSX order.
 * - Cross-column keyboard reorder — dnd-kit's `sortableKeyboardCoordinates`
 *   is scoped per `SortableContext` (i.e., per column). Keyboard drag works
 *   within a column only.
 *
 * @remarks Anti-patterns
 * - ❌ Expecting cross-column keyboard reorder. dnd-kit's keyboard
 *   coordinator is per-SortableContext. Cards keyboard-reorder within their
 *   column; cross-column keyboard move is out of scope.
 * - ❌ Non-contiguous cards within a column's children. The live-reinsertion
 *   architecture splits each column's children into [before-cards, cards,
 *   after-cards]. If you interleave non-card elements within the card block
 *   (e.g. `<Card><Divider><Card>`), the non-card ends up in an unexpected
 *   position after a reorder. Keep headers/footers strictly before/after the
 *   card block.
 * - ❌ Wrapping `<Kanban.Card>` inside a custom component. Both
 *   `containsHandle` and the card-extraction walk direct children only. A
 *   card wrapped in `<MyRow>` won't be extracted — it renders but won't be
 *   reorderable via live-reinsertion.
 * - ❌ Non-stable column / card ids. Ids must be stable across renders.
 *   Using array indices breaks dnd-kit's reconciliation during drag.
 * - ❌ Mutating state in place inside `onMove`. Always produce a new array /
 *   object — React needs a fresh reference to schedule a re-render.
 */
const KanbanRoot = forwardRef<HTMLDivElement, KanbanProps>(function KanbanRoot(
  { onMove, className, children, ...rest },
  ref,
) {
  // ------------------------------------------------------------------
  // Parse children: extract column order, initial items, card elements,
  // and the before/after non-card slices for each column.
  // columnElements is built in the same pass so render-time lookup is O(1)
  // instead of O(N) per column (i.e., O(N²) total per render).
  // ------------------------------------------------------------------
  const { columnOrder, columnElements, initialItems, cardElements, columnChildrenSlices } =
    useMemo(() => {
      const colOrder: (string | number)[] = [];
      const colElems = new Map<string | number, ReactElement<KanbanColumnProps>>();
      const initItems = new Map<string | number, (string | number)[]>();
      const cardElems = new Map<string | number, ReactElement<KanbanCardProps>>();
      const colSlices = new Map<string | number, { before: ReactNode[]; after: ReactNode[] }>();

      Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== KanbanColumn) return;
        const columnElement = child as ReactElement<KanbanColumnProps>;
        const colProps = columnElement.props;
        const colId = colProps.id;
        colOrder.push(colId);
        colElems.set(colId, columnElement);

        const colCardIds: (string | number)[] = [];
        let firstCardIdx = -1;
        let lastCardIdx = -1;
        const colChildren = Children.toArray(colProps.children);

        colChildren.forEach((grandchild, idx) => {
          if (!isValidElement(grandchild) || grandchild.type !== KanbanCard) return;
          const cardProps = grandchild.props as KanbanCardProps;
          colCardIds.push(cardProps.id);
          cardElems.set(cardProps.id, grandchild as ReactElement<KanbanCardProps>);
          if (firstCardIdx < 0) firstCardIdx = idx;
          lastCardIdx = idx;
        });

        // Split into before/after slices (non-card children outside the card block).
        const before: ReactNode[] =
          firstCardIdx >= 0 ? colChildren.slice(0, firstCardIdx) : colChildren;
        const after: ReactNode[] = lastCardIdx >= 0 ? colChildren.slice(lastCardIdx + 1) : [];

        initItems.set(colId, colCardIds);
        colSlices.set(colId, { before, after });
      });

      return {
        columnOrder: colOrder,
        columnElements: colElems,
        initialItems: initItems,
        cardElements: cardElems,
        columnChildrenSlices: colSlices,
      };
    }, [children]);

  // ------------------------------------------------------------------
  // Stable serialization of initialItems to detect consumer state changes.
  // JSON.stringify is robust against ids that contain `:` or `,` characters,
  // unlike a hand-rolled delimiter-join.
  // ------------------------------------------------------------------
  const initialItemsKey = useMemo(
    () => JSON.stringify(Array.from(initialItems.entries())),
    [initialItems],
  );

  // ------------------------------------------------------------------
  // Internal drag state: null when idle, populated on drag start
  // ------------------------------------------------------------------
  const [liveItems, setLiveItems] = useState<Map<string | number, (string | number)[]> | null>(
    null,
  );

  // Reset live items when consumer state mutates (e.g. external update mid-drag).
  useEffect(() => {
    setLiveItems(null);
  }, [initialItemsKey]);

  const effectiveItems = liveItems ?? initialItems;

  // ------------------------------------------------------------------
  // Sensors
  // ------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ------------------------------------------------------------------
  // Container lookup: given an id (card or column), find which column owns it
  // ------------------------------------------------------------------
  const findContainer = useCallback(
    (
      id: string | number,
      items: Map<string | number, (string | number)[]>,
    ): string | number | null => {
      if (items.has(id)) return id; // id is a column id itself (drop on empty column)
      for (const [colId, cards] of items) {
        if (cards.includes(id)) return colId;
      }
      return null;
    },
    [],
  );

  // ------------------------------------------------------------------
  // Drag handlers
  // ------------------------------------------------------------------
  const handleDragStart = useCallback(
    (_event: DragStartEvent) => {
      // Snapshot: shallow-copy each cards array so mutations don't leak into initialItems.
      const snapshot = new Map<string | number, (string | number)[]>();
      for (const [colId, cards] of initialItems) snapshot.set(colId, [...cards]);
      setLiveItems(snapshot);
    },
    [initialItems],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = active.id as string | number;
      const overId = over.id as string | number;
      if (activeId === overId) return;

      setLiveItems((prev) => {
        if (!prev) return prev;
        const activeContainer = findContainer(activeId, prev);
        const overContainer = findContainer(overId, prev);
        if (activeContainer == null || overContainer == null) return prev;

        const activeCards = prev.get(activeContainer) ?? [];
        const overCards = prev.get(overContainer) ?? [];
        if (!activeCards.includes(activeId)) return prev;

        // Resolve the target slot inside overContainer:
        //   - over.id is a sibling card → use that card's index
        //   - over.id is the column itself (empty drop / padding) → append
        let insertAt: number;
        if (overCards.includes(overId)) {
          insertAt = overCards.indexOf(overId);
        } else if (overId === overContainer) {
          insertAt = overCards.length;
        } else {
          return prev;
        }

        if (activeContainer === overContainer) {
          // Within-column reorder: keep liveItems in sync with the cursor's
          // target slot (instead of relying purely on useSortable's transient
          // CSS transforms). This way, the user's final drop position is
          // captured in state and survives stale-closure edge cases at
          // dragEnd. Uses arrayMove semantics: the active card's final index
          // equals insertAt in the resulting array.
          const currentIdx = activeCards.indexOf(activeId);
          if (currentIdx === insertAt) return prev;
          const newCards = [...activeCards];
          newCards.splice(currentIdx, 1);
          newCards.splice(insertAt, 0, activeId);
          const next = new Map(prev);
          next.set(activeContainer, newCards);
          return next;
        }

        // Cross-column: remove active from source, insert into target.
        const next = new Map(prev);
        next.set(
          activeContainer,
          activeCards.filter((id) => id !== activeId),
        );
        const newOver = [...overCards];
        newOver.splice(insertAt, 0, activeId);
        next.set(overContainer, newOver);
        return next;
      });
    },
    [findContainer],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = active.id as string | number;

      // Release outside any droppable → cancel + snap back. dnd-kit fires
      // onDragEnd with over=null when the cursor leaves all droppable areas
      // before release. Treat that as a cancellation (matches Sortable
      // semantics and Trello convention).
      if (!over) {
        setLiveItems(null);
        return;
      }

      const overId = over.id as string | number;
      const finalItems = liveItems ?? initialItems;

      // Source (from-position) is the card's pre-drag location.
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

      // Destination column resolution:
      //   - over.id is a column id: drop on column itself (empty / padding).
      //   - over.id is the active card: closestCorners picked the active
      //     card (it's a droppable too and is visually positioned at the
      //     cursor via transforms). Use liveItems to find where active was
      //     moved during drag — that's the user's intended destination.
      //   - over.id is a sibling card: resolve via initialItems
      //     (deterministic, closure-stable).
      let toColumn: string | number | null = null;
      if (initialItems.has(overId)) {
        toColumn = overId;
      } else if (overId === activeId) {
        for (const [colId, cards] of finalItems) {
          if (cards.includes(activeId)) {
            toColumn = colId;
            break;
          }
        }
      } else {
        for (const [colId, cards] of initialItems) {
          if (cards.includes(overId)) {
            toColumn = colId;
            break;
          }
        }
      }

      if (fromColumn == null || toColumn == null) {
        setLiveItems(null);
        return;
      }

      // Compute toIndex (consumer's pre-move-state coordinates — what they'll
      // splice into in their onMove reducer).
      const initialToCol = initialItems.get(toColumn) ?? [];
      let toIndex: number;
      if (overId === toColumn) {
        // Drop on column itself.
        if (fromColumn === toColumn) {
          // Within-column drop with no card target = cancel (preserves
          // earlier semantics).
          setLiveItems(null);
          return;
        }
        toIndex = initialToCol.length;
      } else if (overId === activeId) {
        // Use active's position in liveItems (where handleDragOver placed it
        // based on the cursor's latest target). Other cards in liveItems'
        // target column retain their initial relative order — handleDragOver
        // only inserts active, never reorders the rest. So active's index in
        // liveItems[toColumn] equals the consumer-side splice index for
        // both within- and cross-column drops.
        const liveToCol = finalItems.get(toColumn) ?? [];
        toIndex = liveToCol.indexOf(activeId);
        if (toIndex < 0) {
          setLiveItems(null);
          return;
        }
      } else {
        toIndex = initialToCol.indexOf(overId);
        if (toIndex < 0) {
          setLiveItems(null);
          return;
        }
      }

      setLiveItems(null);

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

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/*
        aria-label BEFORE {...rest} so consumer can pass a more specific
        label (e.g. "Q3 sales pipeline") and have it win.
        role="region" AFTER {...rest} so it stays locked — non-overridable
        semantic guarantee.
      */}
      <div
        ref={ref}
        aria-label="Kanban board"
        className={clsx(styles.board, className)}
        {...rest}
        role="region"
      >
        {columnOrder.map((colId) => {
          const columnElement = columnElements.get(colId);
          if (!columnElement) return null;

          const cardIds = effectiveItems.get(colId) ?? [];
          const cards = cardIds
            .map((id) => cardElements.get(id))
            .filter((c): c is ReactElement<KanbanCardProps> => c != null);

          const slice = columnChildrenSlices.get(colId) ?? { before: [], after: [] };

          // Re-clone the column with re-arranged children. KanbanColumn reads
          // cardIds via KanbanColumnItemsContext so its SortableContext.items
          // matches what's rendered.
          return (
            <KanbanColumnItemsContext.Provider key={colId} value={cardIds}>
              {cloneElement(columnElement, {}, ...slice.before, ...cards, ...slice.after)}
            </KanbanColumnItemsContext.Provider>
          );
        })}
      </div>
    </DndContext>
  );
});
KanbanRoot.displayName = 'Kanban';

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

export const Kanban = Object.assign(KanbanRoot, {
  Column: KanbanColumn,
  Card: KanbanCard,
  /**
   * Re-exported from `<Sortable.Handle>`. Attaches drag listeners when placed
   * inside a `<Kanban.Card>`. When present, only the Handle initiates drag
   * (the Card div gets `role="article"`).
   */
  Handle: SortableHandle,
});
