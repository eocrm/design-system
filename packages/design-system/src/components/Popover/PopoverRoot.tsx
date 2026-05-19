import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { PopoverContext, type PopoverContextValue } from './context';
import { sanitizeId } from '../_internal/refs';

export interface PopoverProps {
  /**
   * Must contain exactly one `<Popover.Trigger>` and one `<Popover.Content>`.
   * `<Popover.Heading>` and `<Popover.Close>` are optional and may appear
   * anywhere inside `<Popover.Content>`.
   */
  children: ReactNode;
  /**
   * Controlled open state. Provide alongside `onOpenChange` to drive open
   * externally. Omit both to let Popover own its state (the common case).
   */
  open?: boolean;
  /** Fired whenever Popover wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
  /**
   * Reserved future hint. v1 ignores the value and always renders non-modal.
   * Will gate focus-trap + inert-background once `<Modal>` lands.
   */
  modal?: boolean;
}

/**
 * Non-modal floating panel that opens from a trigger and contains arbitrary
 * interactive content. Compound API — pair `<Trigger>`, `<Content>`,
 * optionally `<Heading>` and `<Close>`, as direct or nested children.
 *
 * Implements the WAI-ARIA non-modal dialog pattern: `role="dialog"` on
 * Content, `aria-haspopup="dialog"` on Trigger, focus moves to the panel
 * on open, Tab traverses out of the panel into the page behind, click
 * outside or Escape dismisses. Page is NOT inert. Tooltip-grade animation
 * via `@starting-style`.
 *
 * @example
 * <Popover>
 *   <Popover.Trigger>
 *     <Button variant="secondary">Filters</Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <Stack gap="sm">
 *       <Popover.Heading>Filter results</Popover.Heading>
 *       <Cluster justify="end" gap="sm">
 *         <Popover.Close>
 *           <Button variant="secondary" size="sm">Cancel</Button>
 *         </Popover.Close>
 *         <Popover.Close>
 *           <Button size="sm" onClick={apply}>Apply</Button>
 *         </Popover.Close>
 *       </Cluster>
 *     </Stack>
 *   </Popover.Content>
 * </Popover>
 *
 * @example
 * // Controlled (rare — usually let Popover manage state):
 * const [open, setOpen] = useState(false);
 * <Popover open={open} onOpenChange={setOpen}>…</Popover>
 *
 * @remarks When NOT to use
 * - For a passive hint on hover/focus → use `<Tooltip>`.
 * - For a list of actions → use `<DropdownMenu>`.
 * - For a focus-locked confirmation that demands full attention → use
 *   `<Modal>` (not yet shipped) once available; until then, `<Popover>`
 *   with explicit Confirm/Cancel buttons is acceptable.
 *
 * @remarks Anti-patterns
 * - ❌ `<Popover.Trigger><Button disabled>…</Button></Popover.Trigger>` —
 *   disabled buttons do not fire click. Use `aria-disabled="true"` +
 *   intercept the click, or wrap in `<span>`.
 * - ❌ `<Popover.Content>` with no `<Popover.Close>` button AND content
 *   that isn't obviously dismissable by clicking outside — keyboard /
 *   screen-reader users get no clear close affordance. Add `<Popover.Close>`
 *   or rely on outside-click only when the popover is small and obvious.
 * - ❌ Multiple `<Popover.Heading>` instances inside one `<Popover.Content>`
 *   — second mount overwrites `aria-labelledby`. Use one Heading per Popover.
 */
export function PopoverRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  modal: _modal = false,
}: PopoverProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setUncontrolled(next);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const contentId = `popover-${sanitizeId(reactId)}`;
  const [headingId, setHeadingId] = useState<string | null>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen]);

  const value: PopoverContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    contentId,
    headingId,
    setHeadingId,
    closeAll,
  };

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}
