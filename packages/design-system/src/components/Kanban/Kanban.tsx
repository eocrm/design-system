import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
  getScrollableAncestors,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
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
import { CSS, type Transform } from '@dnd-kit/utilities';
import clsx from 'clsx';
import {
  SortableHandle,
  SortableItemContext,
  type SortableItemContextValue,
} from '../Sortable/Sortable';
import {
  containerName,
  dragLabelOf,
  useDragAccessibility,
  type DescribeDragTarget,
} from '../_internal/dragAnnouncements';
import { useTranslation } from '../../i18n/useTranslation';
import {
  containerAwareClosestCorners,
  isPointerOutsideContainers,
} from '../Sortable/containerAwareCollision';
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
// Drag bounds — the dragged card may not leave the board's scrollable content
// ---------------------------------------------------------------------------

/**
 * Where the dragged card sits inside its scroll container, and how big that
 * container's content is. Everything is expressed in the container's CONTENT
 * space (origin = scroll offset 0), which is scroll-invariant: the numbers stay
 * valid while auto-scroll moves the board under the card.
 *
 * @internal exported for unit tests; not part of the public API.
 */
export interface KanbanDragBounds {
  /** Card centre, x, in content space. */
  centerX: number;
  /** Card centre, y, in content space. */
  centerY: number;
  /** Card layout width (untransformed). */
  width: number;
  /** Card layout height (untransformed). */
  height: number;
  /** `scrollWidth` of the container, measured with the card untransformed. */
  contentWidth: number;
  /** `scrollHeight` of the container, measured with the card untransformed. */
  contentHeight: number;
}

/**
 * Measure `node` against its nearest scrollable ancestor.
 *
 * The card's own transform (and transition) are stripped for the duration of
 * the measurement — both readings would otherwise be poisoned by the transform:
 * `getBoundingClientRect()` returns the TRANSFORMED box, and a card already
 * hanging past the content edge inflates the very `scrollWidth` we are about to
 * use as the bound. Stripping makes the measurement a fixed point, so repeated
 * measurements during one drag cannot ratchet the bound outwards. The
 * transition goes too: a keyboard drag leaves a real `transition` on the drag
 * source (a pointer drag does not), and strip-then-restore would otherwise read
 * as a computed-value change and animate the card back from identity. Both are
 * restored before the browser paints (this runs in a layout effect), so nothing
 * is visible.
 *
 * Which container: only the NEAREST scrollable ancestor matters — it clips
 * everything below it, so no ancestor further up ever sees the overhang. Inside
 * a `<Kanban>` that is always the board. It is whatever else the consumer made
 * scrollable, though: a `<Kanban.Column>` given `overflow-y: auto` becomes the
 * nearest scroller for its own cards.
 *
 * Returns null when nothing is measurable — no node, or a zero-sized scroll
 * area, which is every element under jsdom (it lays nothing out). A null bound
 * means "don't clamp", i.e. the pre-#373 behaviour. Note there is no
 * "unscrollable" case to bail out of in a real browser:
 * `getScrollableAncestors` falls back to `document.scrollingElement`, so a card
 * with no scrollable ancestor is bounded by the page instead.
 *
 * @internal exported for unit tests; not part of the public API.
 */
export function measureKanbanDragBounds(node: HTMLElement | null): KanbanDragBounds | null {
  if (!node) return null;
  const [scroller] = getScrollableAncestors(node, 1);
  if (!scroller) return null;

  const previousTransform = node.style.transform;
  const previousTransition = node.style.transition;
  node.style.transform = 'none';
  node.style.transition = 'none';
  const rect = node.getBoundingClientRect();
  const box = scroller.getBoundingClientRect();
  const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientLeft, clientTop } = scroller;
  node.style.transform = previousTransform;
  node.style.transition = previousTransition;

  if (scrollWidth === 0 || scrollHeight === 0) return null;

  // Content-space origin: the padding-box corner, un-scrolled. The root
  // scrolling element is the exception — its OWN box already moves with page
  // scroll, so `box` is the un-scrolled origin and subtracting the scroll
  // offset again would count it twice.
  const isRootScroller = scroller === scroller.ownerDocument.scrollingElement;
  const originX = box.left + clientLeft - (isRootScroller ? 0 : scrollLeft);
  const originY = box.top + clientTop - (isRootScroller ? 0 : scrollTop);

  return {
    centerX: rect.left + rect.width / 2 - originX,
    centerY: rect.top + rect.height / 2 - originY,
    width: rect.width,
    height: rect.height,
    contentWidth: scrollWidth,
    contentHeight: scrollHeight,
  };
}

/**
 * Bound `transform` so the transformed card stays inside the scroll
 * container's content box. Pass-through when either argument is null.
 *
 * This is what stops horizontal auto-scroll from running away (#373). The card
 * is rendered IN FLOW (there is no `DragOverlay`), so a transform that carries
 * it past the content edge extends the container's `scrollWidth`; dnd-kit's
 * auto-scroll then chases the edge it just created, which moves the card
 * further out, which extends the edge again — measured at 8910px of `scrollLeft`
 * against a real maximum of 597. Clamping the APPLIED transform breaks the loop
 * at its source: `scrollWidth` never changes, so `scrollLeft` plateaus at the
 * real maximum and the last column becomes reachable.
 *
 * It has to happen here, where the transform is written to the DOM — a
 * `DndContext` modifier is not enough, because dnd-kit computes
 * `scrollAdjustedTranslate = modifiedTranslate + scrollAdjustment` and adds the
 * scroll adjustment AFTER modifiers run (same reason `DataTable` clamps
 * `event.delta` rather than only its modifier — see `useColumnDragShift`).
 *
 * `scaleX` / `scaleY` are honoured because dnd-kit scales the drag source to
 * the `over` rect; the scaled half-extent, not the layout half-extent, is what
 * reaches the edge.
 *
 * @internal exported for unit tests; not part of the public API.
 */
export function clampKanbanTransform(
  transform: Transform | null,
  bounds: KanbanDragBounds | null,
): Transform | null {
  if (!transform || !bounds) return transform;
  const halfWidth = (bounds.width * transform.scaleX) / 2;
  const halfHeight = (bounds.height * transform.scaleY) / 2;
  return {
    ...transform,
    x: clamp(
      transform.x,
      halfWidth - bounds.centerX,
      bounds.contentWidth - halfWidth - bounds.centerX,
    ),
    y: clamp(
      transform.y,
      halfHeight - bounds.centerY,
      bounds.contentHeight - halfHeight - bounds.centerY,
    ),
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
 *
 * @remarks
 * Drag announcements name the card by its rendered text. Pass `aria-label` to
 * override that — worth doing when the card renders a lot besides its title
 * (assignee, due date, badges), since all of it otherwise gets read out.
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { id, className, children, ...rest },
  ref,
) {
  // Announcement label: the consumer's `aria-label`, else the card's RENDERED
  // text (so a closed menu inside the card contributes nothing — see
  // `dragLabelOf`). The same ref is the drag-bounds node ref below.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragLabel = rest['aria-label'];
  const dragData = useMemo(() => ({ dragLabel, dragNode: cardRef }), [dragLabel]);

  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
    index,
    items,
  } = useSortable({ id, data: dragData });

  const hasHandle = useMemo(() => containsHandle(children), [children]);

  const ctxValue = useMemo<SortableItemContextValue>(
    () => ({ listeners, attributes, setActivatorNodeRef }),
    [listeners, attributes, setActivatorNodeRef],
  );

  // Travel available to the dragged card, in its scroll container's content
  // space (#373). Re-measured only when the card's LAYOUT position can have
  // changed, which is never a plain pointer move — while the card only
  // translates, its layout position and the content size are both constant, so
  // measuring per move would force a full layout per move for no gain. It
  // changes in exactly two ways:
  //  - a live re-seat WITHIN a column (`index` / `items` change, same parent —
  //    React moves the node), and
  //  - a live re-seat ACROSS columns, where `KanbanRoot` re-parents the card
  //    into another `KanbanColumnItemsContext` subtree. That is a remount, not
  //    a move: this component gets a fresh instance with `boundsRef` back to
  //    null, so its FIRST render clamps against nothing at all.
  //
  // The write-back below exists for that first render. Measuring alone can't
  // fix it: React's mutation phase writes the frame's transform BEFORE refs
  // attach and layout effects run, so by then the unbounded value is already on
  // the node and nothing re-reads `boundsRef` until the next render. Only
  // writing the bounded value back changes what that frame paints, and a layout
  // effect does it pre-paint. `transform` is deliberately NOT a dependency —
  // this effect runs only on the renders that (re)measure, and on those the
  // closed-over `transform` is exactly the one just committed.
  //
  // Be clear about what it is: on today's dnd-kit it is a NO-OP, not a fix.
  // `transform` is null on precisely these frames — a re-seat mutates the
  // SortableContext items, so `itemsHaveChanged` forces `displaceItem` false;
  // and on a transit `over` is the column, so `overIndex` is -1 and it's false
  // again. A null transform short-circuits every guard below, so nothing is
  // written. Matching that, the frame could not be made to inflate
  // `scrollWidth` in the browser: 635 rAF-sampled frames over 14 transits at
  // max scroll with the pointer held outside the board, write-back disabled,
  // yielded a single distinct `scrollWidth`.
  //
  // It is kept as insurance against exactly that internal changing. If a
  // dnd-kit bump ever emits a non-null transform on a re-seat frame, deleting
  // these lines silently reinstates the runaway — and no test can catch it,
  // because jsdom lays nothing out, so the clamp's only evidence is a manual
  // browser drag. Two inert guarded lines against a hand-only regression.
  const boundsRef = useRef<KanbanDragBounds | null>(null);
  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!isDragging || !node) {
      boundsRef.current = null;
      return;
    }
    boundsRef.current = measureKanbanDragBounds(node);
    const bounded = CSS.Transform.toString(clampKanbanTransform(transform, boundsRef.current));
    if (bounded) node.style.transform = bounded;
  }, [isDragging, index, items]);

  const setRef = (node: HTMLDivElement | null) => {
    cardRef.current = node;
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
        // Reading the ref during render is deliberate: the bound is written by
        // the layout effect above and must be applied on the very next pointer
        // move, without a re-render of its own.
        style={{
          transform: CSS.Transform.toString(clampKanbanTransform(transform, boundsRef.current)),
          transition,
        }}
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
 *
 * @remarks
 * Name the column — `aria-label` with its visible heading, or `aria-labelledby`
 * pointing at that heading's element. Either one names the column in the drag
 * announcements a screen reader hears ("…position 2 of 3 in Qualified");
 * without one they fall back to "column 2 of 3". Because a name is only useful
 * if the element it sits on has a role, a named column renders as
 * `role="group"`.
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
    <div
      ref={setRef}
      className={clsx(styles.column, className)}
      {...rest}
      // A name on a role-less <div> is inert, so a labelled column gets a role
      // to hang it on. AFTER {...rest} — but only when the consumer didn't
      // already pick a role — so labelling can't silently do nothing.
      {...((rest['aria-label'] || rest['aria-labelledby']) && rest.role == null
        ? { role: 'group' }
        : {})}
    >
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
 * release, because both are read off the same `over`. Two documented
 * exceptions follow below; absent those, they cannot drift. `verticalListSortingStrategy` renders a column as
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
 *   deviation from "commit === preview": `over` is the column, so the strategy
 *   displaces nothing and previews the card at whatever slot it currently
 *   occupies (its original one, or — if it visited another column and came
 *   back — wherever the return seated it, which can be several slots off).
 *   The commit appends anyway: snapping a dragged-to-the-bottom card back up
 *   reads as a dropped drag.
 * - Release without moving (cursor never left the card's own slot) or Escape
 *   → snap back; `onMove` does NOT fire.
 * - Release with the pointer outside the board → same cancel + snap back, no
 *   `onMove` (#387). "Outside" is measured against the columns' collective
 *   bounding box, not each column's own rect: releasing in the gutter between
 *   two columns commits to whichever is nearer, because that is plainly what
 *   the user meant. Only leaving the band of columns altogether cancels.
 *   Note the drop target is decided by the POINTER, while the card itself is
 *   clamped to the board (see below) — so a released card that appears to be
 *   parked on the last column has still cancelled if the cursor was past it.
 *
 * @remarks Auto-scroll and drag bounds
 * The board is its own horizontal scroll container, so a board wider than its
 * viewport auto-scrolls while a card is dragged near either edge — that is how
 * an off-screen column is reached. The dragged card is confined to the board's
 * scrollable content box (both axes): it stops at the outer edge of the first
 * and last column instead of following the cursor out of the board. That bound
 * is load-bearing, not cosmetic. The card is rendered IN FLOW (there is no
 * `DragOverlay`), so a card carried past the content edge would extend the
 * board's own `scrollWidth`, and auto-scroll would chase the edge it had just
 * created — measured at 8910px of `scrollLeft` after 4s against a real maximum
 * of 597, with the last column permanently out of reach (#373). With the bound
 * in place `scrollWidth` is constant for the whole drag and `scrollLeft`
 * plateaus at the real maximum. The same applies vertically at the bottom of a
 * long column.
 *
 * The bound is the card's NEAREST scrolling ancestor, which is the board unless
 * you make something inside it scroll. Capping a column (`overflow-y: auto` +
 * `max-height` on `<Kanban.Column>`, a common way to keep a long column from
 * stretching the board) hands that role to the column, and the dragged card is
 * then confined to its own column — it will not visibly cross into a
 * neighbouring one, though the drop still lands wherever the cursor is. Scroll
 * the board, not the columns, if you want the card to travel with the cursor.
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

  // Was the pointer outside every column the last time a drop target was
  // resolved? `DragEndEvent` carries no pointer position — only `delta`, which
  // is `translate - nodeRectDelta + scrollAdjustment` and so drifts from the
  // real pointer by however far the board auto-scrolled and however far a live
  // re-seat moved the card. Collision detection, on the other hand, is handed
  // dnd-kit's own `pointerCoordinates` alongside the very rects `over` was
  // ranked from, so answering the question there and remembering the answer
  // makes the cancel decision agree with `over` by construction (#387).
  //
  // Written during render (collision detection runs in `DndContext`'s render);
  // that is safe because it is a pure function of the arguments, so a double
  // render under StrictMode writes the same value.
  const outsideBoardRef = useRef(false);
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const isOutsideBoard = isPointerOutsideContainers(args);
    outsideBoardRef.current = isOutsideBoard;
    // Force an `over` transition to null at the board boundary. dnd-kit's
    // announcement callback only runs when `over.id` changes, so retaining the
    // nearest collision here would leave screen readers naming a stale column.
    if (isOutsideBoard) return [];
    return containerAwareClosestCorners(args);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      outsideBoardRef.current = false;
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
        //
        // The `isBelow` +1 rarely survives to the commit: the strategy
        // immediately re-renders the card at `overIndex` and dragEnd commits
        // from `over`, so both sides of the +1 produce the same drop. It still
        // decides the seeded slot the frame after transit (while dnd-kit has
        // transforms disabled to re-measure), and dragEnd's fallbacks — `over`
        // resolving to the column or to the dragged card itself — commit that
        // seeded slot verbatim. Keep it; without it the card visibly jumps a
        // slot on entry.
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

      // Two ways a drag ends in nothing, and `over` only reports the first:
      //  - `over == null` — collision detection returned nothing at all, i.e.
      //    no droppable was measured.
      //  - the pointer left the board. `containerAwareClosestCorners` falls
      //    back to `closestCorners`, which ranks every measured droppable and
      //    rejects none, so `over` still names the nearest column after a
      //    release over unrelated page content — a column the user never aimed
      //    at and never saw highlighted. Committing it silently reassigns the
      //    card's column (#387), so the pointer test decides instead.
      // Both snap the card back: dropping `liveItems` re-renders every column
      // from the consumer's untouched state, and no `onMove` fires.
      if (!over || outsideBoardRef.current) {
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
  // Screen-reader announcements (Hard rule 9, #390)
  // ------------------------------------------------------------------
  // Names a card by its own text and a column by the `aria-label` the consumer
  // put on `<Kanban.Column>` (falling back to its board position), so a drag
  // says "Acme — 40 seats, position 2 of 3 in Qualified" rather than dnd-kit's
  // "deal-1 was moved over droppable area col-2". Slots are read from
  // `effectiveItems` — the order the user is actually looking at mid-drag.
  const columnLabel = (colId: string | number): string =>
    containerName(columnElements.get(colId)?.props ?? {}) ??
    t('kanban.unnamedColumn', {
      index: columnOrder.indexOf(colId) + 1,
      total: columnOrder.length,
    });
  const describeDrag: DescribeDragTarget = (entry, activeId) => {
    if (!entry) return null;
    const id = entry.id as string | number;
    const isColumn = effectiveItems.has(id);
    const colId = isColumn ? id : findContainer(id, effectiveItems);
    if (colId == null) return null;
    const cards = effectiveItems.get(colId) ?? [];
    const label = dragLabelOf(entry.data.current);
    const container = columnLabel(colId);
    if (!isColumn) return { label, index: cards.indexOf(id) + 1, total: cards.length, container };
    // `over` is the column itself (empty column, or the padding below the
    // cards). If the dragged card has already been live-seated here it keeps
    // its slot; otherwise it would be appended, so count it as one more.
    const seated = cards.indexOf(activeId as string | number);
    return seated >= 0
      ? { label, index: seated + 1, total: cards.length, container }
      : { label, index: cards.length + 1, total: cards.length + 1, container };
  };
  // A release outside the board is a cancel, not a drop — `over` is non-null on
  // that path (closestCorners rejects nothing), so without this dnd-kit would
  // announce a drop that handleDragEnd deliberately threw away (#387).
  const accessibility = useDragAccessibility(describeDrag, () => outsideBoardRef.current);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <DndContext
      accessibility={accessibility}
      sensors={sensors}
      collisionDetection={collisionDetection}
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
