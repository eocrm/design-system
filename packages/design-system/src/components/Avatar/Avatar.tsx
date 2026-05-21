import { forwardRef, useEffect, useState, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Tooltip } from '../Tooltip';
import { useAvatarGroup } from './AvatarGroupContext';
import styles from './Avatar.module.scss';

/** Diameter. Matches the shared `--size-*` scale so a Button next to an Avatar lines up. */
export type AvatarSize = 'sm' | 'md' | 'lg';

/** Presence dot rendered in the bottom-right corner. Omit to render no dot. */
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The person's name. Required — used as the `alt`/`aria-label`, as the
   * source of the initials, and as the seed for the deterministic fallback
   * color. The same name always renders the same color. When `tooltip` is
   * true, also used as the tooltip body.
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
   *
   * Inside `<AvatarGroup>`, the group's `size` overrides this.
   */
  size?: AvatarSize;
  /**
   * Presence dot in the bottom-right.
   * - `'online'`  — green.
   * - `'busy'`    — red.
   * - `'away'`    — amber.
   * - `'offline'` — gray.
   * Omit to render no dot at all.
   */
  status?: AvatarStatus;
  /**
   * When true, wraps the avatar in a `<Tooltip>` showing `name`. Defaults
   * to `false`. Inside `<AvatarGroup>` the default flips to the group's
   * `tooltip` prop (default `true`).
   */
  tooltip?: boolean;
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
 * Inside `<AvatarGroup>`, the group's `size` and `tooltip` defaults take over —
 * individual `size` / `tooltip` props still win per-child.
 *
 * @example
 * <Avatar name="Alex Rivera" />
 *
 * @example
 * <Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" status="online" />
 *
 * @example
 * // Hover-discoverable name:
 * <Avatar name="Alex Rivera" tooltip />
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
  { name, src, size, status, tooltip, className, style, ...props },
  ref,
) {
  const group = useAvatarGroup();
  const resolvedSize: AvatarSize = size ?? group?.size ?? 'md';
  const resolvedTooltip: boolean = tooltip ?? group?.tooltip ?? true;

  const [imageBroken, setImageBroken] = useState(false);
  useEffect(() => {
    setImageBroken(false);
  }, [src]);

  const hasImage = typeof src === 'string' && src.trim() !== '' && !imageBroken;
  const trimmedName = name.trim();
  const accessibleName = trimmedName === '' ? '?' : trimmedName;

  const fallbackStyle: StyleWithVars | undefined = hasImage
    ? undefined
    : { '--avatar-bg': `var(--color-avatar-${avatarColorIndex(accessibleName)})` };

  const mergedStyle: StyleWithVars | undefined =
    hasOwnProps(fallbackStyle) || hasOwnProps(style) ? { ...fallbackStyle, ...style } : undefined;

  const wrapperClass = clsx(
    styles.avatar,
    sizeClass[resolvedSize],
    group != null && styles.inGroup,
    className,
  );

  // .crop clips the image/initials into a circle without clipping the
  // .presence dot, which lives as a sibling outside .crop.
  const cropInner = hasImage ? (
    <span className={styles.crop}>
      <img src={src} alt={accessibleName} onError={() => setImageBroken(true)} />
    </span>
  ) : (
    <span className={styles.crop}>
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );

  const presenceDot = status ? (
    <span aria-hidden="true" className={styles.presence} data-status={status} />
  ) : null;

  // {...props} first so component-owned ARIA attributes (role, aria-label) win.
  const inner = hasImage ? (
    <span {...props} ref={ref} className={wrapperClass} style={mergedStyle}>
      {cropInner}
      {presenceDot}
    </span>
  ) : (
    <span
      {...props}
      ref={ref}
      role="img"
      aria-label={accessibleName}
      className={wrapperClass}
      style={mergedStyle}
    >
      {cropInner}
      {presenceDot}
    </span>
  );

  if (resolvedTooltip && accessibleName !== '?') {
    return <Tooltip content={accessibleName}>{inner}</Tooltip>;
  }

  return inner;
});
