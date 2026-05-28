import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import { useRail } from './Rail';
import styles from './Rail.module.scss';

/** Open-delay for hover-intent before opening the collapsed-mode flyout. */
const OPEN_DELAY_MS = 80;
/** Close-grace so the cursor has time to traverse from trigger to flyout. */
const CLOSE_GRACE_MS = 200;

export interface RailGroupProps {
  /**
   * Required leading icon — the only thing visible when the rail is collapsed.
   * Groups always have an icon; subitems don't need one.
   */
  icon: ReactNode;
  /**
   * Group label — visible next to the icon when the rail is expanded, and
   * rendered as the flyout's header when collapsed.
   */
  label: string;
  /**
   * Controlled inline-expand state (only meaningful when the rail itself is
   * expanded — collapsed-mode uses hover-driven popover state instead).
   * Provide alongside `onOpenChange` to drive open state externally.
   */
  open?: boolean;
  /** Initial open state for the uncontrolled case. Default `false`. */
  defaultOpen?: boolean;
  /** Fires whenever the inline-expand toggles. */
  onOpenChange?: (open: boolean) => void;
  /** Subitems — typically a list of `<Rail.Item>` without icons. */
  children: ReactNode;
  /** Forwarded to the group's outermost `<div>` wrapper. */
  className?: string;
}

/**
 * Two-state navigation parent. When the surrounding `<Rail>` is **expanded**,
 * the group renders icon + label + chevron; clicking toggles a list of
 * subitems that drop down inline below the group button. When the rail is
 * **collapsed**, only the icon is visible — hovering it opens a popover
 * anchored to the right of the rail containing the group label as a header
 * and the subitems as a vertical list.
 *
 * **Auto-open**: on mount, if any subitem already has `aria-current="page"`
 * (i.e. the consumer is deep-linked into a subroute), the group defaults to
 * open so the active item is visible. This is uncontrolled-only and one-
 * shot — subsequent navigations don't force the group open. Consumers
 * wanting exact sync can pass a controlled `open` prop.
 *
 * **Hover-intent timing**: the flyout opens after a small 80ms delay to
 * avoid flicker during cursor traversal, and stays open for a 200ms grace
 * period after the cursor leaves so the user has time to move into the
 * panel. Re-entering the trigger or the flyout cancels the pending close.
 *
 * @example
 * <Rail.Section title="Operations">
 *   <Rail.Group icon={<Settings />} label="Settings">
 *     <Rail.Item as={NavLink} to="/settings/general">General</Rail.Item>
 *     <Rail.Item as={NavLink} to="/settings/security">Security</Rail.Item>
 *     <Rail.Item as={NavLink} to="/settings/billing">Billing</Rail.Item>
 *   </Rail.Group>
 * </Rail.Section>
 *
 * @remarks Anti-patterns
 * - ❌ Nesting `<Rail.Group>` inside another `<Rail.Group>`. v1 supports
 *   only one level — subitems must be leaves.
 * - ❌ Putting non-`<Rail.Item>` children inside a group. Subitems should
 *   match the item shape so the active-state cascade reaches them.
 */
export const RailGroup = forwardRef<HTMLDivElement, RailGroupProps>(function RailGroup(
  {
    icon,
    label,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    children,
    className,
  },
  forwardedRef,
) {
  const { collapsed } = useRail();

  // ─── Inline expand state (used when rail is expanded) ─────────────────
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

  const toggleOpen = useCallback(() => setOpen(!open), [open, setOpen]);

  // ─── Auto-open when a subitem is active ──────────────────────────────
  const groupRef = useRef<HTMLDivElement | null>(null);
  // One-shot guard so we don't re-open the group every render after the
  // consumer manually closed it. Uncontrolled-only by design.
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (isControlled) return;
    if (autoOpenedRef.current) return;
    if (!groupRef.current) return;
    if (uncontrolledOpen) {
      autoOpenedRef.current = true;
      return;
    }
    if (groupRef.current.querySelector('[aria-current="page"]')) {
      autoOpenedRef.current = true;
      setUncontrolledOpen(true);
    }
  }, [isControlled, uncontrolledOpen]);

  // ─── Hover-driven popover state (used when rail is collapsed) ────────
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearCloseTimer();
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      setPopoverOpen(true);
    }, OPEN_DELAY_MS);
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setPopoverOpen(false);
    }, CLOSE_GRACE_MS);
  }, [clearCloseTimer, clearOpenTimer]);

  // Cleanup any pending timers on unmount so React doesn't warn about state
  // updates on an unmounted component (and so navigations that swap routes
  // don't leak setTimeouts onto the dead component).
  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, [clearOpenTimer, clearCloseTimer]);

  // Reset popover state whenever the rail's collapsed flag flips. When the
  // rail expands while a flyout was open, the flyout would visually overlap
  // the now-inline subitems — close it eagerly.
  useEffect(() => {
    if (!collapsed) {
      clearOpenTimer();
      clearCloseTimer();
      setPopoverOpen(false);
    }
  }, [collapsed, clearOpenTimer, clearCloseTimer]);

  // ─── Floating UI for the collapsed-mode flyout ────────────────────────
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const placement: Placement = 'right-start';
  const { refs, floatingStyles } = useFloating({
    open: popoverOpen,
    placement,
    transform: false,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: triggerRef.current },
  });

  // Close on Escape (a11y).
  useEffect(() => {
    if (!popoverOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearOpenTimer();
        clearCloseTimer();
        setPopoverOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [popoverOpen, clearOpenTimer, clearCloseTimer]);

  // Close eagerly on outside-click — the popover is hover-driven but a click
  // anywhere outside the trigger or panel should still dismiss it (matching
  // the standard floater dismissal pattern).
  useEffect(() => {
    if (!popoverOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (refs.floating.current?.contains(target)) return;
      clearOpenTimer();
      clearCloseTimer();
      setPopoverOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [popoverOpen, refs.floating, clearOpenTimer, clearCloseTimer]);

  // ─── Render ──────────────────────────────────────────────────────────
  const reactId = useId();
  const subitemsId = `rail-group-${reactId}`;

  const handleTriggerClick = useCallback(() => {
    if (collapsed) return;
    toggleOpen();
  }, [collapsed, toggleOpen]);

  const handleTriggerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      // In collapsed mode the trigger acts like a popup-haspopup button
      // (Enter / Space opens the popover); in expanded mode native button
      // semantics already cover Enter/Space toggling.
      if (collapsed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        clearCloseTimer();
        setPopoverOpen((prev) => !prev);
      }
    },
    [collapsed, clearCloseTimer],
  );

  const handlePointerEnter = useCallback(
    (_e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!collapsed) return;
      scheduleOpen();
    },
    [collapsed, scheduleOpen],
  );

  const handlePointerLeave = useCallback(
    (_e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!collapsed) return;
      scheduleClose();
    },
    [collapsed, scheduleClose],
  );

  const handleFlyoutPointerEnter = useCallback(() => {
    if (!collapsed) return;
    clearCloseTimer();
  }, [collapsed, clearCloseTimer]);

  const handleFlyoutPointerLeave = useCallback(() => {
    if (!collapsed) return;
    scheduleClose();
  }, [collapsed, scheduleClose]);

  // Clicking a subitem inside the flyout should dismiss the flyout — any
  // navigation should dismiss the floater per spec.
  const handleFlyoutClick = useCallback(() => {
    if (!collapsed) return;
    clearOpenTimer();
    clearCloseTimer();
    setPopoverOpen(false);
  }, [collapsed, clearOpenTimer, clearCloseTimer]);

  // Compose the consumer ref with our internal ref so consumers can still
  // attach refs to the group's wrapping <div>.
  const setGroupRef = (node: HTMLDivElement | null) => {
    groupRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef && 'current' in forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  };

  return (
    <div ref={setGroupRef} className={clsx(styles.group, className)}>
      <button
        ref={setTriggerRef}
        type="button"
        className={styles.groupTrigger}
        // Expanded mode: aria-expanded reflects the inline-disclosure state;
        // collapsed mode: aria-haspopup reflects the flyout (rendered as a
        // dialog-shaped panel).
        aria-expanded={collapsed ? undefined : open}
        aria-controls={collapsed ? undefined : subitemsId}
        aria-haspopup={collapsed ? 'menu' : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={collapsed ? scheduleOpen : undefined}
        onBlur={collapsed ? scheduleClose : undefined}
      >
        <span className={styles.itemIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.itemLabel}>{label}</span>
        <ChevronRight
          size={14}
          aria-hidden
          className={clsx(styles.groupChevron, open && styles.groupChevronOpen)}
        />
      </button>

      {/* Expanded-mode inline subitems. When the rail is collapsed, .subitems
          is set to display:none via the .collapsed CSS cascade — we still
          render the DOM so :has([aria-current="page"]) on the .group can
          light up the trigger even while the rail is closed. When the rail
          is expanded but the group is closed, we set hidden so the items
          don't display and aren't in the accessibility tree. */}
      <div
        id={subitemsId}
        className={styles.subitems}
        // `hidden` attribute when expanded + closed (group itself collapsed).
        // We use the boolean form, not `data-hidden`, because the spec wants
        // the items removed from layout AND from the AT tree when closed.
        // In collapsed-rail mode, CSS `display: none` on `.collapsed .subitems`
        // handles the visual hide while keeping the DOM intact for `:has`.
        hidden={!collapsed && !open}
      >
        {children}
      </div>

      {/* Collapsed-mode flyout popover. Portaled to document.body, positioned
          by Floating UI on the right of the trigger. */}
      {collapsed &&
        popoverOpen &&
        createPortal(
          <div
            ref={refs.setFloating}
            role="menu"
            aria-label={label}
            style={floatingStyles}
            className={styles.flyout}
            onPointerEnter={handleFlyoutPointerEnter}
            onPointerLeave={handleFlyoutPointerLeave}
            onClick={handleFlyoutClick}
          >
            <div className={styles.flyoutHeader}>{label}</div>
            <div className={styles.flyoutBody}>{children}</div>
          </div>,
          document.body,
        )}
    </div>
  );
});
