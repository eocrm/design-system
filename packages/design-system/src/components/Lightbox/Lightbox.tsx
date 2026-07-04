import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react';
import { Image } from '../Image';
import { Skeleton } from '../Skeleton';
import { useFocusTrap } from '../_internal/overlay/useFocusTrap';
import { useScrollLock } from '../_internal/overlay/useScrollLock';
import { overlayStack, useOverlayStack } from '../_internal/overlay';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Lightbox.module.scss';

/** One item (image or document) in a `<Lightbox>`. */
export interface LightboxItem {
  /** Full-size source URL (an image, or a PDF/document when `kind: 'pdf'`). */
  src: string;
  /** Alt text / document name (required — the accessible stage + thumbnail name). */
  alt: string;
  /** Item kind. Defaults to `'image'`, or `'pdf'` when `src` ends in `.pdf`. A
   *  `pdf` item renders in an `<iframe>` (the browser's PDF viewer) with a download
   *  action instead of an `<img>`. Security: the PDF iframe is NOT sandboxed (Chrome
   *  blocks its PDF viewer in any sandboxed frame), so a `pdf` `src` MUST be a trusted
   *  URL — the scheme is restricted to http(s)/relative, but a URL that returns HTML
   *  instead of a PDF would run with its own origin's privileges. */
  kind?: 'image' | 'pdf';
  /** Optional caption shown below the stage. */
  caption?: ReactNode;
  /** Optional thumbnail URL for the strip. Images default to `src`; a `pdf` item
   *  without a thumbnail shows a document-icon placeholder. */
  thumbnail?: string;
}

const isPdfSrc = (src: string) => /\.pdf($|[?#])/i.test(src);
const itemKind = (it: LightboxItem): 'image' | 'pdf' =>
  it.kind ?? (isPdfSrc(it.src) ? 'pdf' : 'image');

/** Allow only http(s) + relative URLs as an iframe/document src (block
 *  javascript:/data: etc). Returns the original src when safe, else undefined. */
function safeDocSrc(src: string): string | undefined {
  try {
    const u = new URL(src, 'https://_'); // dummy base resolves relative URLs
    return u.protocol === 'http:' || u.protocol === 'https:' ? src : undefined;
  } catch {
    return undefined;
  }
}

export interface LightboxProps {
  /** Controlled open state. */
  open: boolean;
  /** Fired when the Lightbox wants to close — Esc, backdrop click, the × button. */
  onOpenChange: (open: boolean) => void;
  /** The images. An empty array renders nothing. */
  items: LightboxItem[];
  /** Initial image index (uncontrolled). Defaults to `0`. Clamped to range. */
  defaultIndex?: number;
  /** Controlled current index. When set, pair with `onIndexChange`. */
  index?: number;
  /** Fired on navigation (chevron / arrow key / thumbnail click). */
  onIndexChange?: (index: number) => void;
  /** Wrap past the first/last image. Defaults to `true`. */
  loop?: boolean;
  /** className for the dialog container. */
  className?: string;
  /** Accessible label for the dialog. Defaults to the i18n "Image gallery". */
  'aria-label'?: string;
}

const clampIndex = (i: number, n: number) => Math.min(Math.max(i, 0), Math.max(n - 1, 0));
const wrapIndex = (i: number, n: number) => ((i % n) + n) % n;

// Body children matching these are NOT made inert when the Lightbox is on top —
// other overlay portals stay interactive (stacked overlays), mirroring Modal.
const PORTAL_EXEMPT =
  '[data-lightbox-portal-root], [data-modal-portal-root], [data-drawer-portal-root]';

/**
 * Full-screen image & document gallery overlay — shows one large item at a time
 * (an image, or a PDF previewed in an `<iframe>`), cycles through a set (prev/next
 * chevrons, ← → keys, a thumbnail strip), and shows an optional caption. Controlled
 * `open` like `<Modal>`; the current index is uncontrolled (`defaultIndex`) unless
 * you pass `index` + `onIndexChange`.
 *
 * The consumer owns the trigger and `open` — e.g. a row of interactive
 * `<Image>` thumbnails that set the start index and open the Lightbox.
 *
 * @example
 * const [open, setOpen] = useState(false);
 * const [start, setStart] = useState(0);
 * <Lightbox
 *   open={open}
 *   onOpenChange={setOpen}
 *   defaultIndex={start}
 *   items={files.map((f) => ({ src: f.url, alt: f.name, caption: f.name }))}
 * />
 *
 * @example
 * // Mixed gallery — images + a PDF (rendered in an iframe with a download action).
 * <Lightbox open={open} onOpenChange={setOpen} items={[
 *   { src: shot.url, alt: 'Screenshot' },
 *   { src: doc.url, alt: 'Contract.pdf', kind: 'pdf' },
 * ]} />
 *
 * @remarks When NOT to use
 * - A single, always-visible image → `<Image>` (optionally `interactive`).
 * - An arbitrary modal dialog (not an image/PDF preview) → `<Modal>`.
 *
 * @remarks Anti-patterns
 * - ❌ Building your own `Modal` + `Image` + arrows — that's what this is.
 * - ❌ Omitting `alt` on items — it's required and is the thumbnail/stage name.
 * - ❌ Passing `index` without `onIndexChange` — navigation would be a no-op.
 */
export function Lightbox({
  open,
  onOpenChange,
  items,
  defaultIndex = 0,
  index,
  onIndexChange,
  loop = true,
  className,
  'aria-label': ariaLabel,
}: LightboxProps) {
  const t = useTranslation();
  const id = useId();
  const n = items.length;
  const isControlled = index !== undefined;

  const [internalIndex, setInternalIndex] = useState(() => clampIndex(defaultIndex, n));
  const current = clampIndex(isControlled ? (index as number) : internalIndex, n);

  const { depth, isTop } = useOverlayStack(id, open, 'replace');

  // Focus restoration (WCAG 2.4.3, like Modal/Drawer). Split into two effects:
  //  - CAPTURE is a layout effect so it snapshots the trigger BEFORE focus moves
  //    into the dialog (the focus-into-dialog effect below is also layout).
  //  - RESTORE is a PASSIVE effect so it runs AFTER the inert-background cleanup
  //    (also passive) has removed `inert` from the trigger's subtree — otherwise
  //    `.focus()` would silently fail on a still-inert element (→ falls to <body>).
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef<boolean>(open);
  useLayoutEffect(() => {
    if (open) previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
  }, [open]);
  useEffect(() => {
    if (!open && prevOpenRef.current) {
      const target = previouslyFocusedRef.current;
      if (target && document.contains(target)) target.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    }
    prevOpenRef.current = open;
  }, [open]);

  useScrollLock(open);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, open && isTop);

  // Reseed the uncontrolled index whenever the Lightbox (re)opens.
  useEffect(() => {
    if (open && !isControlled) setInternalIndex(clampIndex(defaultIndex, n));
    // Only on open transition — defaultIndex/n changes mid-open shouldn't yank the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (n === 0) return;
      const target = loop ? wrapIndex(nextIndex, n) : clampIndex(nextIndex, n);
      if (target === current) return; // no-op move (e.g. an arrow key at a non-looping end)
      if (!isControlled) setInternalIndex(target);
      onIndexChange?.(target);
    },
    [n, loop, isControlled, onIndexChange, current],
  );
  const goNext = useCallback(() => goTo(current + 1), [goTo, current]);
  const goPrev = useCallback(() => goTo(current - 1), [goTo, current]);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Per-image stage load/error state, reset when the source changes.
  const currentItem: LightboxItem | undefined = items[current];
  const currentSrc = currentItem?.src;
  const [stageState, setStageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    setStageState('loading');
  }, [currentSrc]);

  // Inert the rest of the page while we're the top overlay (mirrors Modal.Overlay).
  useEffect(() => {
    if (!open || !isTop) return;
    const kids = Array.from(document.body.children) as HTMLElement[];
    const restore: Array<{ el: HTMLElement; had: boolean }> = [];
    for (const el of kids) {
      if (el.matches(PORTAL_EXEMPT)) continue;
      const had = el.hasAttribute('inert');
      if (!had) el.setAttribute('inert', '');
      restore.push({ el, had });
    }
    return () => {
      for (const { el, had } of restore) if (!had) el.removeAttribute('inert');
    };
  }, [open, isTop]);

  // Keyboard: Esc closes, ← → navigate (capture-phase + gated to top, like Modal.Content).
  useEffect(() => {
    if (!open || !isTop) return;
    function onKeyDown(e: KeyboardEvent) {
      // #274: yield to an open floating surface — see Modal/Content.tsx.
      if (
        e.key === 'Escape' &&
        (overlayStack.hasOpenFloating() || overlayStack.wasEscapeConsumed(e))
      )
        return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      } else if (e.key === 'ArrowRight' && n > 1) {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' && n > 1) {
        e.preventDefault();
        goPrev();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, isTop, n, close, goNext, goPrev]);

  // Move focus into the overlay on open.
  useLayoutEffect(() => {
    if (open && isTop) dialogRef.current?.focus();
  }, [open, isTop]);

  // Keep the active thumbnail in view (guarded — jsdom has no scrollIntoView).
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    if (!open) return;
    thumbRefs.current[current]?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [open, current]);

  if (!open || n === 0 || !currentItem) return null;

  const currentKind = itemKind(currentItem);
  // Sanitized document URL (http(s)/relative only) for the current PDF item, or
  // undefined when the item isn't a PDF or its src is unsafe. Computed once and
  // reused by the download link, the stage iframe, and the unavailable fallback.
  const docSrc = currentKind === 'pdf' ? safeDocSrc(currentItem.src) : undefined;
  const multi = n > 1;
  const atStart = current === 0;
  const atEnd = current === n - 1;

  const closeIfBackdrop = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) close();
  };

  const style = { ['--lightbox-depth' as string]: String(depth ?? 0) } as CSSProperties;

  return createPortal(
    <div
      data-lightbox-portal-root=""
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? t('lightbox.label')}
      tabIndex={-1}
      className={clsx(styles.root, className)}
      style={style}
      onClick={closeIfBackdrop}
    >
      {docSrc && (
        <a
          className={styles.download}
          href={docSrc}
          download
          // Open/save in a new tab: a cross-origin `download` is ignored by the
          // browser, so without target the click would navigate the whole app
          // away from the gallery. noopener/noreferrer guard the opened context.
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('lightbox.download')}
        >
          <Download size={20} aria-hidden="true" />
        </a>
      )}

      <button
        type="button"
        className={styles.close}
        aria-label={t('lightbox.close')}
        onClick={close}
      >
        <X size={20} aria-hidden="true" />
      </button>

      <div className={styles.stage} onClick={closeIfBackdrop}>
        {multi && (
          <button
            type="button"
            className={clsx(styles.chev, styles.chevPrev)}
            aria-label={t('lightbox.previous')}
            onClick={goPrev}
            disabled={!loop && atStart}
          >
            <ChevronLeft size={28} aria-hidden="true" />
          </button>
        )}

        <div className={styles.imageWrap}>
          {currentKind === 'pdf' ? (
            docSrc ? (
              <iframe
                key={docSrc}
                src={docSrc}
                title={currentItem.alt}
                className={styles.doc}
                referrerPolicy="no-referrer"
                // No `sandbox`: a PDF is rendered by the browser's own PDF engine
                // (PDFium / pdf.js), which already isolates the PDF's JS from the
                // page — so a sandbox adds nothing for PDF content while BLOCKING
                // Chrome's PDF viewer entirely ("This page has been blocked by
                // Chrome"; Chrome refuses to render PDFs in ANY sandboxed iframe,
                // regardless of allow-* tokens). `referrerPolicy="no-referrer"` and the
                // http(s)/relative-only `safeDocSrc` check (blocks javascript:/data:/
                // blob:) defend against SCHEME attacks; a URL that returns HTML instead
                // of a PDF would run unsandboxed, so this path relies on the documented
                // contract that the consumer frames its own trusted file URLs.
              />
            ) : (
              <div
                className={styles.stageError}
                role="img"
                aria-label={`${currentItem.alt}: ${t('lightbox.previewUnavailable')}`}
              >
                {t('lightbox.previewUnavailable')}
              </div>
            )
          ) : (
            <>
              <img
                key={currentItem.src}
                src={currentItem.src}
                alt={currentItem.alt}
                className={styles.image}
                data-state={stageState}
                onLoad={() => setStageState('loaded')}
                onError={() => setStageState('error')}
              />
              {stageState === 'loading' && (
                <Skeleton variant="rectangular" className={styles.stageOverlay} />
              )}
              {stageState === 'error' && (
                <div
                  className={styles.stageError}
                  role="img"
                  aria-label={currentItem.alt || t('image.loadError')}
                >
                  {t('image.loadError')}
                </div>
              )}
            </>
          )}
        </div>

        {multi && (
          <button
            type="button"
            className={clsx(styles.chev, styles.chevNext)}
            aria-label={t('lightbox.next')}
            onClick={goNext}
            disabled={!loop && atEnd}
          >
            <ChevronRight size={28} aria-hidden="true" />
          </button>
        )}
      </div>

      {(currentItem.caption != null || multi) && (
        <div className={styles.meta}>
          {currentItem.caption != null && (
            <div className={styles.caption}>{currentItem.caption}</div>
          )}
          {multi && (
            <div className={styles.counter}>
              {current + 1} / {n}
            </div>
          )}
        </div>
      )}

      {multi && (
        <div className={styles.thumbs}>
          {items.map((it, i) => (
            <div
              key={i}
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              className={clsx(styles.thumb, i === current && styles.thumbActive)}
            >
              {itemKind(it) === 'pdf' && !it.thumbnail ? (
                <button
                  type="button"
                  className={styles.thumbDoc}
                  aria-label={it.alt}
                  onClick={() => goTo(i)}
                >
                  <FileText size={20} aria-hidden="true" />
                </button>
              ) : (
                <Image
                  src={it.thumbnail ?? it.src}
                  alt=""
                  aspectRatio={1}
                  objectFit="cover"
                  interactive
                  onClick={() => goTo(i)}
                  ariaLabel={it.alt}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
Lightbox.displayName = 'Lightbox';
