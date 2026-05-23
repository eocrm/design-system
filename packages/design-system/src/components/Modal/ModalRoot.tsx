import {
  useCallback,
  useEffect,
  useId,
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
import { useModalStack, type ModalStackMode } from './useModalStack';
import { useScrollLock } from './useScrollLock';
import { Overlay } from './Overlay';
import { Content } from './Content';
import { sanitizeId } from '../_internal/refs';

export interface ModalProps {
  /** Controlled open state. Required. */
  open: boolean;
  /** Fired when Modal wants to change open state — Esc, overlay click, Close button, programmatic. */
  onOpenChange: (open: boolean) => void;

  /** Size preset. Defaults to 'md'. */
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
 * - ❌ Opening a modal from inside another modal without using `<Modal>` itself
 *   (e.g. a custom div with `position: fixed`). Skipping the stack registry
 *   breaks Esc routing and z-index ordering.
 * - ❌ Passing neither a `<Modal.Header>` nor an `aria-label` — Modal will
 *   warn in development. Screen-reader users get no announcement on open.
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

  // previouslyFocused: capture when transitioning false → true; restore on close.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef<boolean>(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    }
    if (!open && prevOpenRef.current) {
      const target = previouslyFocusedRef.current;
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true });
      }
      previouslyFocusedRef.current = null;
    }
    prevOpenRef.current = open;
  }, [open]);

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
