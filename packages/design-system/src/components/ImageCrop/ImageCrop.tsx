import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import clsx from 'clsx';
import { Button } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import { Skeleton } from '../Skeleton';
import { useTranslation } from '../../i18n/useTranslation';
import type { CropArea } from './extractCropBlob';
import {
  defaultCropArea,
  fitImage,
  moveCrop,
  normalizeCrop,
  resizeCrop,
  scaleCrop,
  type Handle,
} from './cropGeometry';
import styles from './ImageCrop.module.scss';

// Mirrors --image-crop-fit-padding (var(--space-4)); TS needs a number for layout math.
const FIT_PADDING = 16;
// Bottom space kept free for the on-canvas toolbar (one row of sm buttons + offset); 0 when no toolbar renders.
const TOOLBAR_RESERVE = 56;
// Smallest crop box edge, in screen px.
const MIN_BOX_PX = 48;
// Box scale per wheel pixel: one 100px mouse notch ≈ ×1.06; deltaY > 0 grows.
const WHEEL_K = Math.log(1.06) / 100;
// px per DOM_DELTA_LINE (pages use the window height).
const WHEEL_LINE_PX = 16;
// Quiet period after the last wheel tick before onChangeEnd fires.
const WHEEL_END_MS = 200;

const CORNERS: Handle[] = ['nw', 'ne', 'sw', 'se'];
const EDGES: Handle[] = ['n', 's', 'e', 'w'];

// Re-export from the utility so consumers have a single import for the type.
export type { CropArea } from './extractCropBlob';

/** One option in the on-canvas aspect-ratio switcher. `value` omitted = free aspect. */
export interface ImageCropAspectOption {
  label: string;
  value?: number;
}

export interface ImageCropProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Image source. String URLs (HTTP/HTTPS, data:, blob:) pass through.
   * File/Blob are normalized to object URLs internally via
   * `URL.createObjectURL()`, with cleanup on unmount and `src` change.
   */
  src: string | File | Blob;
  /**
   * Controlled crop area in SOURCE-IMAGE pixel coordinates. Pass `null` to
   * use the component's default centered crop (80% of the largest centered
   * region matching `aspectRatio`).
   */
  value: CropArea | null;
  /** Fires on every drag/resize tick. High frequency. Also fires once on first image load when `value` is `null`, with the computed default crop; after that the consumer owns the state. */
  onChange: (area: CropArea) => void;
  /** Fires on commit: when a drag/resize is released, ~200ms after the last wheel tick, on each key press, and on Reset/double-click. */
  onChangeEnd?: (area: CropArea) => void;
  /**
   * Fixed aspect ratio for the crop box (e.g. `1` for square, `16/9`). Omit
   * for free aspect — edge handles then appear too. Toggling it at runtime
   * does NOT re-fit `value`; pass a fresh `value` (or `null`) with the change.
   */
  aspectRatio?: number;
  /**
   * Disable all interaction (move, resize). Default `false`. Image still renders.
   */
  disabled?: boolean;
  /**
   * Render the on-canvas Reset button. Default `false`; double-click reset works regardless.
   */
  showReset?: boolean;
  /**
   * Options for an on-canvas aspect-ratio switcher. Labels are consumer strings (your i18n).
   * Controlled: the option whose `value === aspectRatio` shows as selected, and picking one calls
   * `onAspectRatioChange`, then `onChange`/`onChangeEnd` with that ratio's default crop.
   * Omit or pass `[]` for no switcher.
   */
  aspectRatios?: ImageCropAspectOption[];
  /** Fires when an option is picked in the switcher (`undefined` = free aspect). Update your `aspectRatio` state here. */
  onAspectRatioChange?: (ratio: number | undefined) => void;
}

/**
 * Controlled, inline image-crop primitive: drag and resize a crop box over a still image.
 * @see docs/components/ImageCrop.md
 */
export const ImageCrop = forwardRef<HTMLDivElement, ImageCropProps>(function ImageCrop(
  {
    src,
    value,
    onChange,
    onChangeEnd,
    aspectRatio,
    disabled = false,
    showReset = false,
    aspectRatios,
    onAspectRatioChange,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const hintId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Object URL lifecycle for File/Blob sources. When src is a string, pass-
  // through. When it's a File/Blob, create an object URL and revoke on
  // unmount or src change.
  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    typeof src === 'string' ? src : '',
  );
  useEffect(() => {
    if (typeof src === 'string') {
      setResolvedSrc(src);
      return;
    }
    const url = URL.createObjectURL(src);
    setResolvedSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [src]);

  // Image load state + natural dimensions. Reset when src changes — during
  // render, not in an effect: a mount-time effect ran after a cached image's
  // `load` and wiped it, leaving the skeleton up for good (#574).
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageNatural, setImageNatural] = useState<{ width: number; height: number } | null>(null);
  const [prevSrc, setPrevSrc] = useState(resolvedSrc);
  if (resolvedSrc !== prevSrc) {
    setPrevSrc(resolvedSrc);
    setLoadState('loading');
    setImageNatural(null);
  }

  // Viewport size — measured after layout via getBoundingClientRect. We use a
  // ResizeObserver instead of a window-resize listener so we catch:
  //  1. The initial measurement (synchronously after mount).
  //  2. Layout shifts when the component mounts inside a conditional render
  //     (parent height/width settles a frame or two after the new DOM commits).
  //  3. Parent container size changes (responsive layouts, sidebars opening).
  //  4. Window resizes (ResizeObserver covers this too).
  // The previous window-resize-only strategy missed cases 2 + 3, leaving the
  // viewport at 0×0 when the ImageCrop mounted inside a just-shown container —
  // boxW=0 → imageTransform returned display:none and the image was invisible.
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const hasRatios = !!aspectRatios?.length;
  const hasToolbar = showReset || hasRatios;
  const toolbarReserve = hasToolbar ? TOOLBAR_RESERVE : 0;
  const fit = useMemo(
    () =>
      imageNatural && viewport.width > 0 && viewport.height > 0
        ? fitImage(viewport, imageNatural, FIT_PADDING, toolbarReserve)
        : null,
    [imageNatural, viewport, toolbarReserve],
  );

  // Whenever the consumer passes null (first load, or later — e.g. after a
  // ratio switch), fire onChange once with the default so the controlled
  // state catches up. The ref re-arms as soon as a real value comes back, so
  // a consumer that keeps null (ignores onChange) doesn't get a loop.
  const defaultFiredRef = useRef(false);
  useEffect(() => {
    if (value !== null) {
      defaultFiredRef.current = false;
      return;
    }
    if (loadState !== 'loaded' || !imageNatural || !fit || defaultFiredRef.current) return;
    defaultFiredRef.current = true;
    onChange(defaultCropArea(imageNatural, aspectRatio));
  }, [loadState, imageNatural, value, fit, aspectRatio, onChange]);

  // Re-arm on src change so the new image gets its default crop applied.
  useEffect(() => {
    defaultFiredRef.current = false;
  }, [resolvedSrc]);

  // Gesture state lives in a ref so handlers read it synchronously.
  const dragRef = useRef<{
    mode: 'move' | Handle;
    pointerId: number;
    startX: number;
    startY: number;
    start: CropArea;
    last: CropArea;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Drop an in-flight gesture if disabled flips mid-drag.
  useEffect(() => {
    if (disabled) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }, [disabled]);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    // Re-measure the viewport on image load so the initialization cascade
    // (default crop, transform) uses the correct dimensions even if the
    // layout effect fired before the viewport was sized (e.g. in tests or
    // when the component mounts inside a not-yet-laid-out container).
    const el = viewportRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        setViewport({ width: rect.width, height: rect.height });
      }
    }
    setImageNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setLoadState('loaded');
  }, []);

  const handleImageError = useCallback(() => {
    setLoadState('error');
  }, []);

  const startDrag = (e: PointerEvent<HTMLElement>, mode: 'move' | Handle) => {
    if (disabled || !imageNatural || !value || !fit || e.button !== 0 || dragRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // jsdom or pre-PointerEvents browsers — drag still works via pointermove.
    }
    clearTimeout(wheelEndTimer.current);
    const start = normalizeCrop(value, imageNatural, aspectRatio);
    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      start,
      last: start,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (disabled || !drag || drag.pointerId !== e.pointerId || !imageNatural || !fit) return;
    const dx = (e.clientX - drag.startX) / fit.scale;
    const dy = (e.clientY - drag.startY) / fit.scale;
    const next =
      drag.mode === 'move'
        ? moveCrop(drag.start, dx, dy, imageNatural)
        : resizeCrop(
            drag.start,
            drag.mode,
            dx,
            dy,
            imageNatural,
            MIN_BOX_PX / fit.scale,
            aspectRatio,
          );
    drag.last = next;
    onChange(next);
  };

  const handlePointerUp = (e: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (disabled || !drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore — same rationale as pointerdown.
    }
    dragRef.current = null;
    setIsDragging(false);
    commitEnd(drag.last);
  };

  const interactive = !disabled && loadState === 'loaded' && !!imageNatural && !!fit;

  // Latest props/geometry for the native wheel listener (attached once per `interactive`).
  const latest = useRef({ value, imageNatural, fit, aspectRatio, onChange, onChangeEnd });
  latest.current = { value, imageNatural, fit, aspectRatio, onChange, onChangeEnd };
  const wheelEndTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(wheelEndTimer.current), []);
  // Every committed change supersedes a pending wheel debounce.
  const commitEnd = (area: CropArea) => {
    clearTimeout(wheelEndTimer.current);
    onChangeEnd?.(area);
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      const { value, imageNatural, fit, aspectRatio, onChange, onChangeEnd } = latest.current;
      if (!value || !imageNatural || !fit || e.deltaY === 0) return;
      e.preventDefault();
      const px =
        e.deltaY *
        (e.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? WHEEL_LINE_PX
          : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1);
      const next = scaleCrop(
        normalizeCrop(value, imageNatural, aspectRatio),
        Math.exp(px * WHEEL_K),
        imageNatural,
        MIN_BOX_PX / fit.scale,
        aspectRatio,
      );
      // Consecutive ticks before the parent re-renders must compound.
      latest.current.value = next;
      onChange(next);
      clearTimeout(wheelEndTimer.current);
      wheelEndTimer.current = setTimeout(() => onChangeEnd?.(next), WHEEL_END_MS);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [interactive]);

  const resetTo = (ratio: number | undefined) => {
    if (!imageNatural) return;
    const d = defaultCropArea(imageNatural, ratio);
    onChange(d);
    commitEnd(d);
  };
  const reset = () => resetTo(aspectRatio);
  const selectedRatio = aspectRatios?.findIndex((o) => o.value === aspectRatio) ?? -1;
  const pickRatio = (i: string) => {
    const option = aspectRatios?.[Number(i)];
    if (!option || option.value === aspectRatio) return;
    onAspectRatioChange?.(option.value);
    resetTo(option.value);
  };

  // Keyboard: arrows nudge the box, Shift+arrows resize it, Home/End jump to the image corners.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !imageNatural || !value || !fit) return;
    const from = normalizeCrop(value, imageNatural, aspectRatio);
    const STEP = 5; // source-image pixels
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    };
    const arrow = arrows[e.key];
    let next: CropArea;
    if (arrow && e.shiftKey) {
      // Ratio-locked: any grow/shrink key moves both axes so the ratio solver has room.
      const [dx, dy] =
        aspectRatio === undefined ? arrow : [arrow[0] + arrow[1], arrow[0] + arrow[1]];
      next = resizeCrop(from, 'se', dx, dy, imageNatural, MIN_BOX_PX / fit.scale, aspectRatio);
    } else if (arrow) {
      next = moveCrop(from, arrow[0], arrow[1], imageNatural);
    } else if (e.key === 'Home') {
      next = moveCrop(from, -Infinity, -Infinity, imageNatural);
    } else if (e.key === 'End') {
      next = moveCrop(from, Infinity, Infinity, imageNatural);
    } else {
      return;
    }
    e.preventDefault();
    if (
      next.x === from.x &&
      next.y === from.y &&
      next.width === from.width &&
      next.height === from.height
    ) {
      return;
    }
    onChange(next);
    commitEnd(next);
  };

  const imageStyle: CSSProperties =
    fit && imageNatural
      ? { transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})` }
      : { display: 'none' };
  // Draw the normalized area so a stale / out-of-bounds value never paints outside the image.
  const shown =
    fit && value && imageNatural ? normalizeCrop(value, imageNatural, aspectRatio) : null;
  const boxStyle: CSSProperties | undefined =
    fit && shown
      ? {
          left: fit.offsetX + shown.x * fit.scale,
          top: fit.offsetY + shown.y * fit.scale,
          width: shown.width * fit.scale,
          height: shown.height * fit.scale,
        }
      : undefined;
  const handles = aspectRatio === undefined ? [...CORNERS, ...EDGES] : CORNERS;

  return (
    // {...rest} last so a consumer-provided onClick / aria-* / data-* overrides nothing the component owns.
    <div ref={ref} className={clsx(styles.root, disabled && styles.disabled, className)} {...rest}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="group"
        aria-label={t('imageCrop.label')}
        aria-describedby={hintId}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onDoubleClick={interactive ? reset : undefined}
      >
        <span id={hintId} className={styles.srOnly}>
          {t('imageCrop.keyboardHint')}
        </span>
        {loadState === 'loading' && <Skeleton variant="rectangular" className={styles.skeleton} />}
        {loadState === 'error' && (
          <div className={styles.errorState}>{t('imageCrop.loadError')}</div>
        )}
        {resolvedSrc && (
          /* alt is intentionally empty; the cropping interaction IS the meaning, consumer overrides via rest if needed. */
          <img
            ref={imageRef}
            src={resolvedSrc}
            alt=""
            className={styles.image}
            style={imageStyle}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
          />
        )}
        {loadState === 'loaded' && boxStyle && (
          <div
            data-crop-box=""
            className={clsx(styles.cropBox, isDragging && styles.cropBoxActive)}
            style={boxStyle}
            onPointerDown={(e) => startDrag(e, 'move')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
          >
            <div className={styles.grid} />
            {handles.map((h) => (
              <div
                key={h}
                data-handle={h}
                className={clsx(styles.handle, styles[`handle_${h}`])}
                onPointerDown={(e) => startDrag(e, h)}
              />
            ))}
          </div>
        )}
        {loadState === 'loaded' && hasToolbar && (
          <div className={styles.toolbar} onDoubleClick={(e) => e.stopPropagation()}>
            {hasRatios && (
              <ButtonGroup
                size="sm"
                disabled={disabled}
                value={selectedRatio >= 0 ? String(selectedRatio) : ''}
                onValueChange={pickRatio}
                aria-label={t('imageCrop.aspectRatio')}
              >
                {aspectRatios.map((o, i) => (
                  <ButtonGroup.Item key={i} value={String(i)}>
                    {o.label}
                  </ButtonGroup.Item>
                ))}
              </ButtonGroup>
            )}
            {showReset && (
              <Button variant="secondary" size="sm" disabled={disabled} onClick={reset}>
                {t('imageCrop.reset')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
