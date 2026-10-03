import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import { chain, mergeAriaDescribedby, mergeRefs, sanitizeId } from '../_internal/refs';
import { overlayStack, useFloatingSurface } from '../_internal/overlay';
import styles from './Tooltip.module.scss';

/** Which side of the trigger the tooltip prefers. Floating UI auto-flips if it doesn't fit. */
export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

/** Which edge of the tooltip aligns to the corresponding trigger edge. */
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  /**
   * Tooltip body. ReactNode so you can include inline `<kbd>` or icons.
   * If `null`, `undefined`, or `""`, the trigger renders as-is with no
   * listeners and no `aria-describedby` — useful for conditional UIs.
   */
  content: ReactNode;

  /**
   * Exactly one React element that accepts a ref. Cloned to inject the
   * tooltip's ref + listeners + aria. `<Button>` and raw `<button>` both
   * qualify; a custom component without `forwardRef` does not.
   */
  children: ReactElement;

  /** Preferred side. Default `'top'`. Auto-flips on collision via Floating UI. */
  side?: TooltipSide;

  /** Edge alignment. Default `'center'`. */
  align?: TooltipAlign;

  /** Gap in px between trigger and tooltip. Default `6` (room for the arrow). */
  sideOffset?: number;

  /**
   * Delay in ms before hover opens the tooltip. Default `400`. Keyboard
   * focus is always immediate (a11y). Close is always immediate.
   */
  delay?: number;

  /**
   * Controlled open state. Provide alongside `onOpenChange` to drive open
   * externally. Omit both to let Tooltip own its state (the common case).
   */
  open?: boolean;

  /** Fired whenever Tooltip wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;

  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

// A tap on (or inside) one of these performs an action, so it must never be
// hijacked to toggle a tooltip (#567). Ancestors count too: a Badge inside a
// row link navigates.
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, label, audio[controls], video[controls], [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="treeitem"], [role="gridcell"]';

/**
 * A finger. Pens are left on the hover path: most hover, and a contact-only
 * pen fires pointerleave right after pointerup, which would snap a
 * tap-opened tooltip shut.
 */
function isTap(e: { pointerType: string }): boolean {
  return e.pointerType === 'touch';
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

/**
 * Small floating label anchored to a single trigger, opening on hover or keyboard focus with a directional arrow.
 * @see docs/components/Tooltip.md
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delay = 400,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: TooltipProps) {
  if (!isValidElement(children)) {
    throw new Error('<Tooltip> requires exactly one React element child.');
  }

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
  const arrowRef = useRef<HTMLSpanElement | null>(null);
  const reactId = useId();
  const tooltipId = `tooltip-${sanitizeId(reactId)}`;
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placement: Placement = (align === 'center' ? side : `${side}-${align}`) as Placement;

  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
    middlewareData,
  } = useFloating({
    open,
    placement,
    transform: false,
    middleware: [offset(sideOffset), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
    elements: { reference: triggerRef.current },
  });

  const resolvedSide = resolvedPlacement.split('-')[0] as TooltipSide;
  const staticSide = ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const)[
    resolvedSide
  ];

  const cancelPendingOpen = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelPendingOpen, [cancelPendingOpen]);

  const handlePointerEnter = useCallback(
    (e: ReactPointerEvent) => {
      // Touch fires enter/leave around every tap; that is not hover. Taps are
      // handled in handlePointerUp.
      if (e.pointerType === 'touch') return;
      cancelPendingOpen();
      if (delay <= 0) {
        setOpen(true);
        return;
      }
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        setOpen(true);
      }, delay);
    },
    [cancelPendingOpen, delay, setOpen],
  );

  const handlePointerLeave = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === 'touch') return;
      cancelPendingOpen();
      setOpen(false);
    },
    [cancelPendingOpen, setOpen],
  );

  const handleFocus = useCallback(
    (e: ReactFocusEvent<HTMLElement>) => {
      // `:focus-visible` gate: only open on keyboard focus, not mouse focus
      // following a click. Falls open if matches() is unavailable or throws
      // (jsdom selector parsing has historically been spotty).
      const node = e.currentTarget;
      let focusVisible = true;
      try {
        if (typeof node.matches === 'function') {
          focusVisible = node.matches(':focus-visible');
        }
      } catch {
        focusVisible = true;
      }
      if (!focusVisible) return;
      cancelPendingOpen();
      setOpen(true);
    },
    [cancelPendingOpen, setOpen],
  );

  // Tap to toggle on NON-interactive triggers only (#567): touch users have no
  // hover, so without this a RelativeTime / IconTile tooltip is unreachable.
  const handlePointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (!isTap(e) || isInteractiveTarget(e.target)) return;
      cancelPendingOpen();
      setOpen(!open);
    },
    [open, cancelPendingOpen, setOpen],
  );

  const handleBlur = useCallback(
    (_e: ReactFocusEvent<HTMLElement>) => {
      cancelPendingOpen();
      setOpen(false);
    },
    [cancelPendingOpen, setOpen],
  );

  // Document-level pointerdown: close any open tooltip on click anywhere.
  // Capture phase so a click on a button-like element that also unmounts the
  // tooltip's host (e.g., navigating away) still fires.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      // A tap on a tap-toggling trigger is handled by its own pointerup —
      // closing here would make the second tap re-open instead of close.
      if (
        isTap(e) &&
        e.target instanceof Node &&
        triggerRef.current?.contains(e.target) &&
        !isInteractiveTarget(e.target)
      ) {
        return;
      }
      cancelPendingOpen();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, cancelPendingOpen, setOpen]);

  // Register as an open floating surface so a host Modal/Drawer yields the
  // Escape that dismisses this tooltip (#281). The host's capture Escape
  // listener runs first (it opened first), so `hasOpenFloating()` — not
  // `consumeEscape` alone — is what actually saves the host on this press.
  useFloatingSurface(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // WCAG 1.4.13: Escape dismisses the tooltip. preventDefault + consume
        // (contract symmetry with the other floating surfaces) so a host that
        // already ran its listener still yields the press (the reverse-order
        // fallback; the registration above covers the common order).
        e.preventDefault();
        overlayStack.consumeEscape(e);
        cancelPendingOpen();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, cancelPendingOpen, setOpen]);

  const isEmpty = content == null || content === '';
  const childProps = children.props as {
    ref?: Ref<HTMLElement>;
    onPointerEnter?: (e: ReactPointerEvent) => void;
    onPointerLeave?: (e: ReactPointerEvent) => void;
    onPointerUp?: (e: ReactPointerEvent) => void;
    onFocus?: (e: ReactFocusEvent<HTMLElement>) => void;
    onBlur?: (e: ReactFocusEvent<HTMLElement>) => void;
    'aria-describedby'?: string;
  };

  if (isEmpty) {
    return cloneElement(children, {
      ref: mergeRefs(triggerRef, childProps.ref),
    } as object);
  }

  const trigger = cloneElement(children, {
    ref: mergeRefs(triggerRef, childProps.ref),
    'aria-describedby': open
      ? mergeAriaDescribedby(childProps['aria-describedby'], tooltipId)
      : childProps['aria-describedby'],
    onPointerEnter: chain(childProps.onPointerEnter, handlePointerEnter),
    onPointerLeave: chain(childProps.onPointerLeave, handlePointerLeave),
    onPointerUp: chain(childProps.onPointerUp, handlePointerUp),
    onFocus: chain(childProps.onFocus, handleFocus),
    onBlur: chain(childProps.onBlur, handleBlur),
  } as object);

  const arrowXY = middlewareData.arrow;

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            ref={refs.setFloating}
            id={tooltipId}
            role="tooltip"
            data-side={resolvedSide}
            style={floatingStyles}
            className={styles.content}
          >
            {content}
            <span
              ref={arrowRef}
              aria-hidden="true"
              className={styles.arrow}
              style={{
                left: typeof arrowXY?.x === 'number' ? `${arrowXY.x}px` : undefined,
                top: typeof arrowXY?.y === 'number' ? `${arrowXY.y}px` : undefined,
                [staticSide]: '-4px',
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
