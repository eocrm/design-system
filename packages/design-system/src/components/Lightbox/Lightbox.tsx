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
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Image } from '../Image';
import { Skeleton } from '../Skeleton';
import { useFocusTrap } from '../_internal/overlay/useFocusTrap';
import { useScrollLock } from '../_internal/overlay/useScrollLock';
import { useOverlayStack } from '../_internal/overlay';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Lightbox.module.scss';

/** One image in a `<Lightbox>`. */
export interface LightboxItem {
  /** Full-size image URL. */
  src: string;
  /** Alt text (required — describes the image, same contract as `<Image>`). */
  alt: string;
  /** Optional caption shown below the stage when set. */
  caption?: ReactNode;
  /** Optional thumbnail URL for the strip. Defaults to `src`. */
  thumbnail?: string;
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
 * Full-screen image gallery overlay — shows one large image at a time, cycles
 * through a set (prev/next chevrons, ← → keys, a thumbnail strip), and shows an
 * optional caption. Controlled `open` like `<Modal>`; the current index is
 * uncontrolled (`defaultIndex`) unless you pass `index` + `onIndexChange`.
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
 * @remarks When NOT to use
 * - A single, always-visible image → `<Image>` (optionally `interactive`).
 * - A non-image modal dialog → `<Modal>`.
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
      if (!isControlled) setInternalIndex(target);
      onIndexChange?.(target);
    },
    [n, loop, isControlled, onIndexChange],
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
              <Image
                src={it.thumbnail ?? it.src}
                alt=""
                aspectRatio={1}
                objectFit="cover"
                interactive
                onClick={() => goTo(i)}
                ariaLabel={it.alt}
              />
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
Lightbox.displayName = 'Lightbox';
