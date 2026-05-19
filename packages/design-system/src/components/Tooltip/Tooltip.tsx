import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

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

/**
 * Minimal scaffold — later tasks fill in:
 *   - controlled/uncontrolled state
 *   - hover/focus listeners + delay timer
 *   - Floating UI portal + arrow
 *   - ARIA wiring
 *   - SCSS chrome + animation
 */
export function Tooltip({ children }: TooltipProps) {
  if (!isValidElement(children)) {
    throw new Error('<Tooltip> requires exactly one React element child.');
  }
  return cloneElement(children);
}
