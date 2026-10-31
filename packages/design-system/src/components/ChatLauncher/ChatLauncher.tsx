import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Button } from '../Button';
import { mergeRefs } from '../_internal/refs';
import { isAtBottom } from './isAtBottom';
import styles from './ChatLauncher.module.scss';

export interface ChatLauncherProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'children'
> {
  /** Accessible name of the launcher button — names the assistant ("Ask Scout"). */
  label: string;
  /** Whether the panel is open. Controlled only: pair with `onOpenChange`. */
  open: boolean;
  /** Called with the requested state: launcher toggle, close button, Escape. */
  onOpenChange(open: boolean): void;
  /** Launcher glyph (e.g. a lucide icon with `aria-hidden`). */
  icon: ReactNode;
  /** Panel header text; also the dialog's accessible name. */
  title: ReactNode;
  /** Scrolling body — usually a `<ChatBubble.List>`. Stays mounted while closed. */
  children: ReactNode;
  /** Pinned area below the body — the composer (`Textarea` + send `Button`). */
  footer?: ReactNode;
  /**
   * Element focused when the panel opens (point it at the composer).
   * Default: the panel itself. Focus already inside the panel is not moved.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Fixed bottom-end launcher button that toggles a non-modal chat panel.
 * @see docs/components/ChatLauncher.md
 */
export const ChatLauncher = forwardRef<HTMLDivElement, ChatLauncherProps>(function ChatLauncher(
  {
    label,
    open,
    onOpenChange,
    icon,
    title,
    children,
    footer,
    initialFocusRef,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const autoId = useId();
  const panelId = props.id ?? `chat-launcher-${autoId}`;
  const titleId = `${panelId}-title`;

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Scroll is tracked live: a `hidden` body reads 0 for every metric, so it
  // can't be measured at close time.
  const openRef = useRef(open);
  // Seeded with `open`: mounting open is not a transition, so it scrolls but
  // doesn't pull focus on page load.
  const wasOpenRef = useRef(open);
  const initialFocus = useRef(initialFocusRef);
  const openedOnceRef = useRef(false);
  const scrollRef = useRef({ top: 0, atBottom: true });

  // Read via a ref so a new `initialFocusRef` identity never re-runs the
  // focus move below (non-modal: focus outside the panel stays put).
  useLayoutEffect(() => {
    initialFocus.current = initialFocusRef;
  });

  useLayoutEffect(() => {
    openRef.current = open;
    const panel = panelRef.current;
    const body = bodyRef.current;
    if (open) {
      if (body) {
        if (!openedOnceRef.current || scrollRef.current.atBottom) {
          body.scrollTop = body.scrollHeight;
          scrollRef.current = { top: body.scrollTop, atBottom: true };
        } else {
          body.scrollTop = scrollRef.current.top;
        }
      }
      openedOnceRef.current = true;
      if (!wasOpenRef.current && panel && !panel.contains(document.activeElement)) {
        (initialFocus.current?.current ?? panel).focus({ preventScroll: true });
      }
    } else if (wasOpenRef.current && rootRef.current?.contains(document.activeElement)) {
      // Escape / close button / programmatic close from inside: return focus.
      // Focus outside the chat is never stolen.
      launcherRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  // Follow new content, or a shrinking body (composer grows, mobile keyboard),
  // only while the user is already at the bottom.
  useEffect(() => {
    const content = contentRef.current;
    const bodyEl = bodyRef.current;
    if (!content || !bodyEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const body = bodyRef.current;
      if (!openRef.current || !body || !scrollRef.current.atBottom) return;
      body.scrollTop = body.scrollHeight;
    });
    observer.observe(content);
    observer.observe(bodyEl);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const body = bodyRef.current;
    if (!openRef.current || !body) return;
    scrollRef.current = {
      top: body.scrollTop,
      atBottom: isAtBottom(body.scrollTop, body.scrollHeight, body.clientHeight),
    };
  };

  // Non-modal: Escape is scoped to the panel + launcher, never the document.
  // React bubbles through portals, so a portaled descendant (a Modal opened
  // from a bubble) is ignored by DOM containment.
  const onRootKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !open || e.defaultPrevented) return;
    if (!rootRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    onOpenChange(false);
  };

  // SSR: no document to portal into; the chat mounts on the client.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div ref={rootRef} className={styles.root} onKeyDown={onRootKeyDown}>
      {/* {...props} first so role/hidden/aria-labelledby/tabIndex win */}
      <div
        {...props}
        ref={mergeRefs<HTMLDivElement>(panelRef, ref)}
        id={panelId}
        className={clsx(styles.panel, className)}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        hidden={!open}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={t('chatLauncher.close')}
            onClick={() => onOpenChange(false)}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div ref={bodyRef} className={styles.body} onScroll={onScroll}>
          <div ref={contentRef}>{children}</div>
        </div>
        {footer != null && <div className={styles.footer}>{footer}</div>}
      </div>
      <Button
        ref={launcherRef}
        variant="primary"
        size="lg"
        iconOnly
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        {icon}
      </Button>
    </div>,
    document.body,
  );
});
