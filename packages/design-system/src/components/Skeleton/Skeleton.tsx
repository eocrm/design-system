import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Skeleton.module.scss';

/** Shape preset. */
export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

/** Animation style. */
export type SkeletonAnimation = 'pulse' | 'none';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Shape preset. Defaults to `'text'`.
   * - `'text'` — inline-block; `height` defaults to `1em` so it sits on text
   *   baselines. Use inside paragraphs / labels for word-shaped placeholders.
   * - `'circular'` — `border-radius: 50%`; when only one of `width`/`height`
   *   is set, the other matches (square). Avatar / icon placeholder.
   * - `'rectangular'` — block, small radius. Image / card / button placeholder.
   */
  variant?: SkeletonVariant;

  /** Explicit width. Number → px, string → as-is (e.g., `'60%'`, `'12rem'`). */
  width?: number | string;

  /**
   * Explicit height. Number → px, string → as-is.
   * Defaults: `text` → `1em`, `circular` → matches `width` (square),
   * `rectangular` → no default (consumer must size).
   */
  height?: number | string;

  /**
   * Animation. Defaults to `'pulse'`.
   * - `'pulse'` — opacity 1 → 0.6 → 1, 1.5s ease-in-out infinite.
   * - `'none'` — static. Use when stacking many skeletons to avoid motion
   *   overload.
   *
   * Regardless of this prop, animation is suppressed when the user has
   * `prefers-reduced-motion: reduce`.
   */
  animation?: SkeletonAnimation;
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Placeholder rectangle for loading states. Consumers compose multiple
 * `<Skeleton>`s in any layout to mimic the eventual content shape.
 *
 * @example
 * // Single text line (inline with surrounding text):
 * <Skeleton width={120} />
 *
 * @example
 * // Avatar + two text lines + button (the canonical "list row loading"):
 * <Cluster gap="md" align="center">
 *   <Skeleton variant="circular" width={32} />
 *   <Stack gap="xs" style={{ flex: 1 }}>
 *     <Skeleton width="60%" />
 *     <Skeleton width="40%" />
 *   </Stack>
 *   <Skeleton variant="rectangular" width={80} height={32} />
 * </Cluster>
 *
 * @example
 * // Many rows — disable animation to avoid motion overload:
 * {Array.from({ length: 20 }).map((_, i) => (
 *   <Skeleton key={i} variant="rectangular" height={32} animation="none" />
 * ))}
 *
 * @remarks When NOT to use
 * - When loading takes < 200ms — flashing a skeleton then content jitters
 *   the layout. Render the real content directly.
 * - For empty states ("No contacts yet"). Use `<EmptyState>` (not yet
 *   shipped) — a skeleton implies "loading," not "nothing here."
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping real content in a Skeleton ("just hide everything"). The
 *   primitive is a leaf — don't pass children.
 * - ❌ Omitting all dimensions on `rectangular`. With no `width`/`height`,
 *   the box has zero size and renders invisibly. Always size it.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { variant = 'text', width, height, animation = 'pulse', className, style, ...props },
  ref,
) {
  // Default height: text → 1em (sits on baseline), circular → matches width
  // (square), rectangular → undefined (consumer must size).
  let resolvedHeight: string | undefined = toCssSize(height);
  if (resolvedHeight === undefined) {
    if (variant === 'text') resolvedHeight = '1em';
    else if (variant === 'circular' && width !== undefined) resolvedHeight = toCssSize(width);
  }

  // Default width: circular with only height set → matches height (square).
  let resolvedWidth: string | undefined = toCssSize(width);
  if (resolvedWidth === undefined && variant === 'circular' && height !== undefined) {
    resolvedWidth = toCssSize(height);
  }

  const mergedStyle: CSSProperties = {
    width: resolvedWidth,
    height: resolvedHeight,
    ...style,
  };

  // Spread order: ref + aria-hidden BEFORE {...props} so a consumer can
  // override aria-hidden (e.g., for a Skeleton that IS the loading
  // announcement on a page with no parent live region). className and
  // style live AFTER {...props} so the component's class composition +
  // dimension style win over any consumer-supplied raw className / style
  // (consumer composes via the prop, not by replacing).
  return (
    <span
      ref={ref}
      aria-hidden="true"
      {...props}
      className={clsx(
        styles.skeleton,
        styles[`variant-${variant}`],
        animation === 'pulse' && styles.pulse,
        className,
      )}
      style={mergedStyle}
    />
  );
});
