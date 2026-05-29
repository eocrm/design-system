import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
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

export interface ImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'children' | 'src' | 'loading'
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
}

type LoadState = 'loading' | 'loaded' | 'error';

const RADIUS_CLASS: Record<ImageRadius, string> = {
  none: styles.radiusNone,
  sm: styles.radiusSm,
  md: styles.radiusMd,
  lg: styles.radiusLg,
  full: styles.radiusFull,
};

/**
 * Displays a remote image with built-in loading and error states. Reserves its
 * box (no layout shift), shows a `Skeleton` while loading, fades in on load, and
 * degrades to a compact, accessible broken-image placeholder (with retry) on
 * failure.
 *
 * The wrapper fills its container's width — give it an `aspectRatio` (or a
 * height) so the box is reserved before the image arrives. `className` / `style`
 * apply to the wrapper box; `ref` forwards to the underlying `<img>`. The wrapper
 * owns sizing: rendered height comes from `aspectRatio` (or the container), and
 * native `width`/`height` attrs on the `<img>` are intrinsic-ratio hints only,
 * not the rendered size.
 *
 * @example
 * // Responsive 16:9 thumbnail
 * <Image src={url} alt="Quarterly revenue chart" aspectRatio="16 / 9" />
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
 * @remarks When NOT to use
 * - Circular profile / identity images → use `<Avatar>` (initials fallback).
 * - Cropping / zoom UI → use `<ImageCrop>`.
 * - Decorative CSS backgrounds → use a `background-image`, not a content `<img>`.
 * - Icons / vector glyphs → use a `lucide-react` icon or inline SVG.
 *
 * @remarks Anti-patterns
 * - ❌ Empty `alt` for a meaningful image — pass a real description.
 * - ❌ No `aspectRatio` / height when you care about layout shift — reserve the box.
 */
export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    alt,
    objectFit = 'cover',
    aspectRatio,
    radius = 'md',
    fallback,
    loading = 'lazy',
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
    aspectRatio:
      aspectRatio === undefined
        ? undefined
        : typeof aspectRatio === 'number'
          ? String(aspectRatio)
          : aspectRatio,
    '--image-object-fit': objectFit,
    ...style,
  } as CSSProperties;

  return (
    <span
      className={clsx(styles.wrapper, RADIUS_CLASS[radius], className)}
      style={wrapperStyle}
      data-state={state}
    >
      {/* {...rest} FIRST (Pattern B): the state machine owns
          src/alt/key/onLoad/onError, so a careless spread can't break them. */}
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

      {state === 'loading' && <Skeleton variant="rectangular" className={styles.overlay} />}

      {state === 'error' &&
        (fallback ?? (
          <span className={styles.error} role="img" aria-label={alt || t('image.loadError')}>
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
