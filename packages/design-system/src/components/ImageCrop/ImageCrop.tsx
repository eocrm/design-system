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
import { Slider } from '../Slider';
import { Skeleton } from '../Skeleton';
import type { CropArea } from './extractCropBlob';
import styles from './ImageCrop.module.scss';

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
   * use the component's default centered crop (the largest centered region
   * matching `aspectRatio` at zoom=1). The component computes the visual
   * position from this + the image's natural size + the viewport size.
   */
  value: CropArea | null;
  /** Fires on every drag/zoom tick. High frequency. */
  onChange: (area: CropArea) => void;
  /** Fires once when the user releases the drag or releases the zoom slider thumb. */
  onChangeEnd?: (area: CropArea) => void;
  /**
   * Fixed aspect ratio for the crop box (e.g. `1` for square, `16/9` for
   * landscape, `4/3` for traditional photo). Omit for free aspect — the crop
   * box fills the entire viewport and the user controls the cropped region
   * via zoom only.
   *
   * Typically a stable prop from the consumer (set once per page). Toggling
   * `aspectRatio` at runtime updates the crop box dimensions but does NOT
   * automatically re-fit `value` to the new ratio — pass a fresh `value`
   * (or `null` for the new default) when you change ratios.
   */
  aspectRatio?: number;
  /** Minimum zoom level. Default `1` (image fits viewport at zoom=1). */
  minZoom?: number;
  /** Maximum zoom level. Default `3`. */
  maxZoom?: number;
  /**
   * Render the embedded `<Slider>` zoom control below the canvas. Default
   * `true`. Set `false` for a pure canvas with no zoom UI — but the
   * component's internal zoom state isn't exposed (v2 feature).
   */
  showZoomControl?: boolean;
  /**
   * Disable all interaction (drag, zoom). Default `false`. Image still
   * renders; the zoom slider is also disabled.
   */
  disabled?: boolean;
}

/**
 * Compute the viewport-space crop box dimensions given the viewport and
 * optional aspect ratio. Returns the largest centered rectangle inside the
 * viewport that satisfies the ratio. If `aspectRatio` is undefined, the box
 * fills the viewport.
 */
function computeCropBox(
  viewportWidth: number,
  viewportHeight: number,
  aspectRatio: number | undefined,
): { boxW: number; boxH: number } {
  if (aspectRatio === undefined) {
    return { boxW: viewportWidth, boxH: viewportHeight };
  }
  // Largest centered rectangle in viewport satisfying aspectRatio.
  const fitByWidth = viewportWidth;
  const fitByHeight = viewportHeight * aspectRatio;
  const boxW = Math.min(fitByWidth, fitByHeight);
  const boxH = boxW / aspectRatio;
  return { boxW, boxH };
}

/**
 * Default centered crop region given image natural size + viewport box
 * dimensions. The default fits the box's aspect inside the image, centered.
 */
function defaultCropArea(
  imageWidth: number,
  imageHeight: number,
  boxW: number,
  boxH: number,
): CropArea {
  const boxAspect = boxW / boxH;
  const imageAspect = imageWidth / imageHeight;
  let cropW: number;
  let cropH: number;
  if (imageAspect > boxAspect) {
    // Image is wider than the box. Match heights; trim sides.
    cropH = imageHeight;
    cropW = cropH * boxAspect;
  } else {
    // Image is taller. Match widths; trim top/bottom.
    cropW = imageWidth;
    cropH = cropW / boxAspect;
  }
  return {
    x: (imageWidth - cropW) / 2,
    y: (imageHeight - cropH) / 2,
    width: cropW,
    height: cropH,
  };
}

/**
 * Clamp a crop area so it stays inside the image bounds. Preserves width
 * and height; only shifts x/y if needed.
 */
function clampCropArea(area: CropArea, imageWidth: number, imageHeight: number): CropArea {
  const maxX = Math.max(0, imageWidth - area.width);
  const maxY = Math.max(0, imageHeight - area.height);
  return {
    x: Math.max(0, Math.min(maxX, area.x)),
    y: Math.max(0, Math.min(maxY, area.y)),
    width: area.width,
    height: area.height,
  };
}

/**
 * Controlled, inline image-crop primitive built on `<canvas>` with Pattern-A
 * drag: the crop box stays centered in the viewport; the user drags the
 * IMAGE to reposition the source region under the box. Zoom adjusts via an
 * embedded `<Slider>`.
 *
 * Output is produced via the top-level `extractCropBlob` utility (NOT a ref
 * method) — pure-declarative pattern. Consumer holds the crop area state,
 * calls `extractCropBlob(src, area, options)` in their Save handler to
 * produce the cropped Blob.
 *
 * @example
 * // Profile photo crop with square aspect:
 * const [crop, setCrop] = useState<CropArea | null>(null);
 * const handleSave = async () => {
 *   if (!crop) return;
 *   const blob = await extractCropBlob(file, crop, {
 *     type: 'image/jpeg',
 *     quality: 0.9,
 *     outputWidth: 512,
 *   });
 *   onComplete(blob);
 * };
 * return <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />;
 *
 * @example
 * // Free-aspect crop (no aspectRatio prop):
 * <ImageCrop src={imageUrl} value={crop} onChange={setCrop} />
 *
 * @example
 * // Inside a Modal (the canonical "pick → crop → save" flow):
 * <Modal isOpen onClose={cancel}>
 *   <Modal.Header>Crop your photo</Modal.Header>
 *   <Modal.Body>
 *     <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Button variant="secondary" onClick={cancel}>Cancel</Button>
 *     <Button onClick={handleSave} disabled={!crop}>Save</Button>
 *   </Modal.Footer>
 * </Modal>
 *
 * @remarks When NOT to use
 * - For server-side cropping. Pass `value` (CropArea coords) to your backend
 *   instead of using `extractCropBlob`.
 * - For circular avatars. Crop rectangular, then CSS-mask in the consumer.
 * - For rotation. v1 doesn't rotate. Use a future v2 or rotate server-side.
 * - For multi-touch / pinch-zoom. v1 is single-pointer drag + slider zoom.
 *
 * @remarks Anti-patterns
 * - ❌ Hand-rolling a `<canvas>` + drag math per page. Use this.
 * - ❌ Calling `extractCropBlob` on every `onChange` tick. The encode is
 *   expensive — call ONCE in the Save handler.
 * - ❌ Wrapping `<img>` in CSS clip-path for a "crop preview" — that doesn't
 *   produce a cropped Blob. Use `extractCropBlob`.
 * - ❌ `<ImageCrop ref={ref}>` expecting a `.getBlob()` method. There's no
 *   imperative API. Use the top-level `extractCropBlob(src, value)` utility.
 */
export const ImageCrop = forwardRef<HTMLDivElement, ImageCropProps>(function ImageCrop(
  {
    src,
    value,
    onChange,
    onChangeEnd,
    aspectRatio,
    minZoom = 1,
    maxZoom = 3,
    showZoomControl = true,
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
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

  // Image load state + natural dimensions. Reset whenever src changes.
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageNatural, setImageNatural] = useState<{ width: number; height: number } | null>(
    null,
  );
  useEffect(() => {
    setLoadState('loading');
    setImageNatural(null);
  }, [resolvedSrc]);

  // Viewport size — measured after layout via getBoundingClientRect. We
  // re-measure on mount AND on window resize.
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  useLayoutEffect(() => {
    const measure = () => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Internal zoom state (1.0 = fit). The embedded Slider drives this; we
  // recompute value whenever zoom changes.
  const [zoom, setZoom] = useState<number>(minZoom);

  // Compute viewport-space crop box dimensions.
  const { boxW, boxH } = useMemo(
    () => computeCropBox(viewport.width, viewport.height, aspectRatio),
    [viewport.width, viewport.height, aspectRatio],
  );

  // Initialize value on first load if consumer passed null. Fire onChange
  // once with the default so the consumer's controlled state catches up.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (loadState !== 'loaded' || !imageNatural || initializedRef.current) return;
    if (value === null && boxW > 0 && boxH > 0) {
      const defaultArea = defaultCropArea(imageNatural.width, imageNatural.height, boxW, boxH);
      initializedRef.current = true;
      onChange(defaultArea);
    } else if (value !== null) {
      initializedRef.current = true;
    }
  }, [loadState, imageNatural, value, boxW, boxH, onChange]);

  // Reset initialization flag on src change so the new image gets its
  // default crop applied.
  useEffect(() => {
    initializedRef.current = false;
  }, [resolvedSrc]);

  // Clean up any in-flight drag if disabled flips to true mid-gesture —
  // otherwise the .imageDragging cursor stays stuck until the next pointerdown.
  useEffect(() => {
    if (disabled) {
      dragStateRef.current = null;
      setIsDragging(false);
    }
  }, [disabled]);

  // Drag state: pointer-down captures the starting position and the value
  // snapshot. Drag is in a ref (not state) so handlers read it synchronously.
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startValue: CropArea;
    scale: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Compute visual scale + image translate position from the current value.
  // The image is rendered with transform: translate + scale.
  const imageTransform = useMemo(() => {
    if (!imageNatural || !value || boxW === 0 || boxH === 0) {
      return { display: 'none' as const };
    }
    const scale = boxW / value.width;
    const boxLeft = (viewport.width - boxW) / 2;
    const boxTop = (viewport.height - boxH) / 2;
    const originX = boxLeft - value.x * scale;
    const originY = boxTop - value.y * scale;
    return {
      transform: `translate(${originX}px, ${originY}px) scale(${scale})`,
    } satisfies CSSProperties;
  }, [imageNatural, value, boxW, boxH, viewport.width, viewport.height]);

  // Apply a new crop value with clamping, then fire onChange.
  const applyValue = useCallback(
    (next: CropArea) => {
      if (!imageNatural) return;
      const clamped = clampCropArea(next, imageNatural.width, imageNatural.height);
      onChange(clamped);
    },
    [imageNatural, onChange],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLImageElement>) => {
      if (disabled || !imageNatural || !value || boxW === 0) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // jsdom or pre-PointerEvents browsers — drag still works via pointermove.
      }
      const scale = boxW / value.width;
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startValue: { ...value },
        scale,
      };
      setIsDragging(true);
    },
    [disabled, imageNatural, value, boxW],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLImageElement>) => {
      if (disabled || !dragStateRef.current) return;
      const { startX, startY, startValue, scale } = dragStateRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Sign flip: pointer right pans image right (in viewport) which moves
      // the crop region LEFT (the user is showing more of the right side).
      const next: CropArea = {
        x: startValue.x - dx / scale,
        y: startValue.y - dy / scale,
        width: startValue.width,
        height: startValue.height,
      };
      applyValue(next);
    },
    [applyValue, disabled],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLImageElement>) => {
      if (disabled || !dragStateRef.current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore — same rationale as pointerdown.
      }
      dragStateRef.current = null;
      setIsDragging(false);
      if (value) onChangeEnd?.(value);
    },
    [disabled, onChangeEnd, value],
  );

  // Zoom handler — recompute value dimensions, keep center, clamp.
  const handleZoomChange = useCallback(
    (sliderValue: number | [number, number]) => {
      if (disabled || !imageNatural || !value || boxW === 0) return;
      const newZoom = typeof sliderValue === 'number' ? sliderValue : sliderValue[0];
      setZoom(newZoom);
      const newWidth = boxW / newZoom;
      const newHeight = boxH / newZoom;
      const centerX = value.x + value.width / 2;
      const centerY = value.y + value.height / 2;
      const next: CropArea = {
        x: centerX - newWidth / 2,
        y: centerY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
      applyValue(next);
    },
    [applyValue, boxW, boxH, disabled, imageNatural, value],
  );

  const handleZoomChangeEnd = useCallback(() => {
    if (value) onChangeEnd?.(value);
  }, [onChangeEnd, value]);

  // Keyboard handler — arrows pan, Home/End jump, PageUp/Down zoom.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !imageNatural || !value) return;
      const PAN_STEP = 5; // source-image pixels
      const ZOOM_STEP = 0.25;
      let next: CropArea | null = null;
      switch (e.key) {
        case 'ArrowLeft':
          next = { ...value, x: value.x - PAN_STEP };
          break;
        case 'ArrowRight':
          next = { ...value, x: value.x + PAN_STEP };
          break;
        case 'ArrowUp':
          next = { ...value, y: value.y - PAN_STEP };
          break;
        case 'ArrowDown':
          next = { ...value, y: value.y + PAN_STEP };
          break;
        case 'Home':
          next = { ...value, x: 0, y: 0 };
          break;
        case 'End':
          next = {
            ...value,
            x: imageNatural.width - value.width,
            y: imageNatural.height - value.height,
          };
          break;
        case 'PageUp':
          handleZoomChange(Math.min(maxZoom, zoom + ZOOM_STEP));
          e.preventDefault();
          return;
        case 'PageDown':
          handleZoomChange(Math.max(minZoom, zoom - ZOOM_STEP));
          e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault();
      if (next) applyValue(next);
    },
    [applyValue, disabled, handleZoomChange, imageNatural, maxZoom, minZoom, value, zoom],
  );

  return (
    // {...rest} last so a consumer-provided onClick / aria-* / data-* overrides nothing the component owns.
    <div
      ref={ref}
      className={clsx(styles.root, disabled && styles.disabled, className)}
      {...rest}
    >
      <div
        ref={viewportRef}
        className={styles.viewport}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {loadState === 'loading' && (
          <Skeleton variant="rectangular" className={styles.skeleton} />
        )}
        {loadState === 'error' && (
          <div className={styles.errorState}>Couldn't load image</div>
        )}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is intentionally empty; the cropping interaction IS the meaning, consumer overrides via rest if needed. */}
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt=""
          className={clsx(styles.image, isDragging && styles.imageDragging)}
          style={imageTransform}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          draggable={false}
        />
        {loadState === 'loaded' && (
          <div
            className={styles.cropBox}
            style={{ width: boxW, height: boxH } satisfies CSSProperties}
          />
        )}
      </div>
      {showZoomControl && (
        <Slider
          className={styles.zoomControl}
          value={zoom}
          onChange={handleZoomChange}
          onChangeEnd={handleZoomChangeEnd}
          min={minZoom}
          max={maxZoom}
          step={0.01}
          disabled={disabled || loadState !== 'loaded'}
          aria-label="Zoom"
        />
      )}
    </div>
  );
});
