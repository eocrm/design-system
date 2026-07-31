import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ElementType,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
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
import { useTranslation } from '../../i18n';
import { useRail } from './Rail';
import { type PolymorphicProps } from './RailItem';
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
import styles from './Rail.module.scss';

/**
 * Runs the consumer's handler, then ours. Used only for the handlers that
 * drive the collapsed-mode flyout on a linkable group — see the comment at
 * the call site for why those five can't simply lose to `{...rest}`. Ours runs
 * unconditionally: opening a flyout is not a cancellable default, so a
 * consumer's `preventDefault()` must not strand the subitems.
 */
function composeHandlers<E>(
  theirs: ((e: E) => void) | undefined,
  ours: ((e: E) => void) | undefined,
) {
  return (e: E) => {
    theirs?.(e);
    ours?.(e);
  };
}

/** Open-delay for hover-intent before opening the collapsed-mode flyout. */
const OPEN_DELAY_MS = 80;
/** Close-grace so the cursor has time to traverse from trigger to flyout. */
const CLOSE_GRACE_MS = 200;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface RailGroupOwnProps {
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
}

/**
 * Public prop type. Generic `C` defaults to `'div'` — the wrapping element the
 * group has always rendered, so **omitting `as` is exactly today's API**: the
 * group is toggle-only and the remaining props land on the wrapper `<div>`.
 *
 * Passing `as` (e.g. `as={NavLink}`) opts into the **linkable** shape: the
 * icon + label become a navigable element of that type with all of its props
 * available (`to`, `replace`, `end`, …), the chevron becomes its own button,
 * and the remaining props land on the rendered link rather than the wrapper —
 * except `className` and `ref`, which stay on the wrapper `<div>` in both
 * shapes, as they always have.
 *
 * Your `onPointerEnter` / `onPointerLeave` / `onFocus` / `onBlur` / `onClick` / `onKeyDown`
 * on a linkable group are **composed** with the group's own handlers (yours
 * runs first), not replaced by them: those six are what open the
 * collapsed-mode flyout, and overriding them would make the subitems
 * unreachable while the rail is collapsed.
 */
export type RailGroupProps<C extends ElementType = 'div'> = PolymorphicProps<C, RailGroupOwnProps>;

/**
 * Internal generic-preserving signature. React's `forwardRef` strips the
 * generic from the returned component, so we re-attach it via the cast below.
 * Unlike `<Rail.Item>`, the ref type is fixed to the wrapper `<div>` — that is
 * the element the group has always forwarded to, linkable or not.
 */
type RailGroupComponent = <C extends ElementType = 'div'>(
  props: RailGroupProps<C> & { ref?: ForwardedRef<HTMLDivElement> },
) => ReactElement | null;

/**
 * Implementation-side props. The generic lives only on the exported
 * `RailGroupComponent` signature — inlining it on the `forwardRef` render
 * function would force `C` to widen to the whole `ElementType` union, which
 * collapses the intersection and drops the required `icon` / `label` /
 * `children`. `<Rail.Item>` works around that by making its own props
 * optional; keeping the required ones is worth this extra type instead.
 */
type RailGroupImplProps = RailGroupOwnProps & {
  as?: ElementType;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

/**
 * Two-state navigation parent. When the surrounding `<Rail>` is **expanded**,
 * the group renders icon + label + chevron; clicking toggles a list of
 * subitems that drop down inline below the group button. When the rail is
 * **collapsed**, only the icon is visible — hovering it opens a popover
 * anchored to the right of the rail containing the group label as a header
 * and the subitems as a vertical list.
 *
 * **Linkable groups** (`as`): pass `as={NavLink}` (or any routing primitive)
 * plus its props and the row splits into two hit-targets — the icon + label
 * navigate, and a separate chevron `<button>` owns the expand/collapse. The
 * link carries `aria-current="page"` from the router, so the row highlights
 * like any other item; the chevron carries `aria-expanded` + `aria-controls`
 * and an accessible name of `Expand <label>` / `Collapse <label>`. Keyboard
 * order within the row is link, then chevron. **Omitting `as` keeps the
 * toggle-only shape** — one `<button>` spanning the whole row.
 *
 * When the rail is **collapsed** a linkable group has no chevron: the single
 * icon-sized target navigates on click, and hover (or focus) opens the
 * flyout, whose header is a link to the same destination so the parent page
 * stays reachable from inside the panel.
 *
 * **Auto-open**: on mount, if the group's own link or any subitem already has
 * `aria-current="page"` (i.e. the consumer is on the parent page or deep-
 * linked into a subroute), the group defaults to open so the active branch is
 * visible. This is uncontrolled-only and one-shot — subsequent navigations
 * don't force the group open, and manually closing it sticks. Consumers
 * wanting exact sync can pass a controlled `open` prop.
 *
 * **Hover-intent timing**: the flyout opens after a small 80ms delay to
 * avoid flicker during cursor traversal, and stays open for a 200ms grace
 * period after the cursor leaves so the user has time to move into the
 * panel. Re-entering the trigger or the flyout cancels the pending close.
 *
 * @example
 * // Toggle-only — the whole row expands/collapses, nothing navigates.
 * <Rail.Section title="Operations">
 *   <Rail.Group icon={<Settings />} label="Settings">
 *     <Rail.Item as={NavLink} to="/settings/general">General</Rail.Item>
 *     <Rail.Item as={NavLink} to="/settings/security">Security</Rail.Item>
 *     <Rail.Item as={NavLink} to="/settings/billing">Billing</Rail.Item>
 *   </Rail.Group>
 * </Rail.Section>
 *
 * @example
 * // Linkable — "Deals" navigates, the chevron reveals the saved views.
 * <Rail.Group as={NavLink} to="/deals" icon={<Handshake />} label="Deals">
 *   <Rail.Item as={NavLink} to="/deals?view=open">My open USD</Rail.Item>
 *   <Rail.Item as={NavLink} to="/deals?view=closing">Closing this month</Rail.Item>
 * </Rail.Group>
 *
 * @remarks Anti-patterns
 * - ❌ Nesting `<Rail.Group>` inside another `<Rail.Group>`. v1 supports
 *   only one level — subitems must be leaves.
 * - ❌ Putting non-`<Rail.Item>` children inside a group. Subitems should
 *   match the item shape so the active-state cascade reaches them.
 * - ❌ Adding a synthetic "All deals" first subitem to get a link to the
 *   parent page. That's what `as` is for — make the group itself the link.
 */
export const RailGroup = forwardRef<HTMLDivElement, RailGroupImplProps>(function RailGroup(
  {
    as,
    icon,
    label,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    children,
    className,
    ...rest
  },
  forwardedRef,
) {
  const t = useTranslation();
  const { collapsed } = useRail();

  // `as` is the opt-in for the linkable two-target row. Without it the group
  // renders exactly as it always has: one <button> spanning the whole row,
  // with `rest` landing on the wrapping <div>.
  const isLink = as !== undefined;
  const LinkComponent = (as ?? 'div') as ElementType;

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

  // ─── Auto-open when the group's own link OR a subitem is active ──────
  // The query below deliberately scans the WHOLE group block, not just
  // `.subitems`: on a linkable group the row's link lives in the same subtree,
  // so landing on /deals opens the group and reveals the nested views. Narrow
  // this to `.subitems` and that behavior silently disappears.
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
  // #274: hosts yield Escape while the flyout is open — our own capture
  // listener closes it on the same press instead of the Modal/Drawer.
  useFloatingSurface(popoverOpen);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFlyoutOnOpenRef = useRef(false);
  const suppressNextTriggerFocusOpenRef = useRef(false);

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
  // HTMLElement, not HTMLButtonElement: on a linkable group the collapsed-mode
  // trigger is the rendered link, not a button.
  const triggerRef = useRef<HTMLElement | null>(null);
  const placement: Placement = 'right-start';
  const { refs, floatingStyles } = useFloating({
    open: popoverOpen,
    placement,
    transform: false,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: triggerRef.current },
  });

  // #273: the flyout portals to document.body — elevate it above Modal/
  // Drawer (and any other elevated surface), same pattern as the date/time
  // popovers (#272); its base z sits at --z-popover otherwise.
  const inOverlay = useInOverlay(triggerRef, popoverOpen);

  const isSequentiallyFocusable = useCallback((candidate: HTMLElement, checkVisible = true) => {
    if (candidate.tabIndex < 0) return false;
    if (candidate.closest('[hidden], [inert]')) return false;
    if (!checkVisible) return true;
    const style = window.getComputedStyle(candidate);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const layoutUnavailable = document.documentElement.getClientRects().length === 0;
    return layoutUnavailable || candidate.getClientRects().length > 0;
  }, []);

  const getFlyoutFocusableItems = useCallback(
    () =>
      Array.from(
        refs.floating.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((candidate) => isSequentiallyFocusable(candidate)),
    [refs.floating, isSequentiallyFocusable],
  );

  const hasFlyoutFocusTarget = useCallback(() => {
    if (isLink && triggerRef.current && isSequentiallyFocusable(triggerRef.current, false)) {
      return true;
    }
    const inlineSubitems = groupRef.current?.querySelector(`.${styles.subitems}`);
    return Array.from(inlineSubitems?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).some(
      (candidate) => isSequentiallyFocusable(candidate, false),
    );
  }, [isLink, isSequentiallyFocusable]);

  const findNextFocusTarget = useCallback(() => {
    const trigger = triggerRef.current;
    const group = groupRef.current;
    if (!trigger || !group) return null;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const triggerIndex = candidates.indexOf(trigger);
    return (
      candidates.slice(triggerIndex + 1).find((candidate) => {
        if (group.contains(candidate)) return false;
        return isSequentiallyFocusable(candidate);
      }) ?? null
    );
  }, [isSequentiallyFocusable]);

  const focusFirstFlyoutItem = useCallback(() => {
    const first = getFlyoutFocusableItems()[0];
    if (first) {
      first.focus({ preventScroll: true });
      return;
    }
    setPopoverOpen(false);
    findNextFocusTarget()?.focus({ preventScroll: true });
  }, [getFlyoutFocusableItems, findNextFocusTarget]);

  // A portalled panel sits after #root in DOM order, so native Tab traversal
  // cannot move from the trigger into it. When keyboard interaction opens the
  // flyout, move focus to its first interactive element after the portal has
  // mounted. Escape already restores focus to the trigger below.
  useEffect(() => {
    if (!popoverOpen || !focusFlyoutOnOpenRef.current) return;
    focusFlyoutOnOpenRef.current = false;
    focusFirstFlyoutItem();
  }, [popoverOpen, focusFirstFlyoutItem]);

  // Close on Escape (a11y).
  useEffect(() => {
    if (!popoverOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault(); // consistency with every other floating surface
        overlayStack.consumeEscape(e); // hosts yield even if we ran first (#274)
        clearOpenTimer();
        clearCloseTimer();
        setPopoverOpen(false);
        suppressNextTriggerFocusOpenRef.current = true;
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
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (collapsed && e.key === 'Tab' && !e.shiftKey) {
        if (!hasFlyoutFocusTarget()) return;
        e.preventDefault();
        clearOpenTimer();
        clearCloseTimer();
        if (popoverOpen) {
          focusFirstFlyoutItem();
        } else {
          focusFlyoutOnOpenRef.current = true;
          setPopoverOpen(true);
        }
        return;
      }
      // In collapsed mode the trigger acts like a popup-haspopup button
      // (Enter / Space opens the popover); in expanded mode native button
      // semantics already cover Enter/Space toggling.
      if (!isLink && collapsed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        clearCloseTimer();
        setPopoverOpen((prev) => !prev);
      }
    },
    [
      collapsed,
      isLink,
      popoverOpen,
      focusFirstFlyoutItem,
      hasFlyoutFocusTarget,
      clearOpenTimer,
      clearCloseTimer,
    ],
  );

  const handlePointerEnter = useCallback(
    (_e: ReactPointerEvent<HTMLElement>) => {
      if (!collapsed) return;
      scheduleOpen();
    },
    [collapsed, scheduleOpen],
  );

  const handlePointerLeave = useCallback(
    (_e: ReactPointerEvent<HTMLElement>) => {
      if (!collapsed) return;
      scheduleClose();
    },
    [collapsed, scheduleClose],
  );

  const handleTriggerFocus = useCallback(() => {
    if (suppressNextTriggerFocusOpenRef.current) {
      suppressNextTriggerFocusOpenRef.current = false;
      return;
    }
    scheduleOpen();
  }, [scheduleOpen]);

  const handleFlyoutPointerEnter = useCallback(() => {
    if (!collapsed) return;
    clearCloseTimer();
  }, [collapsed, clearCloseTimer]);

  const handleFlyoutPointerLeave = useCallback(() => {
    if (!collapsed) return;
    scheduleClose();
  }, [collapsed, scheduleClose]);

  // Clicking a subitem inside the flyout — or the linkable group's own
  // collapsed-mode link — should dismiss the flyout: any navigation should
  // dismiss the floater per spec.
  const handleFlyoutClick = useCallback(() => {
    if (!collapsed) return;
    clearOpenTimer();
    clearCloseTimer();
    setPopoverOpen(false);
  }, [collapsed, clearOpenTimer, clearCloseTimer]);

  const handleFlyoutKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return;
      const items = getFlyoutFocusableItems();
      if (items.length === 0) return;
      const target = e.target as HTMLElement;
      if (e.shiftKey && target === items[0]) {
        e.preventDefault();
        clearCloseTimer();
        suppressNextTriggerFocusOpenRef.current = true;
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }
      if (!e.shiftKey && target === items.at(-1)) {
        const nextTarget = findNextFocusTarget();
        // If the group is the final page control, preserve native Tab so the
        // browser can move beyond the document instead of trapping focus.
        if (!nextTarget) return;
        e.preventDefault();
        clearOpenTimer();
        clearCloseTimer();
        setPopoverOpen(false);
        nextTarget.focus({ preventScroll: true });
      }
    },
    [getFlyoutFocusableItems, findNextFocusTarget, clearOpenTimer, clearCloseTimer],
  );

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

  const setTriggerRef = (node: HTMLElement | null) => {
    triggerRef.current = node;
  };

  // The flyout header is a SECOND rendering of the same destination, not a
  // second instance of the consumer's element — so it carries the navigation
  // props but not the identifying ones. A duplicated `id` is invalid HTML, and
  // a duplicated `data-testid` makes `getByTestId` throw on "found multiple"
  // for any consumer who tagged their group and then collapsed the rail.
  const headerLinkProps = Object.fromEntries(
    Object.entries(rest).filter(([key]) => key !== 'id' && !key.startsWith('data-')),
  );

  const chevron = (
    <ChevronRight
      size={14}
      aria-hidden
      className={clsx(styles.groupChevron, open && styles.groupChevronOpen)}
    />
  );

  return (
    <div
      ref={setGroupRef}
      className={clsx(styles.group, className)}
      // Toggle-only groups keep their historical contract: `rest` is div props
      // and lands here. A linkable group's `rest` is the link element's props
      // (`to`, `end`, …) and lands on the link instead.
      {...(isLink ? undefined : rest)}
    >
      {isLink ? (
        <div className={styles.groupRow}>
          {/* The row's link reuses `.item` so hover / focus / the
              [aria-current="page"] active accent all come for free — it IS an
              item row, minus the chevron. */}
          <LinkComponent
            ref={setTriggerRef}
            className={styles.item}
            // Collapsed mode: the single icon-sized target navigates on click
            // and reveals the children on hover/focus, so it advertises the
            // flyout rather than an inline disclosure. Expanded mode: the
            // chevron button below owns aria-expanded / aria-controls.
            aria-haspopup={collapsed ? 'dialog' : undefined}
            // {...rest} last so consumer overrides win (Pattern A), matching
            // <Rail.Item> — EXCEPT these five, which are composed rather than
            // overridable. They are the collapsed-mode flyout's only trigger:
            // if a consumer's own `onPointerEnter` (analytics, say) replaced
            // ours, hover would stop opening the flyout and the subitems would
            // become unreachable entirely — `.collapsed .subitems` is
            // `display: none`, so the flyout is the only path to them. Nothing
            // would warn. Do not "restore consistency" by deleting the
            // composition and letting the spread win.
            {...rest}
            onPointerEnter={composeHandlers(rest.onPointerEnter, handlePointerEnter)}
            onPointerLeave={composeHandlers(rest.onPointerLeave, handlePointerLeave)}
            onFocus={composeHandlers(rest.onFocus, collapsed ? handleTriggerFocus : undefined)}
            onBlur={composeHandlers(rest.onBlur, collapsed ? scheduleClose : undefined)}
            onClick={composeHandlers(rest.onClick, collapsed ? handleFlyoutClick : undefined)}
            onKeyDown={composeHandlers(
              rest.onKeyDown,
              collapsed ? handleTriggerKeyDown : undefined,
            )}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              {icon}
            </span>
            <span className={styles.itemLabel}>{label}</span>
          </LinkComponent>
          {/* No chevron when collapsed: there is no room for a second target
              at 56px, and hover already reveals the children. */}
          {!collapsed && (
            <button
              type="button"
              className={styles.groupChevronButton}
              aria-expanded={open}
              aria-controls={subitemsId}
              aria-label={`${open ? t('rail.collapseGroup') : t('rail.expandGroup')} ${label}`}
              onClick={toggleOpen}
            >
              {chevron}
            </button>
          )}
        </div>
      ) : (
        <button
          ref={setTriggerRef}
          type="button"
          className={styles.groupTrigger}
          // Expanded mode: aria-expanded reflects the inline-disclosure state;
          // collapsed mode: aria-haspopup reflects the flyout (rendered as a
          // dialog-shaped panel).
          aria-expanded={collapsed ? undefined : open}
          aria-controls={collapsed ? undefined : subitemsId}
          aria-haspopup={collapsed ? 'dialog' : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={collapsed ? handleTriggerFocus : undefined}
          onBlur={collapsed ? scheduleClose : undefined}
        >
          <span className={styles.itemIcon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.itemLabel}>{label}</span>
          {chevron}
        </button>
      )}

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
            role="dialog"
            data-in-overlay={inOverlay ? '' : undefined}
            aria-label={label}
            style={floatingStyles}
            className={styles.flyout}
            onPointerEnter={handleFlyoutPointerEnter}
            onPointerLeave={handleFlyoutPointerLeave}
            onClick={handleFlyoutClick}
            onKeyDown={handleFlyoutKeyDown}
            // Keyboard-tab traversal from the trigger into a subitem fires the
            // trigger's onBlur. Without these handlers, the 200ms close timer
            // would fire and unmount the flyout mid-tab. onFocus on the panel
            // (capturing focus via descendant) cancels any pending close;
            // onBlur re-schedules only when focus leaves the panel entirely.
            onFocus={clearCloseTimer}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                scheduleClose();
              }
            }}
          >
            {/* A linkable group's flyout header links to the same destination
                so the parent page stays reachable once the panel is open —
                collapsed mode has no chevron, so the row's own target is the
                only other way there. */}
            <div className={styles.flyoutHeader}>
              {isLink ? (
                <LinkComponent className={styles.flyoutHeaderLink} {...headerLinkProps}>
                  {label}
                </LinkComponent>
              ) : (
                label
              )}
            </div>
            <div className={styles.flyoutBody}>{children}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}) as RailGroupComponent;
