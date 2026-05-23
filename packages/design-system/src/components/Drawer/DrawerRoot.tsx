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
import { useOverlayStack, useScrollLock, type OverlayStackMode } from '../_internal/overlay';
import { sanitizeId } from '../_internal/refs';
import {
  DrawerContext,
  type DrawerContextValue,
  type DrawerOverlayVariant,
  type DrawerSide,
  type DrawerSize,
  type DrawerStackMode,
} from './context';
import { Overlay } from './Overlay';
import { Content } from './Content';

export interface DrawerProps {
  /** Controlled open state. Required — Drawer has no uncontrolled mode. */
  open: boolean;
  /** Fired when Drawer wants to change open state — Esc, overlay click, Close, swipe, programmatic. */
  onOpenChange: (open: boolean) => void;

  /** Edge the drawer slides in from. Defaults to 'right'. */
  side?: DrawerSide;

  /** Size preset. Width for left/right, height for top/bottom. Defaults to 'md'. */
  size?: DrawerSize;

  /** Overlay variant. 'solid' (default) | 'blur'. */
  overlay?: DrawerOverlayVariant;

  /**
   * How this drawer relates to other open overlays (Modals or Drawers).
   * 'overlay' (default): parent stays visible. 'replace': parent hidden via display:none.
   */
  stackMode?: DrawerStackMode;

  /** Disable Escape-to-close. Default false. */
  disableEscapeClose?: boolean;
  /** When false, overlay click does NOT close. Default true. */
  dismissOnOverlayClick?: boolean;
  /** Enable swipe-to-close gesture on touch devices (from Header). Default true. */
  dragToClose?: boolean;

  /** Initial focus target on open. */
  initialFocusRef?: RefObject<HTMLElement | null>;

  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Edge-anchored slide-in dialog. Same focus-lock + scroll-lock + stack semantics
 * as Modal — the two share the overlay-stack singleton so they can stack across
 * types (Drawer-inside-Modal, Modal-inside-Drawer).
 *
 * Compound API:
 * - `<Drawer.Header>` — title + auto-wired aria-labelledby + drag-to-close origin
 * - `<Drawer.Body>` — scrollable content
 * - `<Drawer.Footer>` — pinned action bar
 * - `<Drawer.Close>` — wraps a clickable child to dismiss
 *
 * @example
 * const [open, setOpen] = useState(false);
 * <Button onClick={() => setOpen(true)}>Show filters</Button>
 * <Drawer open={open} onOpenChange={setOpen} side="right" size="md">
 *   <Drawer.Header>Filters</Drawer.Header>
 *   <Drawer.Body><Stack gap="md">...</Stack></Drawer.Body>
 *   <Drawer.Footer>
 *     <Drawer.Close><Button variant="secondary">Cancel</Button></Drawer.Close>
 *     <Button onClick={apply}>Apply</Button>
 *   </Drawer.Footer>
 * </Drawer>
 *
 * @remarks When NOT to use
 * - For center-anchored dialogs — use `<Modal>`.
 * - For lightweight popovers — use `<Popover>` or `<DropdownMenu>`.
 * - For non-blocking notifications — use `<Toast>` (not yet shipped).
 *
 * @remarks Anti-patterns
 * - ❌ Rendering inside a `position: fixed` ancestor — the portal escapes that
 *   container anyway. Render `<Drawer>` at any level; it portals to document.body.
 * - ❌ Same `side` stacked drawers as a navigation pattern. They visually overlap;
 *   the user only sees the inner. Use route changes instead.
 * - ❌ Passing neither `<Drawer.Header>` nor `aria-label` — dev warning fires.
 */
export function DrawerRoot({
  open,
  onOpenChange,
  side = 'right',
  size = 'md',
  overlay = 'solid',
  stackMode = 'overlay',
  disableEscapeClose = false,
  dismissOnOverlayClick = true,
  dragToClose = true,
  initialFocusRef,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: DrawerProps) {
  const rawId = useId();
  const drawerId = `drawer-${sanitizeId(rawId)}`;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [headingId, setHeadingId] = useState<string | null>(null);

  // previouslyFocused — captured in a useLayoutEffect BEFORE Content's auto-focus microtask.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef<boolean>(open);
  useLayoutEffect(() => {
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

  const { depth, isTop, topMode } = useOverlayStack(drawerId, open, stackMode as OverlayStackMode);
  useScrollLock(open);

  const setOpen = useCallback((next: boolean) => onOpenChange(next), [onOpenChange]);

  // Dev warning — deferred to microtask so <Drawer.Header>'s registration effect can run.
  useEffect(() => {
    if (!open) return;
    if (process.env.NODE_ENV === 'production') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!headingId && !ariaLabel) {
        // eslint-disable-next-line no-console
        console.warn(
          '<Drawer> must be labelled. Either render <Drawer.Header> or pass an `aria-label` prop.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, headingId, ariaLabel]);

  const value: DrawerContextValue = {
    open,
    setOpen,
    drawerId,
    contentRef,
    headingId,
    setHeadingId,
    side,
    size,
    overlay,
    stackMode,
    disableEscapeClose,
    dismissOnOverlayClick,
    dragToClose,
    initialFocusRef,
    ariaLabel,
    ariaDescribedBy,
    depth: depth ?? 0,
    isTop,
    topMode: topMode as DrawerStackMode | null,
  };

  return (
    <DrawerContext.Provider value={value}>
      {open && (
        <Overlay>
          <Content className={className} style={style}>
            {children}
          </Content>
        </Overlay>
      )}
    </DrawerContext.Provider>
  );
}
