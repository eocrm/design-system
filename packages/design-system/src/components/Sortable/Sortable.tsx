import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
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

export interface SortableProps extends HTMLAttributes<HTMLOListElement> {
  /**
   * Fires after a drag or keyboard move with the new position. Consumer
   * holds the items array and re-renders with the new order.
   *
   * Not fired if the drop position equals the source position (no-op).
   */
  onReorder?: (event: SortableReorderEvent) => void;
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

interface SortableItemContextValue {
  listeners: ReturnType<typeof useSortable>['listeners'];
  attributes: ReturnType<typeof useSortable>['attributes'];
  setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef'];
}

const SortableItemContext = createContext<SortableItemContextValue | null>(null);

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
  { onReorder, className, children, ...rest },
  ref,
) {
  const itemIds = useMemo(() => {
    const ids: (string | number)[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === SortableItem) {
        ids.push((child.props as SortableItemProps).id);
      }
    });
    return ids;
  }, [children]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = itemIds.indexOf(active.id as string | number);
    const to = itemIds.indexOf(over.id as string | number);
    if (from < 0 || to < 0) return;
    onReorder?.({ from, to, id: active.id as string | number });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ol ref={ref} className={clsx(styles.list, className)} {...rest}>
          {children}
        </ol>
      </SortableContext>
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
