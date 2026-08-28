import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { ImageOff } from 'lucide-react';
import { Button } from '../Button';
import { Skeleton } from '../Skeleton';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Image.module.scss';

/** How the image fills its box. Maps to CSS `object-fit`. */
export type ImageObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

/** Corner rounding. Maps to the radius token scale. */
export type ImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

/** Fixed square size, aligned to the shared `--size-*` scale (xs 20 / sm 24 / md 32 / lg 40 px). */
export type ImageSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'children' | 'src' | 'loading' | 'onClick'
> {
  /** Image URL. Changing it resets the component to the loading state. */
  src: string;
  /**
   * Alternative text (required). Describe the image's content or function.
   * Pass an empty string (`alt=""`) for purely decorative images.
   */
  alt: string;
  /**
   * How the image fills its box. Defaults to `'cover'`.
   * - `'cover'` — fill + crop (no distortion). Best for thumbnails / heroes.
   * - `'contain'` — whole image, letterboxed on the box background.
   * - `'fill'` — stretch to the box (may distort).
   * - `'none'` / `'scale-down'` — native size / the smaller of none|contain.
   */
  objectFit?: ImageObjectFit;
  /**
   * Reserve the box at a fixed ratio to prevent layout shift while loading.
   * Number (`1.5`) or CSS string (`'16 / 9'`).
   */
  aspectRatio?: string | number;
  /**
   * Render a fixed **square** box of this size (from the shared `--size-*`
   * scale: `'xs'` 20 / `'sm'` 24 / `'md'` 32 / `'lg'` 40 px) instead of filling
   * the container's width. Use for dense thumbnails (e.g. a 40px image cell in a
   * table row) so you don't need a consumer-owned fixed-width wrapper. Omit for
   * the default responsive behavior. When set, `aspectRatio` is ignored (the box
   * is already square); pair with `objectFit="cover"` to crop.
   */
  size?: ImageSize;
  /**
   * Corner rounding. Defaults to `'md'`. Pass `'none'` for square corners; for
   * circular profile images use `<Avatar>`.
   */
  radius?: ImageRadius;
  /**
   * Custom node rendered in place of the default broken-image placeholder when
   * the image fails to load. Overrides the icon + message + retry entirely.
   */
  fallback?: ReactNode;
  /**
   * Native lazy-loading hint. Defaults to `'lazy'`. Pass `'eager'` for
   * above-the-fold / LCP images.
   */
  loading?: 'eager' | 'lazy';
  /**
   * Make the image a flush, keyboard-accessible click target — renders the image
   * inside a chromeless `<button>` (no padding/border/background; DS focus ring on
   * `:focus-visible`). Implied when `onClick` is set. Use for a thumbnail that opens
   * a preview/lightbox. The broken-image error state is non-interactive (its retry
   * control takes over).
   */
  interactive?: boolean;
  /**
   * Click handler for the interactive trigger. Setting it implies `interactive`.
   * Fires on click and on Enter/Space (native `<button>` keyboard behavior).
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /**
   * Accessible label for the interactive trigger — action-oriented, e.g.
   * `"Preview report.png"`. Defaults to `alt`. Only used when interactive. Note:
   * a native `aria-label` passed via `{...rest}` lands on the `<img>`, not the
   * trigger button — use `ariaLabel` to name the trigger.
   */
  ariaLabel?: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

const RADIUS_CLASS: Record<ImageRadius, string> = {
  none: styles.radiusNone,
  sm: styles.radiusSm,
  md: styles.radiusMd,
  lg: styles.radiusLg,
  full: styles.radiusFull,
};

const SIZE_CLASS: Record<ImageSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * Displays a remote image with built-in loading and error states. Reserves its
 * box (no layout shift), shows a `Skeleton` while loading, fades in on load, and
 * degrades to a compact, accessible broken-image placeholder (with retry) on
 * failure.
 *
 * The wrapper fills its container's width — give it an `aspectRatio` (or a
 * height) so the box is reserved before the image arrives — UNLESS you pass
 * `size`, which renders a fixed square box (e.g. a table-cell thumbnail).
 * `className` / `style` apply to the wrapper box; `ref` forwards to the
 * underlying `<img>`. The wrapper owns sizing: rendered height comes from `size`
 * or `aspectRatio` (or the container), and native `width`/`height` attrs on the
 * `<img>` are intrinsic-ratio hints only, not the rendered size.
 *
 * @example
 * // Responsive 16:9 thumbnail
 * <Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
 *
 * @example
 * // Fixed 40px square thumbnail (e.g. a dense table cell) — no width:100% stretch
 * <Image src={url} alt="report.pdf preview" size="lg" objectFit="cover" />
 *
 * @example
 * // Contain a logo on its muted box, square corners
 * <Image src={logo} alt="Acme Corp" objectFit="contain" radius="none" />
 *
 * @example
 * // Eager above-the-fold hero with a custom error fallback
 * <Image
 *   src={hero}
 *   alt="Welcome aboard"
 *   loading="eager"
 *   aspectRatio={2}
 *   fallback={<EmptyState title="Couldn't load the hero image" />}
 * />
 *
 * @example
 * // Flush, keyboard-accessible thumbnail that opens a preview (no button chrome):
 * <Image
 *   src={att.url}
 *   alt={att.filename}
 *   size="lg"
 *   objectFit="cover"
 *   onClick={() => openPreview(att)}
 *   ariaLabel={`Preview ${att.filename}`}
 * />
 *
 * @remarks When NOT to use
 * - Circular profile / identity images → use `<Avatar>` (initials fallback).
 * - Cropping / zoom UI → use `<ImageCrop>`.
 * - Decorative CSS backgrounds → use a `background-image`, not a content `<img>`.
 * - Icons / vector glyphs → use a `lucide-react` icon or inline SVG.
 *
 * @remarks Anti-patterns
 * - ❌ Empty `alt` for a meaningful image — pass a real description.
 * - ❌ No `aspectRatio` / height when you care about layout shift — reserve the box.
 * - ❌ Wrapping `<Image>` in a `<Button>` / `<Link>` for a clickable thumbnail — that
 *   paints button/link chrome over it. Use `interactive` / `onClick` for a flush trigger.
 */
export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    alt,
    objectFit = 'cover',
    aspectRatio,
    size,
    radius = 'md',
    fallback,
    loading = 'lazy',
    interactive,
    onClick,
    ariaLabel,
    className,
    style,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [state, setState] = useState<LoadState>('loading');
  const [reloadNonce, setReloadNonce] = useState(0);

  // Reset to loading whenever the source changes (the Avatar pattern).
  useEffect(() => {
    setState('loading');
  }, [src]);

  const retry = () => {
    setState('loading');
    setReloadNonce((n) => n + 1); // re-key the <img> to force a re-fetch
  };

  const wrapperStyle = {
    // A fixed `size` sets an explicit square box, so aspectRatio is moot.
    aspectRatio:
      size !== undefined || aspectRatio === undefined
        ? undefined
        : typeof aspectRatio === 'number'
          ? String(aspectRatio)
          : aspectRatio,
    '--image-object-fit': objectFit,
    ...style,
  } as CSSProperties;

  const isInteractive = interactive || onClick != null;

  const imgNode = (
    // {...rest} FIRST (Pattern B): the state machine owns src/alt/key/onLoad/onError,
    // so a careless spread can't break them.
    <img
      {...rest}
      key={reloadNonce}
      ref={ref}
      src={src}
      alt={state === 'error' ? '' : alt}
      aria-hidden={state === 'error' || undefined}
      loading={loading}
      className={styles.img}
      onLoad={() => setState('loaded')}
      onError={() => setState('error')}
    />
  );

  const loadingOverlay =
    state === 'loading' ? <Skeleton variant="rectangular" className={styles.overlay} /> : null;

  return (
    <span
      className={clsx(styles.wrapper, RADIUS_CLASS[radius], size && SIZE_CLASS[size], className)}
      style={wrapperStyle}
      data-state={state}
    >
      {isInteractive ? (
        <button
          type="button"
          className={styles.trigger}
          onClick={onClick}
          aria-label={ariaLabel ?? alt}
          disabled={state === 'error'}
        >
          {imgNode}
          {loadingOverlay}
        </button>
      ) : (
        <>
          {imgNode}
          {loadingOverlay}
        </>
      )}

      {state === 'error' &&
        (fallback ?? (
          <span
            className={styles.error}
            role="img"
            /* Concatenated, not `alt || …`. With the fallback form the failure
               word was dropped whenever `alt` was set — i.e. in the normal
               case — so the name read as if the image had loaded. The sibling
               branch in Lightbox already concatenates. */
            aria-label={alt ? `${alt}: ${t('image.loadError')}` : t('image.loadError')}
          >
            <ImageOff size={28} aria-hidden="true" />
            <span className={styles.errorText}>{t('image.loadError')}</span>
            <Button variant="secondary" size="sm" onClick={retry}>
              {t('image.retry')}
            </Button>
          </span>
        ))}
    </span>
  );
});
