import {
  forwardRef,
  useCallback,
  useEffect,
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
import { Skeleton } from '../Skeleton';
import { useTranslation } from '../../i18n/useTranslation';
import type { CropArea } from './extractCropBlob';
import {
  defaultCropArea,
  fitImage,
  moveCrop,
  normalizeCrop,
  resizeCrop,
  type Handle,
} from './cropGeometry';
import styles from './ImageCrop.module.scss';

// Mirrors --image-crop-fit-padding (var(--space-4)); TS needs a number for layout math.
const FIT_PADDING = 16;
// Bottom space kept free for the on-canvas toolbar.
const TOOLBAR_RESERVE = 56;
// Smallest crop box edge, in screen px.
const MIN_BOX_PX = 32;

const CORNERS: Handle[] = ['nw', 'ne', 'sw', 'se'];
const EDGES: Handle[] = ['n', 's', 'e', 'w'];

// Re-export from the utility so consumers have a single import for the type.
export type { CropArea } from './extractCropBlob';

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
  /** Fires once when the user releases a drag or resize. */
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
}

/**
 * Controlled, inline image-crop primitive: drag and resize a crop box over a still image.
 * @see docs/components/ImageCrop.md
 */
export const ImageCrop = forwardRef<HTMLDivElement, ImageCropProps>(function ImageCrop(
  { src, value, onChange, onChangeEnd, aspectRatio, disabled = false, className, ...rest },
  ref,
) {
  const t = useTranslation();
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

  const fit = useMemo(
    () =>
      imageNatural && viewport.width > 0 && viewport.height > 0
        ? fitImage(viewport, imageNatural, FIT_PADDING, TOOLBAR_RESERVE)
        : null,
    [imageNatural, viewport],
  );

  // Initialize value on first load if consumer passed null. Fire onChange
  // once with the default so the consumer's controlled state catches up.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (loadState !== 'loaded' || !imageNatural || initializedRef.current) return;
    if (value === null && fit) {
      initializedRef.current = true;
      onChange(defaultCropArea(imageNatural, aspectRatio));
    } else if (value !== null) {
      initializedRef.current = true;
    }
  }, [loadState, imageNatural, value, fit, aspectRatio, onChange]);

  // Reset initialization flag on src change so the new image gets its
  // default crop applied.
  useEffect(() => {
    initializedRef.current = false;
  }, [resolvedSrc]);

  // Gesture state lives in a ref so handlers read it synchronously.
  const dragRef = useRef<{
    mode: 'move' | Handle;
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
    if (disabled || !imageNatural || !value || !fit) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // jsdom or pre-PointerEvents browsers — drag still works via pointermove.
    }
    const start = normalizeCrop(value, imageNatural, aspectRatio);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start, last: start };
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (disabled || !drag || !imageNatural || !fit) return;
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
    if (disabled || !drag) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore — same rationale as pointerdown.
    }
    dragRef.current = null;
    setIsDragging(false);
    onChangeEnd?.(drag.last);
  };

  // Keyboard: arrows nudge the box, Home/End jump to the image corners.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !imageNatural || !value) return;
    const from = normalizeCrop(value, imageNatural, aspectRatio);
    const STEP = 5; // source-image pixels
    let next: CropArea;
    switch (e.key) {
      case 'ArrowLeft':
        next = moveCrop(from, -STEP, 0, imageNatural);
        break;
      case 'ArrowRight':
        next = moveCrop(from, STEP, 0, imageNatural);
        break;
      case 'ArrowUp':
        next = moveCrop(from, 0, -STEP, imageNatural);
        break;
      case 'ArrowDown':
        next = moveCrop(from, 0, STEP, imageNatural);
        break;
      case 'Home':
        next = moveCrop(from, -Infinity, -Infinity, imageNatural);
        break;
      case 'End':
        next = moveCrop(from, Infinity, Infinity, imageNatural);
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
  };

  const imageStyle: CSSProperties =
    fit && imageNatural
      ? { transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})` }
      : { display: 'none' };
  const boxStyle: CSSProperties | undefined =
    fit && value
      ? {
          left: fit.offsetX + value.x * fit.scale,
          top: fit.offsetY + value.y * fit.scale,
          width: value.width * fit.scale,
          height: value.height * fit.scale,
        }
      : undefined;
  const handles = aspectRatio === undefined ? [...CORNERS, ...EDGES] : CORNERS;

  return (
    // {...rest} last so a consumer-provided onClick / aria-* / data-* overrides nothing the component owns.
    <div ref={ref} className={clsx(styles.root, disabled && styles.disabled, className)} {...rest}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
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
      </div>
    </div>
  );
});
