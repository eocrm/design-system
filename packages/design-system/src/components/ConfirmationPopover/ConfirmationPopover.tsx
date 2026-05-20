import { useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { Stack } from '../Stack';
import { Popover } from '../Popover';
import { sanitizeId } from '../_internal/refs';
import styles from './ConfirmationPopover.module.scss';

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
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  side = 'top',
  align = 'center',
  sideOffset = 10,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: ConfirmationPopoverProps) {
  // Hoist open state into ConfirmationPopover so we can close after a
  // successful sync/async onConfirm without going through the consumer.
  const isConsumerControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isConsumerControlled ? (controlledOpen as boolean) : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isConsumerControlled) setInternalOpen(next);
    },
    [isConsumerControlled, onOpenChange],
  );

  const reactId = useId();
  const descriptionId = description ? `confirm-desc-${sanitizeId(reactId)}` : undefined;

  // Wrap Popover's onOpenChange to fire onCancel when the popover closes
  // via Escape / click-outside (i.e. a close that didn't come from Confirm).
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) onCancel?.();
      setOpen(next);
    },
    [onCancel, setOpen],
  );

  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Focus the Cancel button after Popover.Content focuses the panel.
  // queueMicrotask runs after Popover.Content's own focus effect (which also
  // uses queueMicrotask), so by the time this runs, the panel has focus and
  // we override it with Cancel.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => cancelRef.current?.focus({ preventScroll: true }));
  }, [open]);

  const [pending, setPending] = useState(false);

  const handleConfirm = useCallback(() => {
    if (pending) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setPending(true);
      result
        .then(() => {
          setPending(false);
          setOpen(false);
        })
        .catch(() => {
          setPending(false);
          // Popover stays open. onCancel NOT fired — failure is its own state.
        });
    } else {
      setOpen(false);
    }
  }, [pending, onConfirm, setOpen]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    setOpen(false);
  }, [onCancel, setOpen]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger>{children}</Popover.Trigger>
      <Popover.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        aria-describedby={descriptionId}
      >
        <Stack gap="sm">
          <Popover.Heading>{title}</Popover.Heading>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
          <Cluster justify="end" gap="sm">
            <Button
              ref={cancelRef}
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={handleCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              disabled={pending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}
