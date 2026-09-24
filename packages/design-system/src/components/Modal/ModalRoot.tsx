import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ModalContext,
  type ModalContextValue,
  type ModalOverlayVariant,
  type ModalSize,
} from './context';
import {
  useOverlayStack as useModalStack,
  type OverlayStackMode as ModalStackMode,
} from '../_internal/overlay';
import { useScrollLock } from '../_internal/overlay/useScrollLock';
import { Overlay } from './Overlay';
import { Content } from './Content';
import { sanitizeId } from '../_internal/refs';

export interface ModalProps {
  /** Controlled open state. Required. */
  open: boolean;
  /** Fired when Modal wants to change open state — Esc, overlay click, Close button, programmatic. */
  onOpenChange: (open: boolean) => void;

  /**
   * Size preset. Defaults to `'md'`.
   * - `'sm'` (400px) — confirms and short prompts.
   * - `'md'` (560px) — the default; typical forms.
   * - `'lg'` (800px) — wide forms, tables, previews.
   * - `'full'` (95vw × 90dvh, fixed height) — long documents, e.g. an HTML email.
   * See {@link ModalSize}.
   * @default 'md'
   */
  size?: ModalSize;

  /**
   * Overlay variant. 'solid' (default) paints a dark dimming layer.
   * 'blur' uses a light tinted background plus `backdrop-filter: blur(4px)`
   * for a frosted-glass effect. 'blur' costs an extra compositor layer —
   * fine for normal use; avoid stacking three blurred modals at once.
   */
  overlay?: ModalOverlayVariant;

  /**
   * How this modal relates to existing modals in the stack when it opens.
   *
   * - `'overlay'` (default): if there's a modal below this one, it stays
   *   visible underneath. This modal's own overlay paints transparent so
   *   the parent's dim shows through. Only the bottom modal (depth 0)
   *   paints the actual dim/blur. The user sees the parent's context behind
   *   the active modal.
   * - `'replace'`: any modals below this one are hidden via `display: none`
   *   (React state preserved). This modal paints its own overlay normally.
   *   Best for forced-step modals where the parent context is irrelevant.
   *
   * Has no effect when this is the only open modal.
   */
  stackMode?: ModalStackMode;

  /**
   * Disable Escape-to-close. Default false. Combined with `dismissOnOverlayClick: false`
   * and omitting `<Modal.Close>` produces a fully forced step.
   */
  disableEscapeClose?: boolean;
  /**
   * When false, clicking the overlay backdrop does NOT close the modal. Default true.
   */
  dismissOnOverlayClick?: boolean;

  /**
   * Initial focus target on open. Default: the dialog container itself.
   * Pass a ref to override (e.g. focus the first input in a form).
   */
  initialFocusRef?: RefObject<HTMLElement | null>;

  /**
   * Where focus goes when the modal closes. Default: back to whatever was
   * focused when it opened.
   *
   * That default breaks whenever the opener is gone by close time — a row's
   * "⋯" trigger whose row was just deleted, or a button that unmounts in the
   * same commit that opens the modal (the capture then snapshots `<body>`).
   * Focus lands on `<body>` and a keyboard user loses their place.
   *
   * The ref is read **at close time**, not at open time, so it may be pointed
   * at whatever still exists once the work is done — the next row's trigger,
   * the empty state's first button. If it is empty or its element has also
   * left the document, Modal falls back to the captured opener, and then to
   * doing nothing, exactly as before this prop existed.
   *
   * The target is scrolled into view (`block: 'nearest'`) after focus; the
   * captured opener is not.
   *
   * @example
   * // The deleted row's trigger is gone on close; aim at the next one.
   * const returnFocusRef = useRef<HTMLElement | null>(null);
   * <Modal open={open} onOpenChange={setOpen} returnFocusRef={returnFocusRef}>
   *   <Modal.Header>Delete mailbox?</Modal.Header>
   *   <Modal.Footer>
   *     <Button
   *       variant="danger"
   *       onClick={async () => {
   *         await deleteMailbox(id);
   *         returnFocusRef.current = nextRowTriggerRef.current ?? connectButtonRef.current;
   *         setOpen(false);
   *       }}
   *     >
   *       Delete
   *     </Button>
   *   </Modal.Footer>
   * </Modal>
   */
  returnFocusRef?: RefObject<HTMLElement | null>;

  /** Compound children: Header / Body / Footer / Close + any consumer JSX. */
  children: ReactNode;

  /** className passes through to the dialog container. */
  className?: string;
  /** style passes through to the dialog container. */
  style?: CSSProperties;

  /**
   * Required for a11y when no Modal.Header is rendered. When Header IS rendered,
   * aria-labelledby auto-binds to the heading id; this prop is then ignored.
   */
  'aria-label'?: string;
  /** Optional id of an external descriptor element; sets aria-describedby on the dialog. */
  'aria-describedby'?: string;
}

/**
 * Modal dialog: focus-locked, scroll-locked, ARIA-correct overlay panel.
 *
 * Compound API:
 * - `<Modal.Header>` renders the title bar (auto-wires aria-labelledby).
 * - `<Modal.Body>` is the scrollable content area.
 * - `<Modal.Footer>` is the pinned action bar.
 * - `<Modal.Close>` wraps a clickable child to dismiss the modal.
 *
 * Controlled-only — Modal has no uncontrolled mode. Consumer holds `open`
 * state and passes `open` + `onOpenChange`.
 *
 * Stacked modals: default `stackMode="overlay"` keeps parent modals visible
 * underneath with a transparent inner overlay so the user sees parent context.
 * Use `stackMode="replace"` to hide lower modals via `display: none` (React
 * state preserved) — best for forced steps where parent context is irrelevant.
 *
 * @example
 * const [open, setOpen] = useState(false);
 * <Button onClick={() => setOpen(true)}>Edit contact</Button>
 * <Modal open={open} onOpenChange={setOpen} size="md">
 *   <Modal.Header>Edit contact</Modal.Header>
 *   <Modal.Body>
 *     <Stack gap="md">
 *       <Input label="Name" value={name} onChange={...} />
 *     </Stack>
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
 *     <Button onClick={save}>Save</Button>
 *   </Modal.Footer>
 * </Modal>
 *
 * @example
 * // Forced step — no Esc, no overlay-click dismiss, no built-in close button:
 * <Modal
 *   open
 *   onOpenChange={() => {}}
 *   size="sm"
 *   disableEscapeClose
 *   dismissOnOverlayClick={false}
 *   aria-label="Session expired"
 * >
 *   <Modal.Header closeButton={false}>Session expired</Modal.Header>
 *   <Modal.Body>Please sign in again to continue.</Modal.Body>
 *   <Modal.Footer><Button onClick={reauth}>Sign in</Button></Modal.Footer>
 * </Modal>
 *
 * @example
 * // Frosted-glass overlay variant:
 * <Modal open onOpenChange={setOpen} overlay="blur">
 *   <Modal.Header>Subtle overlay</Modal.Header>
 *   <Modal.Body>The page behind is blurred instead of dimmed.</Modal.Body>
 * </Modal>
 *
 * @example
 * // Near-full-screen reader for a long document — Body scrolls, Header/Footer stay put.
 * // `renderedEmail` is your own sanitized HTML, not a library component:
 * <Modal open={open} onOpenChange={setOpen} size="full">
 *   <Modal.Header>Re: Q3 renewal</Modal.Header>
 *   <Modal.Body>{renderedEmail}</Modal.Body>
 * </Modal>
 *
 * @remarks When NOT to use
 * - For lightweight popovers anchored to a trigger — use `<Popover>` or `<DropdownMenu>`.
 * - For non-blocking notifications — use `<Toast>` (not yet shipped).
 * - For inline confirms attached to a button — use `<ConfirmationPopover>`.
 *
 * @remarks Anti-patterns
 * - ❌ Rendering long, scrollable forms with sticky footers that contain
 *   additional sticky elements inside Body — flexbox + sticky compose badly.
 *   Either use `<Modal.Footer>` for the actions and let Body scroll, or
 *   render outside Modal.
 * - ❌ `size="full"` for a short form or a confirm — it is a fixed 90dvh tall
 *   regardless of content, so a two-field form floats in a mostly empty box.
 *   Use `'md'` / `'lg'`, which size to content.
 * - ❌ Opening a modal from inside another modal without using `<Modal>` itself
 *   (e.g. a custom div with `position: fixed`). Skipping the stack registry
 *   breaks Esc routing and z-index ordering.
 * - ❌ Passing neither a `<Modal.Header>` nor an `aria-label` — Modal will
 *   warn in development. Screen-reader users get no announcement on open.
 * - ❌ Relying on the default focus restore when the element that opened the
 *   modal will not survive it (a deleted row's menu trigger, a button that
 *   unmounts in the same commit). Focus lands on `<body>`. Pass
 *   `returnFocusRef` and point it at something that still exists on close.
 */
export function ModalRoot({
  open,
  onOpenChange,
  size = 'md',
  overlay = 'solid',
  stackMode = 'overlay',
  disableEscapeClose = false,
  dismissOnOverlayClick = true,
  initialFocusRef,
  returnFocusRef,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const rawId = useId();
  const modalId = `modal-${sanitizeId(rawId)}`;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [headingId, setHeadingId] = useState<string | null>(null);

  // previouslyFocused: capture the trigger element when transitioning false → true,
  // then restore focus to it on close.
  //
  // useLayoutEffect is required here (not useEffect) for two reasons:
  //
  // 1. Capture timing: Content.tsx uses queueMicrotask inside its useLayoutEffect
  //    to move focus to the dialog. This layout effect runs in the same commit
  //    before that queued work, so it captures the trigger while it still has focus.
  //
  // 2. Close timing: on an open → closed update, React completes layout-effect
  //    cleanup (including useScrollLock's unlock) before running the closed-state
  //    layout effects that restore focus. preventScroll then avoids disturbing the
  //    restored position.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(false);
  const focusEffectGenerationRef = useRef(0);
  // A consumer-named target wins over the captured opener, and is read HERE —
  // at close time — so the consumer can aim it at whatever survived the work
  // the modal did (#529). Both are checked against the document: the opener is
  // commonly gone (deleted row, unmounted button), and the named target can be
  // too, in which case the captured opener is still the better answer than
  // nothing.
  const restoreFocus = useCallback(() => {
    const captured = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    const requested = returnFocusRef?.current ?? null;
    if (requested && document.contains(requested)) {
      requested.focus({ preventScroll: true });
      // #553: a named target is usually NOT where the user was (the opener
      // unmounted), so bring it into view. 'nearest' is a no-op when visible.
      // The captured opener is not scrolled — the user was already there.
      requested.scrollIntoView?.({ block: 'nearest' });
      return;
    }
    if (captured && document.contains(captured)) {
      captured.focus({ preventScroll: true });
    }
  }, [returnFocusRef]);
  useLayoutEffect(() => {
    const generation = ++focusEffectGenerationRef.current;
    if (open && !prevOpenRef.current) {
      // Modal is opening: snapshot the currently focused element before the
      // dialog's queueMicrotask fires and steals focus.
      previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    }
    if (!open && prevOpenRef.current) {
      // Modal is closing: restore focus to the element that triggered it.
      // preventScroll keeps the browser from scrollIntoView-ing the trigger,
      // which would fight the scroll restoration in useScrollLock's cleanup.
      restoreFocus();
    }
    prevOpenRef.current = open;
    // Also restore if the Modal root itself is removed while still open. Defer
    // until React finishes tearing down the dialog and its focus trap.
    //
    // This cleanup and the closing branch can run for the same transition;
    // a later effect generation cancels this queued fallback, while restoreFocus
    // clears its ref first so the target is focused only once.
    if (open) {
      return () => {
        queueMicrotask(() => {
          if (focusEffectGenerationRef.current === generation) restoreFocus();
        });
      };
    }
  }, [open, restoreFocus]);

  // Stack registration + scroll lock are driven by `open`.
  const { depth, isTop, topMode } = useModalStack(modalId, open, stackMode);
  useScrollLock(open);

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange(next);
    },
    [onOpenChange],
  );

  // Dev warning: must have either a Header (sets headingId in context) OR aria-label.
  // Deferred via microtask so <Modal.Header>'s registration effect has a chance to run.
  useEffect(() => {
    if (!open) return;
    if (process.env.NODE_ENV === 'production') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!headingId && !ariaLabel) {
        // eslint-disable-next-line no-console
        console.warn(
          '<Modal> must be labelled. Either render <Modal.Header> or pass an `aria-label` prop. Screen-reader users get no announcement otherwise.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, headingId, ariaLabel]);

  const value: ModalContextValue = {
    open,
    setOpen,
    modalId,
    contentRef,
    headingId,
    setHeadingId,
    size,
    overlay,
    disableEscapeClose,
    dismissOnOverlayClick,
    initialFocusRef,
    ariaLabel,
    ariaDescribedBy,
    depth: depth ?? 0,
    isTop,
    stackMode,
    topMode,
  };

  return (
    <ModalContext.Provider value={value}>
      {open && (
        <Overlay>
          <Content className={className} style={style}>
            {children}
          </Content>
        </Overlay>
      )}
    </ModalContext.Provider>
  );
}
