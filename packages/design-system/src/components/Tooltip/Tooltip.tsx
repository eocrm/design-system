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

/**
 * Renders a small floating label anchored to a single trigger element. Opens
 * on hover (after `delay` ms) or immediately on keyboard focus, with a
 * directional arrow pointing at the trigger and a short scale-fade entrance.
 * Hand-rolled on `@floating-ui/react-dom` — no UI library.
 *
 * The trigger child must accept a ref (`forwardRef` if it's a custom
 * component; a raw `<button>` or this library's `<Button>` both qualify) and
 * must already have its own accessible name (visible text or `aria-label`).
 * The tooltip provides **supplementary description** via `aria-describedby`,
 * never the label itself.
 *
 * @example
 * <Tooltip content="Save the record (⌘S)">
 *   <Button onClick={save}>Save</Button>
 * </Tooltip>
 *
 * @example
 * // Icon-only trigger — give it its own aria-label; tooltip describes:
 * <Tooltip content="Filter results">
 *   <Button variant="ghost" aria-label="Filter">⏷</Button>
 * </Tooltip>
 *
 * @example
 * // Controlled open (rare — usually let Tooltip manage state):
 * const [open, setOpen] = useState(false);
 * <Tooltip content="…" open={open} onOpenChange={setOpen}>
 *   <Button>Edit</Button>
 * </Tooltip>
 *
 * @remarks When NOT to use
 * - For content the user must click to interact with → use Popover (separate
 *   wishlist item). Tooltips are not hoverable; moving the pointer into the
 *   tooltip body does not keep it open.
 * - For form-value selection → use Select (separate wishlist item).
 * - As the only source of essential information. Tooltips are progressive
 *   enhancement for pointer + keyboard users; touch users will not see them.
 *
 * @remarks Anti-patterns
 * - ❌ `<Tooltip><Button disabled>…</Button></Tooltip>` — `disabled` buttons
 *   do not fire pointerenter or focus events in any browser. If you need a
 *   tooltip explaining *why* a button is disabled, render the button with
 *   `aria-disabled="true"` and intercept its click handler, or wrap the
 *   disabled element in a `<span>` and pass the span as the Tooltip child.
 * - ❌ Putting essential info only in the tooltip. Make it visible in copy
 *   or, for icon buttons, in the trigger's `aria-label`.
 * - ❌ Trigger child that does not accept a ref — cloneElement needs a ref
 *   contract on the child.
 * - ❌ Multi-paragraph tooltip content. If you have that much to say, it's
 *   Popover territory.
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
    (_e: ReactPointerEvent) => {
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
    (_e: ReactPointerEvent) => {
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
    const onPointerDown = () => {
      cancelPendingOpen();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, cancelPendingOpen, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
