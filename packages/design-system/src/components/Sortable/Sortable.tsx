import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS, type Transform } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { mergeRefs } from '../_internal/refs';
import styles from './Sortable.module.scss';

/**
 * Payload fired by `onReorder` after a successful drag-drop or keyboard move.
 * Consumer applies the move via an immutable `arrayMove(items, from, to)`
 * (3-line utility, not shipped by the library; `@dnd-kit/sortable` ships an
 * `arrayMove` consumers can import if they want).
 */
export interface SortableReorderEvent {
  from: number;
  to: number;
  id: string | number;
}

/**
 * Clamp a drag `transform` so the dragged node (`nodeRect`) stays within
 * `boundingRect`. Pure function mirroring dnd-kit's `restrictToBoundingRect`;
 * exported so the clamp math can be unit-tested without a real DOM / drag.
 *
 * `scaleX` / `scaleY` pass through untouched — only the translation is clamped.
 */
export function restrictTransformToRect(
  transform: Transform,
  nodeRect: { top: number; bottom: number; left: number; right: number },
  boundingRect: { top: number; left: number; width: number; height: number },
): Transform {
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

export interface SortableProps extends HTMLAttributes<HTMLOListElement> {
  /**
   * Fires after a drag or keyboard move with the new position. Consumer
   * holds the items array and re-renders with the new order.
   *
   * Not fired if the drop position equals the source position (no-op).
   */
  onReorder?: (event: SortableReorderEvent) => void;
  /**
   * When `true` (default), the dragged item is clamped to the list's bounding
   * box — it can't be dragged outside the `<ol>`. Set `false` for free-drag
   * (the item can be dragged anywhere on the page). For a vertical list this
   * constrains the drag vertically to the list's extent.
   */
  restrictToContainer?: boolean;
}

export interface SortableItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'id'> {
  /**
   * Stable identifier for this item. Used by dnd-kit for tracking the item
   * across reorders. String or number — typically the consumer's database id.
   */
  id: string | number;
  /** Item content — typically a `<Card>` or a row of text + icons. */
  children: ReactNode;
}

export interface SortableHandleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Decorative content — typically a grip icon (e.g. `<GripVertical size={14} />`).
   * Rendered inside the Handle's `<button>` wrapped with `aria-hidden`.
   */
  children?: ReactNode;
}

export interface SortableItemContextValue {
  listeners: ReturnType<typeof useSortable>['listeners'];
  attributes: ReturnType<typeof useSortable>['attributes'];
  setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef'];
}

export const SortableItemContext = createContext<SortableItemContextValue | null>(null);

// Inert context for the DragOverlay clone — the overlay is a static visual; its
// Handle (if any) must render without wiring real drag listeners.
const OVERLAY_ITEM_CONTEXT: SortableItemContextValue = {
  listeners: undefined,
  attributes: {} as SortableItemContextValue['attributes'],
  setActivatorNodeRef: () => {},
};

/**
 * Recursively check whether the children subtree contains a `Sortable.Handle`.
 * Used by `Sortable.Item` to decide whether to attach drag listeners to itself
 * (no Handle present) or rely on the Handle to attach them.
 *
 * **Limitation:** only walks `React.Children` and direct `props.children`.
 * If a consumer wraps `<Sortable.Handle>` inside their own custom component
 * (e.g. `<TaskRow>` whose JSX internally renders the Handle), the walk sees
 * `<TaskRow>` but not the Handle inside it — the Item is classified as
 * no-Handle and gets whole-item drag. Workaround: put `<Sortable.Handle>` at
 * the same JSX nesting level as the rest of the Item's content.
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

/**
 * Drag-to-reorder list (single column). Compound API: `Sortable`,
 * `Sortable.Item`, `Sortable.Handle`. Built on `@dnd-kit/sortable`.
 *
 * Pointer drag uses dnd-kit's `PointerSensor` with a 5px activation
 * constraint — short clicks-without-movement on internal buttons inside
 * Items still fire. Keyboard reorder uses dnd-kit's canonical Space-pickup
 * flow: Tab to focus, Space to pick up, ArrowUp/ArrowDown to move, Space
 * to drop, Escape to cancel.
 *
 * Controlled-only: consumer holds the items array, applies the move on
 * `onReorder`, re-renders with the new order. dnd-kit ships an `arrayMove`
 * utility (`import { arrayMove } from '@dnd-kit/sortable'`) consumers can
 * use, or write a 3-line equivalent.
 *
 * @example
 * // Plain text list — no handle needed; whole item is draggable.
 * import { arrayMove } from '@dnd-kit/sortable';
 * const [items, setItems] = useState([{ id: 1, label: 'Buy milk' }, ...]);
 * <Sortable
 *   onReorder={({ from, to }) => setItems((curr) => arrayMove(curr, from, to))}
 * >
 *   {items.map((item) => (
 *     <Sortable.Item key={item.id} id={item.id}>{item.label}</Sortable.Item>
 *   ))}
 * </Sortable>
 *
 * @example
 * // Card with internal DropdownMenu — explicit Handle keeps the menu clickable.
 * <Sortable onReorder={handle}>
 *   {cards.map((c) => (
 *     <Sortable.Item key={c.id} id={c.id}>
 *       <Card>
 *         <Cluster justify="between">
 *           <Sortable.Handle aria-label={`Reorder ${c.title}`}>
 *             <GripVertical size={14} />
 *           </Sortable.Handle>
 *           <Title order={3}>{c.title}</Title>
 *           <DropdownMenu>...</DropdownMenu>
 *         </Cluster>
 *       </Card>
 *     </Sortable.Item>
 *   ))}
 * </Sortable>
 *
 * @remarks Drag confinement
 * - By default (`restrictToContainer`) the dragged item is clamped to the
 *   list's bounding box and can't be dragged off over unrelated UI. Pass
 *   `restrictToContainer={false}` for free-drag if you genuinely want the item
 *   to follow the cursor anywhere on the page.
 *
 * @remarks When NOT to use
 * - Tabular data — use `<Table>` / `<DataTable>` (DataTable already uses
 *   dnd-kit for column reorder).
 * - Static lists that never reorder — use `<Stack>` or `<DefinitionList>`.
 * - Cross-list drag (move between columns) — out of scope for v1; lands
 *   with the future `<Kanban>` primitive.
 *
 * @remarks Anti-patterns
 * - ❌ Relying on the no-Handle whole-item drag for screen-reader users.
 *   When no Handle is present, dnd-kit applies `role="button"` and
 *   `aria-roledescription="sortable"` to the `<li>`, which clobbers the
 *   default `listitem` role. Screen readers stop announcing "item N of M".
 *   dnd-kit's live-region announcements partially compensate during drag,
 *   but for accessible lists ALWAYS include a `<Sortable.Handle>` — that
 *   moves the button semantics onto the Handle and leaves the `<li>` as a
 *   proper listitem.
 * - ❌ Mutating items in place inside `onReorder`. Always return a new
 *   array (immutable `arrayMove`) — React needs a fresh reference to
 *   re-render.
 * - ❌ Using a non-stable `id` (e.g. array index). The id must persist
 *   across reorders so React reconciles correctly during drag.
 * - ❌ Wrapping non-`Sortable.Item` content inside `<Sortable>`. dnd-kit's
 *   `SortableContext` only tracks the ids you pass it; arbitrary children
 *   render but won't be reorderable.
 */
const SortableRoot = forwardRef<HTMLOListElement, SortableProps>(function SortableRoot(
  { onReorder, restrictToContainer = true, className, children, ...rest },
  ref,
) {
  const [activeId, setActiveId] = useState<string | number | null>(null);
  // Internal handle on the <ol> so the restrict modifier can read the live
  // list rect, independent of whether the consumer forwards a ref.
  const olRef = useRef<HTMLOListElement | null>(null);

  const itemIds = useMemo(() => {
    const ids: (string | number)[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === SortableItem) {
        ids.push((child.props as SortableItemProps).id);
      }
    });
    return ids;
  }, [children]);

  // The active item's content, rendered into the DragOverlay clone. Looking it
  // up by id (rather than capturing a snapshot on drag-start) keeps the overlay
  // in sync if the consumer's item content re-renders mid-drag.
  const activeChildren = useMemo<ReactNode>(() => {
    if (activeId == null) return null;
    let content: ReactNode = null;
    Children.forEach(children, (child) => {
      if (
        isValidElement(child) &&
        child.type === SortableItem &&
        (child.props as SortableItemProps).id === activeId
      ) {
        content = (child.props as SortableItemProps).children;
      }
    });
    return content;
  }, [activeId, children]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string | number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = itemIds.indexOf(active.id as string | number);
    const to = itemIds.indexOf(over.id as string | number);
    if (from < 0 || to < 0) return;
    onReorder?.({ from, to, id: active.id as string | number });
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // SSR-safe reduced-motion probe; disables the overlay's drop animation.
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Modifier that confines the drag transform to the live <ol> bounding box.
  // A modifier is a pure `(args) => Transform`; we read the list rect from the
  // internal ref rather than dnd-kit's `containerNodeRect` (which is unreliable
  // through the DragOverlay portal). Memoized once — it closes over the ref,
  // so it always sees the current node.
  const restrictModifier = useMemo<Modifier>(
    () =>
      ({ transform, draggingNodeRect }) => {
        const container = olRef.current?.getBoundingClientRect();
        if (!draggingNodeRect || !container) return transform;
        return restrictTransformToRect(transform, draggingNodeRect, container);
      },
    [],
  );
  const modifiers = restrictToContainer ? [restrictModifier] : undefined;

  return (
    <DndContext
      sensors={sensors}
      modifiers={modifiers}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ol ref={mergeRefs(olRef, ref)} className={clsx(styles.list, className)} {...rest}>
          {children}
        </ol>
      </SortableContext>
      {/* The dragged item lives in a portaled, fixed-position overlay that owns
          the drag + drop animation. The list <li> becomes an invisible
          placeholder during drag, so a late/async order update from onReorder
          can never leave a stale dnd-kit transform on a list <li> (#165). The
          overlay is the *visible* drag, so it must carry the restrict modifier
          too — DndContext alone constrains the underlying item transform. */}
      <DragOverlay modifiers={modifiers} dropAnimation={prefersReducedMotion ? null : undefined}>
        {activeChildren != null ? (
          <SortableItemContext.Provider value={OVERLAY_ITEM_CONTEXT}>
            <div className={clsx(styles.item, styles.overlayItem)} data-dragging="true">
              {activeChildren}
            </div>
          </SortableItemContext.Provider>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
SortableRoot.displayName = 'Sortable';

/**
 * One reorderable item in a `<Sortable>`. Renders an `<li>` with the
 * consumer's children. Must have a stable `id` prop (`string | number`).
 *
 * If the children subtree contains a `<Sortable.Handle>`, only the Handle
 * initiates drag. Otherwise the whole Item is draggable (and focusable for
 * keyboard reorder).
 */
export const SortableItem = forwardRef<HTMLLIElement, SortableItemProps>(function SortableItem(
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

  const setRef = (node: HTMLLIElement | null) => {
    setNodeRef(node);
    // When no Handle is present, the Item itself is the drag activator —
    // dnd-kit uses this ref to scope keyboard / pointer events.
    if (!hasHandle) setActivatorNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <SortableItemContext.Provider value={ctxValue}>
      <li
        ref={setRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          // The DragOverlay renders the dragged item's visual; the in-list copy
          // is an invisible placeholder so it never carries a stale drag/drop
          // transform when onReorder commits the new order asynchronously (#165).
          opacity: isDragging ? 0 : undefined,
        }}
        data-dragging={isDragging ? 'true' : undefined}
        className={clsx(styles.item, className)}
        // Listeners + attributes go on the Item only when no Handle is present.
        // When a Handle exists, the Handle attaches them via context.
        // dnd-kit drag attrs spread BEFORE {...rest} on Item (consumer rest wins).
        // The Handle does the inverse: drag attrs after rest so they cannot be
        // disabled. Item is more permissive — consumer may legitimately want to
        // pre-empt drag on a per-item basis.
        {...(hasHandle ? {} : listeners)}
        {...(hasHandle ? {} : attributes)}
        {...rest}
      >
        {children}
      </li>
    </SortableItemContext.Provider>
  );
});
SortableItem.displayName = 'SortableItem';

/**
 * Optional drag-origin marker inside a `<Sortable.Item>`. When present,
 * only the Handle initiates drag. The Handle is a `<button>` so it's
 * keyboard-focusable; consumer's children render inside as decorative
 * content (`aria-hidden`).
 */
export const SortableHandle = forwardRef<HTMLButtonElement, SortableHandleProps>(
  function SortableHandle({ className, children, 'aria-label': ariaLabel, ...rest }, ref) {
    const ctx = useContext(SortableItemContext);
    if (!ctx) {
      throw new Error('<Sortable.Handle> must be rendered inside a <Sortable.Item>.');
    }

    const setRef = (node: HTMLButtonElement | null) => {
      ctx.setActivatorNodeRef(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <button
        ref={setRef}
        type="button"
        aria-label={ariaLabel ?? 'Reorder item'}
        className={clsx(styles.handle, className)}
        {...rest}
        // {...listeners} + {...attributes} AFTER {...rest} so consumer spread
        // cannot disable drag detection. data-sortable-handle is a structural
        // marker for tests / styling.
        data-sortable-handle="true"
        {...ctx.listeners}
        {...ctx.attributes}
      >
        <span aria-hidden="true">{children}</span>
      </button>
    );
  },
);
SortableHandle.displayName = 'SortableHandle';

export const Sortable = Object.assign(SortableRoot, {
  Item: SortableItem,
  Handle: SortableHandle,
});
