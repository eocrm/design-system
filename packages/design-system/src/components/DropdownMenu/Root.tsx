import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DropdownMenuContext, type DropdownMenuContextValue, type RegisteredItem } from './context';
import { sanitizeId } from '../_internal/refs';
import { useFloatingSurface, useInOverlay } from '../_internal/overlay';

export interface DropdownMenuProps {
  /** Must contain exactly one `<DropdownMenu.Trigger>` and one `<DropdownMenu.Content>`. */
  children: ReactNode;
  /**
   * Controlled open state. Provide alongside `onOpenChange` to drive open
   * externally. Omit both to let DropdownMenu own its own state (the common
   * case).
   */
  open?: boolean;
  /** Fired whenever DropdownMenu wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

/**
 * Action menu that opens from a trigger button. Compound API — pair `<Trigger>`,
 * `<Content>`, `<Item>`, and `<Separator>` as direct (or nested) children.
 * Implements the WAI-ARIA menu pattern: roving tabindex inside Content,
 * Arrow/Home/End nav, typeahead, Enter/Space to activate, Escape/Tab to
 * dismiss. Content portals to `document.body` and positions itself relative
 * to the trigger via Floating UI (auto-flip, viewport-aware).
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>
 *     <Button variant="secondary">Actions</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content align="end">
 *     <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">Duplicate</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item onSelect={remove} tone="danger">Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 *
 * @example
 * // Table row kebab — minimal trigger via the ghost variant:
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>
 *     <Button variant="ghost" aria-label="Row actions">⋯</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content align="end">
 *     <DropdownMenu.Item onSelect={() => view(row)}>View</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={() => archive(row)}>Archive</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 *
 * @example
 * // Controlled open (rare — usually let DropdownMenu manage state):
 * const [open, setOpen] = useState(false);
 * <DropdownMenu open={open} onOpenChange={setOpen}>...</DropdownMenu>
 *
 * @remarks When NOT to use
 * - For form value selection ("pick a status", "pick a country") → use
 *   `<Select>` (not yet shipped) so the value lives in form state.
 * - For an always-visible row of actions → use a `<Cluster>` of Buttons in
 *   a toolbar. Menus are for actions that don't deserve permanent screen real
 *   estate.
 * - For navigation between pages → use the sidebar or a `<Link>` (not yet
 *   shipped). Menu items are for *actions*, not page transitions.
 *
 * @remarks Anti-patterns
 * - ❌ Multiple `<DropdownMenu.Trigger>` inside one `<DropdownMenu>`. Use one
 *   DropdownMenu per trigger.
 * - ❌ Trigger child that doesn't accept a ref. The cloneElement contract
 *   needs `forwardRef` on the trigger element. `<Button>` qualifies; a raw
 *   `<button>` qualifies; a custom component that doesn't forward refs does
 *   not.
 * - ❌ `tone="danger"` for non-destructive actions like "Filter" or "Sort".
 *   Reserve danger for irreversible destructive operations.
 * - ❌ Nesting a full `<DropdownMenu>` root inside another DropdownMenu.
 *   Use `<DropdownMenu.Sub>` for nested menus — see the Sub component's
 *   JSDoc for the canonical pattern.
 */
export function DropdownMenuRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DropdownMenuProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setUncontrolledOpen(next);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const inOverlay = useInOverlay(triggerRef, open);
  // #274: hosts yield Escape while the menu (any level) is open — the
  // menu's own capture listeners peel one level per press instead.
  useFloatingSurface(open);
  const reactId = useId();
  const contentId = `dropdown-menu-${sanitizeId(reactId)}`;

  const [openIntent, setOpenIntent] = useState<'first' | 'last' | null>(null);

  const itemsRef = useRef<RegisteredItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const registerItem = useCallback((item: RegisteredItem) => {
    if (!itemsRef.current.some((x) => x.id === item.id)) {
      itemsRef.current.push(item);
    }
    return () => {
      itemsRef.current = itemsRef.current.filter((x) => x.id !== item.id);
    };
  }, []);

  // Reset registry indicator when menu closes. The registry array itself is
  // cleared by item unmount cleanups.
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    }
  }, [open]);

  const closeAll = useCallback(() => {
    setOpen(false);
    // preventScroll: focus() on the trigger after close shouldn't trigger
    // browser auto-scroll if the page happens to be scrolled (trigger is
    // already visible since the user just interacted with it).
    triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen]);

  const value: DropdownMenuContextValue = {
    open,
    setOpen,
    triggerRef,
    contentId,
    openIntent,
    setOpenIntent,
    registerItem,
    itemsRef,
    activeIndex,
    setActiveIndex,
    closeAll,
    depth: 0,
    inOverlay,
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}
