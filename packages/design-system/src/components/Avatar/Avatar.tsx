import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import styles from './Avatar.module.scss';

/** Diameter. Matches the shared `--size-*` scale so a Button next to an Avatar lines up. */
export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The person's name. Required — used as the `alt`/`aria-label`, as the
   * source of the initials, and as the seed for the deterministic fallback
   * color. The same name always renders the same color.
   */
  name: string;
  /**
   * Image URL. When provided, the `<img>` is rendered with `alt={name}`.
   * Empty/whitespace strings are treated as missing. If the image fails to
   * load (404, network), the component automatically falls back to initials.
   */
  src?: string;
  /**
   * Diameter.
   * - `sm` (24px) — table rows, dense lists.
   * - `md` (32px, default) — most uses.
   * - `lg` (40px) — detail-page headers.
   */
  size?: AvatarSize;
}

const sizeClass: Record<AvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * Returns the avatar color slot (1-6) for a given name. The mapping is stable:
 * the same name always returns the same slot. Useful for matching avatar
 * colors elsewhere (e.g. a "ghost" item or a chart segment representing the
 * same user).
 *
 * Each slot corresponds to a `--color-avatar-N` CSS custom property.
 */
export function avatarColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 6) + 1;
}

// CSS custom properties (--foo) aren't part of CSSProperties' typed keys, so
// we intersect with a template-literal-key map for `--*` entries. Avoids the
// `as never` + `as React.CSSProperties` double-cast.
type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number };

function hasOwnProps(obj: object | undefined): obj is object {
  return obj !== undefined && Object.keys(obj).length > 0;
}

/**
 * Profile circle. Renders an `<img>` when `src` is set; otherwise renders the
 * person's initials on a deterministic color (same name → same color, always —
 * so a given user keeps their color across every page).
 *
 * On image load failure, the component automatically falls back to initials.
 *
 * @example
 * <Avatar name="Alex Rivera" />
 *
 * @example
 * <Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" />
 *
 * @example
 * // In a table row:
 * <Cluster gap="sm" align="center">
 *   <Avatar name={contact.name} size="sm" />
 *   <span>{contact.name}</span>
 * </Cluster>
 *
 * @remarks When NOT to use
 * - For company logos — Avatars are for people. Use a `Logo` component (not
 *   yet shipped) or an `<img>` with rounded corners.
 * - As a clickable button. If clicking opens a profile, wrap the Avatar in
 *   a `<button>` or `<Link>` — don't make the Avatar itself interactive.
 *
 * @remarks Anti-patterns
 * - ❌ `<Avatar name="" />` — `name` is required and is the accessible label.
 * - ❌ Using Avatar to show a non-person icon. Use an icon component instead.
 * - ❌ Wrapping the result with `role="img"` again. The component already
 *   handles ARIA: with `src` set, the inner `<img>` is the labeled image;
 *   without `src`, the wrapper has `role="img" aria-label={name}`.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name, src, size = 'md', className, style, ...props },
  ref,
) {
  // Reset the broken-image flag whenever `src` changes — a new URL deserves
  // a fresh attempt to load.
  const [imageBroken, setImageBroken] = useState(false);
  useEffect(() => {
    setImageBroken(false);
  }, [src]);

  // Treat empty/whitespace `src` as "no image" so we don't render <img src="">.
  // Same effect when the image fails to load — fall back to initials.
  const hasImage =
    typeof src === 'string' && src.trim() !== '' && !imageBroken;

  // Always derive a safe label/alt — even if the consumer passes a whitespace
  // name with an image, we want a meaningful accessible name.
  const trimmedName = name.trim();
  const accessibleName = trimmedName === '' ? '?' : trimmedName;

  const fallbackStyle: StyleWithVars | undefined = hasImage
    ? undefined
    : { '--avatar-bg': `var(--color-avatar-${avatarColorIndex(accessibleName)})` };

  // Only emit a style attribute when we actually have something to set —
  // checking truthiness alone would let an empty `style={{}}` prop emit `style=""`.
  const mergedStyle: StyleWithVars | undefined =
    hasOwnProps(fallbackStyle) || hasOwnProps(style)
      ? { ...fallbackStyle, ...style }
      : undefined;

  if (hasImage) {
    // When showing a real image, the <img> itself carries the image role
    // (with `name` as its alt). The wrapper is just a circular crop — no
    // need to also be role="img".
    //
    // {...props} is spread FIRST so component-owned attributes (className/style)
    // win against any consumer override.
    return (
      <span
        {...props}
        ref={ref}
        className={clsx(styles.avatar, sizeClass[size], className)}
        style={mergedStyle}
      >
        <img
          src={src}
          alt={accessibleName}
          onError={() => setImageBroken(true)}
        />
      </span>
    );
  }

  return (
    <span
      {...props}
      ref={ref}
      role="img"
      aria-label={accessibleName}
      className={clsx(styles.avatar, sizeClass[size], className)}
      style={mergedStyle}
    >
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
});
