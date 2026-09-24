import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { Stack } from '../Stack';
import { Popover } from '../Popover';
import { usePopoverContext } from '../Popover/context';
import { sanitizeId } from '../_internal/refs';
import { useTranslation } from '../../i18n/useTranslation';
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

  /**
   * Confirm button label. Defaults to the i18n value at
   * `confirmationPopover.confirm` (`'Confirm'` in English).
   *
   * An EMPTY string counts as unset, not as an explicit blank: this label is
   * the confirm button's only name source (the pending spinner beside it is
   * `aria-hidden`), so an empty one would leave the button anonymous.
   */
  confirmLabel?: string;

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

  /**
   * Direct initial focus into the panel's content instead of the default
   * Cancel button — e.g. an `<Input>` rendered in `description` for a rename
   * flow. When provided and its `.current` is non-null on open, the component
   * focuses this element after the panel mounts (skipping the Cancel-focus).
   * Tip: add `onFocus={(e) => e.currentTarget.select()}` to a text input to
   * select its contents so the user can type/replace immediately.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;

  /**
   * Where focus goes when the popover closes. Default: back to the trigger.
   *
   * That default breaks whenever the trigger is gone by close time — the
   * confirmed action deleted the row that owned it — and focus lands on
   * `<body>`, so a keyboard user loses their place.
   *
   * The ref is read **at close time**, not at open time, so it may be pointed
   * at whatever still exists once the work is done — the next row's trigger,
   * the empty state's first button. If it is empty or its element has left
   * the document, focus falls back to the trigger (when it still exists).
   *
   * It applies when the popover closes via Confirm, Cancel or Escape. An
   * outside click never restores focus — focus stays wherever the click put
   * it (on a control, or `<body>` for an inert area).
   *
   * A ref that is set statically (not only inside `onConfirm`) ALSO fires when
   * the user closes by clicking the trigger again, pulling focus off the
   * trigger. To return to the trigger on Cancel / toggle and only move
   * elsewhere after a confirm, aim the ref inside `onConfirm` and clear it in
   * `onOpenChange(true)`.
   *
   * If focus is already on some other live element when the popover closes,
   * it is left alone.
   *
   * The target is scrolled into view with `{ block: 'nearest' }` (a no-op
   * when it is already visible) — it may be far from where the user was.
   *
   * @example
   * const returnFocusRef = useRef<HTMLElement | null>(null);
   * <ConfirmationPopover
   *   title="Delete row?"
   *   variant="danger"
   *   returnFocusRef={returnFocusRef}
   *   onOpenChange={(next) => { if (next) returnFocusRef.current = null; }}
   *   onConfirm={async () => {
   *     await deleteRow(id);
   *     returnFocusRef.current = nextRowTriggerRef.current ?? addRowButtonRef.current;
   *   }}
   * >
   *   <Button variant="danger">Delete</Button>
   * </ConfirmationPopover>
   */
  returnFocusRef?: RefObject<HTMLElement | null>;

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
 * Returns focus when the popover closes (#552, #553). Popover itself only
 * refocuses the trigger on Escape / `Popover.Close`; a Confirm or Cancel
 * click unmounts the focused button and would drop focus to `<body>`.
 * Rendered inside `<Popover>` so it can read the trigger ref from context.
 */
function FocusReturn({ returnFocusRef }: { returnFocusRef?: RefObject<HTMLElement | null> }) {
  const { open, triggerRef, contentRef } = usePopoverContext('FocusReturn');
  const prevOpenRef = useRef(open);
  const generationRef = useRef(0);
  const outsidePointerRef = useRef(false);

  // An outside-click dismissal commits BEFORE the browser's mousedown moves
  // focus to what was clicked; restoring then would flash focus onto the
  // trigger (and maybe scroll to returnFocusRef) only for the click to take
  // it away. Flag such pointerdowns — same "outside" test as Popover.Content
  // — so the close leaves focus to the click.
  useEffect(() => {
    if (!open) return;
    outsidePointerRef.current = false;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : target.parentElement;
      if (el?.closest('[data-dropdown-menu-content], [data-popover-content]')) return;
      outsidePointerRef.current = true;
      // Only this pointerdown's own close commit (flushed in a microtask) may
      // see the flag; a pointerdown that did NOT close (blocked while pending)
      // must not suppress a later Confirm-resolve restore.
      setTimeout(() => {
        outsidePointerRef.current = false;
      }, 0);
    };
    // On WINDOW capture, not document: Popover.Content's dismiss listener is
    // a document capture listener registered first, and real browsers run a
    // microtask checkpoint between listeners — React flushes the close there,
    // so a document listener of ours would set the flag after restore() ran.
    // Window capture fires before any document listener.
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, contentRef, triggerRef]);

  useLayoutEffect(() => {
    const generation = ++generationRef.current;
    const restore = () => {
      if (outsidePointerRef.current) return;
      const active = document.activeElement;
      const trigger = triggerRef.current;
      // An outside click onto a real control already moved focus — respect
      // it. Focus counts as lost on <body>, on a detached node (the panel's
      // button that was just removed), or on the trigger (Popover's Escape
      // path refocuses it before we run, and returnFocusRef must still win).
      const lost = !active || active === document.body || !active.isConnected || active === trigger;
      if (!lost) return;
      const requested = returnFocusRef?.current ?? null;
      if (requested?.isConnected) {
        requested.focus({ preventScroll: true });
        requested.scrollIntoView?.({ block: 'nearest' });
      } else if (trigger?.isConnected && active !== trigger) {
        trigger.focus({ preventScroll: true });
      }
    };
    if (!open && prevOpenRef.current) restore();
    prevOpenRef.current = open;
    // The whole ConfirmationPopover unmounted while open (the confirmed
    // action removed its row): no open → closed commit will ever run, so
    // restore from the unmount cleanup. Deferred until React finishes the
    // teardown; a later effect run (a normal close) bumps the generation and
    // cancels it, so focus is only moved once — same scheme as Modal.
    if (open) {
      return () => {
        queueMicrotask(() => {
          if (generationRef.current === generation) restore();
        });
      };
    }
  }, [open, triggerRef, returnFocusRef]);

  return null;
}

/**
 * Opinionated "Are you sure?" preset on top of `<Popover>`. Renders a
 * compact panel with a title, optional description, Cancel button, and
 * Confirm button. Anchors above the trigger by default to keep the user's
 * eye near where they clicked.
 *
 * - **Initial focus** lands on Cancel for both variants. Safer default —
 *   keyboard "Enter" never accidentally confirms; the user must Tab once
 *   to Confirm. Pass `initialFocusRef` to override this and focus a given
 *   element instead (e.g. an `<Input>` rendered in `description` for a
 *   rename flow).
 * - **Focus return** on every close (Confirm, Cancel, Escape): back to the
 *   trigger, or to `returnFocusRef` when it is set and still in the
 *   document — pass it when the confirmed action removes the trigger.
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
 * - ❌ Letting a confirmed delete remove the trigger with no
 *   `returnFocusRef` — focus drops to `<body>`. Aim the ref at the next
 *   row's trigger (or the empty state) inside `onConfirm`.
 */
export function ConfirmationPopover({
  children,
  title,
  description,
  confirmLabel,
  variant = 'default',
  onConfirm,
  onCancel,
  initialFocusRef,
  returnFocusRef,
  side = 'top',
  align = 'center',
  sideOffset = 10,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: ConfirmationPopoverProps) {
  const t = useTranslation();
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
  // we override it with Cancel. A consumer-supplied initialFocusRef takes
  // precedence (mirrors Modal) — e.g. an <Input> in the description slot.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      const target = initialFocusRef?.current ?? cancelRef.current;
      target?.focus({ preventScroll: true });
    });
  }, [open, initialFocusRef]);

  // Polite live region text, computed in an effect rather than during render so
  // a popover that opens ALREADY pending still announces — mounting the region
  // and its text together announces nothing. See CLAUDE.md Hard rule 10.
  const [pendingText, setPendingText] = useState('');
  useEffect(() => {
    setPendingText(pending ? t('confirmationPopover.pending') : '');
  }, [pending, t]);

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
    // Required now that the button is aria-disabled rather than natively
    // disabled: aria-disabled preserves pointer events and focusability.
    if (pending) return;
    onCancel?.();
    setOpen(false);
  }, [pending, onCancel, setOpen]);

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
          {/* Rendered unconditionally; only the text mutates. The spinner
              below is aria-hidden and `aria-busy` alone reaches no screen
              reader, so before this the pending state was silent from the
              moment the user confirmed until the popover closed (#497). */}
          <span role="status" aria-live="polite" className={styles.srOnly}>
            {pendingText}
          </span>
          <Cluster justify="end" gap="sm">
            <Button
              ref={cancelRef}
              variant="secondary"
              size="sm"
              // aria-disabled, not native `disabled`: the latter drops the
              // button out of the tab order the moment the user confirms,
              // leaving focus on a detached element. aria-disabled does NOT
              // block activation (see Button's own anti-patterns), so both
              // handlers guard on `pending` themselves.
              aria-disabled={pending || undefined}
              onClick={handleCancel}
            >
              {t('confirmationPopover.cancel')}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              aria-disabled={pending || undefined}
              onClick={handleConfirm}
            >
              {pending && <span className={styles.spinner} aria-hidden="true" />}
              {/* `||`, not `??`: the spinner beside it is aria-hidden, so this
                  is the confirm button's only name source and `confirmLabel=""`
                  would leave it with no accessible name (#535). */}
              {confirmLabel || t('confirmationPopover.confirm')}
            </Button>
          </Cluster>
        </Stack>
      </Popover.Content>
      {/* Last on purpose: Popover.Trigger re-attaches triggerRef (a fresh
          merged callback ref each render) in the layout phase, in tree
          order — FocusReturn's layout effect must run after that. */}
      <FocusReturn returnFocusRef={returnFocusRef} />
    </Popover>
  );
}
