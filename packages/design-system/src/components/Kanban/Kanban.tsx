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
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
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
import { useTranslation } from '../../i18n/useTranslation';
import { containerAwareClosestCorners } from '../Sortable/containerAwareCollision';
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
 *     const toCards = to.columnId === from.columnId
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
 * @remarks Drop position semantics
 * The committed `to.index` is the slot the preview showed at the moment of
 * release — the two cannot drift, because both are read off the same
 * `over`. `verticalListSortingStrategy` renders a column as
 * `arrayMove(cards, activeIndex, overIndex)` where
 * `overIndex = cards.indexOf(over.id)`, so the gap the user sees sits at
 * `overIndex`; `onMove` commits that same index. Where `over` is not a card
 * (`overIndex === -1`) the strategy displaces nothing, so the preview is the
 * card's live slot and that is what gets committed. Concretely:
 * - Drop on a sibling card → the active card lands at that card's slot in
 *   the destination as rendered mid-drag. The slot re-evaluates as the
 *   cursor moves, for the whole drag — not only at the column boundary
 *   (fixed in #376; before that a cross-column drop committed the entry
 *   slot while the preview kept tracking the cursor).
 * - Cross-column drop onto an empty column → index 0 of the destination.
 * - Cross-column drop in the column's padding past the last card → appended
 *   to the end of the destination, re-appended as long as the cursor stays
 *   in the padding.
 * - Within-column reorder onto a sibling card → arrayMove semantics: the
 *   active card ends at the over card's index in the column as currently
 *   rendered (for a drag that never left its column that's the card's
 *   pre-move index, since nothing re-seated it).
 * - Within-column drop on the source column's own padding past all cards →
 *   appended to the end of the source column. This is the one deliberate
 *   deviation from "commit === preview": `over` is the column, so the
 *   strategy shows the card in its original slot, but snapping a
 *   dragged-to-the-bottom card back to where it started reads as a dropped
 *   drag, so the commit appends instead.
 * - Release without moving (cursor never left the card's own slot) or Escape
 *   → snap back; `onMove` does NOT fire. Note that releasing *outside* the
 *   board is not a cancel: `closestCorners` still resolves the nearest
 *   column, so the card commits there.
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
  const t = useTranslation();
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
  const originRef = useRef<string | number | null>(null);
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      // The column the card started in. Used by handleDragOver to tell a
      // genuine same-column reorder apart from "already transited, still
      // moving inside the destination".
      originRef.current = findContainer(event.active.id as string | number, initialItems);
      // Snapshot: shallow-copy each cards array so mutations don't leak into initialItems.
      const snapshot = new Map<string | number, (string | number)[]>();
      for (const [colId, cards] of initialItems) snapshot.set(colId, [...cards]);
      setLiveItems(snapshot);
    },
    [initialItems, findContainer],
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

        const isTransit = activeContainer !== overContainer;
        // Pointer in the padding of the column the card has already transited
        // into (no card under it). `over` is the column, so the sortable
        // strategy computes overIndex === -1 and applies NO displacement —
        // re-appending here is therefore stable (it can't fight a transform)
        // and it's exactly what the user sees. Cheap to keep in sync.
        const isForeignAppend =
          !isTransit && overId === overContainer && overContainer !== originRef.current;
        // Everything else with active and over in the same column is finalized
        // at dragEnd from `over` (see handleDragEnd). Re-seating the card here
        // on every dragOver would oscillate: the insertion re-measures the
        // rects, which changes `over`, which re-fires this handler — and the
        // strategy would still displace siblings on top of the new order, so
        // the commit would drift from the preview again.
        if (!isTransit && !isForeignAppend) return prev;

        const activeCards = prev.get(activeContainer) ?? [];
        if (!activeCards.includes(activeId)) return prev;
        if (isForeignAppend && activeCards[activeCards.length - 1] === activeId) return prev;

        // Slot math runs against the destination WITHOUT the active card, so
        // the card's own slot is never counted (off-by-one when moving down).
        const overCards = (prev.get(overContainer) ?? []).filter((id) => id !== activeId);

        // Resolve the target slot inside overContainer:
        //   - over.id is a sibling card → use that card's index, plus 1 if
        //     the cursor is past the over card's vertical midpoint (active's
        //     translated rect tracks the cursor centered around it).
        //   - over.id is the column itself (empty drop / padding) → append
        let insertAt: number;
        if (overCards.includes(overId)) {
          const overIdx = overCards.indexOf(overId);
          const activeRect = active.rect.current.translated;
          const overRect = over.rect;
          const isBelow =
            activeRect != null &&
            activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2;
          insertAt = overIdx + (isBelow ? 1 : 0);
        } else if (overId === overContainer) {
          insertAt = overCards.length;
        } else {
          return prev;
        }

        const next = new Map(prev);
        if (isTransit) {
          next.set(
            activeContainer,
            activeCards.filter((id) => id !== activeId),
          );
        }
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

      // Source (from-position): the card's pre-drag location.
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

      if (fromColumn == null) {
        setLiveItems(null);
        return;
      }

      // Where does active currently live in liveItems? handleDragOver seats
      // it in the destination on transit; the exact slot is resolved HERE,
      // from `over`, because that's what the user was looking at:
      // `verticalListSortingStrategy` renders each column as
      // `arrayMove(liveItems[col], activeIndex, overIndex)` with
      // `overIndex = liveItems[col].indexOf(over.id)`, so the previewed slot
      // is `overIndex` whenever `over` is a sibling card, and the card's live
      // slot when it isn't (`overIndex === -1` → the strategy displaces
      // nothing). Committing the live slot alone would pin the drop to the
      // boundary-crossing point (#376).
      let liveColumn: string | number | null = null;
      let liveIdx = -1;
      for (const [colId, cards] of finalItems) {
        const idx = cards.indexOf(activeId);
        if (idx >= 0) {
          liveColumn = colId;
          liveIdx = idx;
          break;
        }
      }

      let toColumn: string | number;
      let toIndex: number;

      if (liveColumn != null && liveColumn !== fromColumn) {
        // Cross-column drop: the previewed slot wins (see the comment above).
        toColumn = liveColumn;
        const destCards = finalItems.get(liveColumn) ?? [];
        const overIdx = overId === activeId ? -1 : destCards.indexOf(overId);
        toIndex = overIdx >= 0 ? overIdx : liveIdx;
      } else if (initialItems.has(overId)) {
        // Within-source-column drop on the column's padding (no card target).
        // Default to "drop at end" so the card lands where the user dragged
        // it, rather than snapping back to its original slot.
        toColumn = fromColumn;
        const fromCol = initialItems.get(fromColumn) ?? [];
        toIndex = fromCol.length - 1;
      } else if (overId === activeId) {
        // Cursor over the dragged card itself. The strategy displaces nothing
        // (overIndex === activeIndex), so the preview IS the live order —
        // commit that. A barely-moved drag resolves to its own starting index
        // and gets dropped by the no-op guard below; a card that came back to
        // its origin column lands where the preview put it.
        toColumn = fromColumn;
        toIndex = liveIdx;
      } else {
        // Within-column drop on a sibling card. arrayMove semantics:
        //   toIndex = sibling's index in the live column — same rule as the
        // cross-column branch. For a plain same-column drag liveItems is
        // untouched, so this is the sibling's index in the consumer's
        // pre-move state; if the card visited another column and came back,
        // the live order is what the preview showed, so it wins.
        // For cross-column drops where the transit didn't commit (rare
        // stale-closure case at the very first dragOver), the sibling may
        // live in a different column — resolve the column from the card.
        let overCol: string | number | null = null;
        for (const [colId, cards] of finalItems) {
          if (cards.includes(overId)) {
            overCol = colId;
            break;
          }
        }
        if (overCol == null) {
          setLiveItems(null);
          return;
        }
        toColumn = overCol;
        toIndex = (finalItems.get(toColumn) ?? []).indexOf(overId);
      }

      setLiveItems(null);

      if (toIndex < 0) return;
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
      collisionDetection={containerAwareClosestCorners}
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
        aria-label={t('kanban.board')}
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
