import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { Stack } from '../Stack';
import { Popover } from '../Popover';
import { sanitizeId } from '../_internal/refs';
import styles from './ConfirmationPopover.module.scss';

/** `'danger'` swaps Confirm to a danger-variant button; `'default'` uses primary. */
export type ConfirmationVariant = 'default' | 'danger';

export interface ConfirmationPopoverProps {
  /**
   * The trigger element. Same forwardRef-required contract as
   * `<Popover.Trigger>` — `<Button>` qualifies; a custom component without
   * `forwardRef` does not.
   */
  children: ReactElement;

  /**
   * Heading text. Renders inside `<Popover.Heading>` (an `<h3>`) and wires
   * `aria-labelledby` on the dialog automatically.
   */
  title: string;

  /**
   * Optional body text below the title. When provided, wires
   * `aria-describedby` so screen readers announce it.
   */
  description?: ReactNode;

  /** Confirm button label. Defaults to `'Confirm'`. */
  confirmLabel?: string;

  /** Cancel button label. Defaults to `'Cancel'`. */
  cancelLabel?: string;

  /** `'danger'` makes Confirm a danger-variant button. Defaults to `'default'` (primary). */
  variant?: ConfirmationVariant;

  /**
   * Async-aware confirm handler. May return a Promise; while pending,
   * both buttons disable, the Confirm button shows a small spinner, and
   * Escape / click-outside dismissal is blocked.
   *
   * - Resolve → popover closes.
   * - Reject → popover stays open, buttons re-enable. `onCancel` is NOT
   *   fired (the user neither confirmed nor cancelled — it's an error
   *   state owned by the consumer).
   *
   * The consumer is expected to surface error feedback externally (toast,
   * inline message, etc.). ConfirmationPopover does NOT render errors.
   */
  onConfirm: () => void | Promise<void>;

  /** Optional. Fires on Cancel click, Escape, or click-outside dismissal. NOT fired if `onConfirm` rejects. */
  onCancel?: () => void;

  /** Preferred side. Default `'top'` — confirmations anchor above the trigger by convention. */
  side?: 'top' | 'right' | 'bottom' | 'left';

  /** Edge alignment. Default `'center'`. */
  align?: 'start' | 'center' | 'end';

  /** Gap in px between trigger and panel. Default `10`. */
  sideOffset?: number;

  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;

  /** Open-change callback. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;

  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

/**
 * Opinionated "Are you sure?" preset on top of `<Popover>`. Renders a
 * compact panel with a title, optional description, Cancel button, and
 * Confirm button. Anchors above the trigger by default to keep the user's
 * eye near where they clicked.
 *
 * - **Initial focus** lands on Cancel for both variants. Safer default —
 *   keyboard "Enter" never accidentally confirms; the user must Tab once
 *   to Confirm.
 * - **Async-aware** `onConfirm`. While the returned Promise is in flight,
 *   both buttons disable, the Confirm shows a spinner, and Escape /
 *   click-outside dismissal is blocked.
 * - **Failure mode**. If `onConfirm` rejects, the popover stays open and
 *   buttons re-enable. The consumer surfaces the error.
 *
 * @example
 * <ConfirmationPopover
 *   title="Delete record?"
 *   description="This action cannot be undone."
 *   variant="danger"
 *   onConfirm={async () => {
 *     await api.deleteRecord(id);
 *   }}
 * >
 *   <Button variant="danger">Delete</Button>
 * </ConfirmationPopover>
 *
 * @example
 * // Default variant — lighter-weight (archive, publish, etc.):
 * <ConfirmationPopover
 *   title="Archive this contact?"
 *   description="You can unarchive later from the archive view."
 *   onConfirm={() => archive(id)}
 * >
 *   <Button variant="secondary">Archive</Button>
 * </ConfirmationPopover>
 *
 * @remarks When NOT to use
 * - For a multi-step flow ("type the name to confirm") → use Modal (when
 *   shipped). ConfirmationPopover is for one-tap confirmations.
 * - For a non-blocking heads-up that doesn't need a yes/no answer → use
 *   a Toast (when shipped) or inline UI.
 *
 * @remarks Anti-patterns
 * - ❌ Hanging-forever `onConfirm` Promise. v1 has no timeout — the
 *   popover stays in pending state indefinitely. Add a timeout / abort
 *   inside your `onConfirm` if the operation may stall.
 * - ❌ Rendering an inline error from `onConfirm`'s rejection inside the
 *   popover body. ConfirmationPopover doesn't render errors — surface
 *   them via toast or page-level UI instead.
 * - ❌ Combining controlled `open` + relying on pending-blocks-close. If
 *   you provide `open` / `onOpenChange`, you can force-close from outside
 *   while we're pending. Coordinate `pending` in your own code if that
 *   matters.
 */
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

  const [pending, setPending] = useState(false);

  // Wrap Popover's onOpenChange to fire onCancel when the popover closes
  // via Escape / click-outside (i.e. a close that didn't come from Confirm).
  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Block close while a confirm is pending — the in-flight Promise
      // should resolve before we tear down the popover.
      if (pending && !next) return;
      if (!next) onCancel?.();
      setOpen(next);
    },
    [pending, onCancel, setOpen],
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
              {pending && <span className={styles.spinner} aria-hidden="true" />}
              {confirmLabel}
            </Button>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}
