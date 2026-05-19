import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { mergeRefs, sanitizeId } from '../_internal/refs';

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
  // setOpen will be used by later tasks (hover, focus, escape, pointerdown).
  void setOpen;

  const triggerRef = useRef<HTMLElement | null>(null);
  const reactId = useId();
  const tooltipId = `tooltip-${sanitizeId(reactId)}`;
  const childProps = children.props as { ref?: Ref<HTMLElement> };

  const trigger = cloneElement(children, {
    ref: mergeRefs(triggerRef, childProps.ref),
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
