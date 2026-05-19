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
import { chain, mergeAriaDescribedby, mergeRefs, sanitizeId } from '../_internal/refs';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  delay?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Tooltip({
  content,
  children,
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
  const reactId = useId();
  const tooltipId = `tooltip-${sanitizeId(reactId)}`;
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div id={tooltipId} role="tooltip">
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
