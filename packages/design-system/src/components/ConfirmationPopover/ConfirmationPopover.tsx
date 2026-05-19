import type { ReactElement, ReactNode } from 'react';
import { Popover } from '../Popover';

export type ConfirmationVariant = 'default' | 'danger';

export interface ConfirmationPopoverProps {
  /** The trigger element. Same forwardRef-required contract as Popover.Trigger. */
  children: ReactElement;
  /** Heading text. Wires aria-labelledby. */
  title: string;
  /** Optional body text. Wires aria-describedby when present. */
  description?: ReactNode;
  /** Confirm button label. Defaults to `'Confirm'`. */
  confirmLabel?: string;
  /** Cancel button label. Defaults to `'Cancel'`. */
  cancelLabel?: string;
  /** `'danger'` swaps Confirm to a danger-variant button. Defaults to `'default'`. */
  variant?: ConfirmationVariant;
  /**
   * Async-aware confirm handler. May return a Promise; while pending, both
   * buttons disable and dismissal is blocked. On resolve, the popover closes.
   * On reject, the popover stays open and buttons re-enable.
   */
  onConfirm: () => void | Promise<void>;
  /** Optional. Fired on Cancel click, Escape, or click-outside dismissal. */
  onCancel?: () => void;
  /** Preferred side. Default `'top'`. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Edge alignment. Default `'center'`. */
  align?: 'start' | 'center' | 'end';
  /** Gap in px between trigger and panel. Default `10`. */
  sideOffset?: number;
  /** Controlled open state. */
  open?: boolean;
  /** Open-change callback. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

export function ConfirmationPopover({
  children,
  side = 'top',
  align = 'center',
  sideOffset = 10,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: ConfirmationPopoverProps) {
  // Minimal scaffold — internal state, focus management, buttons, async-aware
  // onConfirm, and pending-blocks-dismissal land in subsequent tasks. For now
  // ConfirmationPopover delegates entirely to Popover so the first render
  // test passes (trigger only when closed).
  return (
    <Popover open={controlledOpen} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      <Popover.Trigger>{children}</Popover.Trigger>
      <Popover.Content side={side} align={align} sideOffset={sideOffset}>
        {/* Content body lands in Task 14 */}
      </Popover.Content>
    </Popover>
  );
}
