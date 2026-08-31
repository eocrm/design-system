import { forwardRef, useEffect, useState, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Tooltip } from '../Tooltip';
import { useTranslation } from '../../i18n';
import { useAvatarGroup } from './AvatarGroupContext';
import styles from './Avatar.module.scss';

/** Diameter. Matches the shared `--size-*` scale so a Button next to an Avatar lines up. */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

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
   * - `xl` (80px) — member-card popovers / profile headers.
   *
   * Inside `<AvatarGroup>`, the group's `size` overrides this.
   */
  size?: AvatarSize;
  /**
   * Presence dot in the bottom-right.
   * - `'online'`  — green.
   * - `'busy'`    — red.
   * - `'away'`    — amber (the categorical amber, dark enough to read at dot size).
   * - `'offline'` — gray.
   * Omit to render no dot at all.
   */
  status?: AvatarStatus;
  /**
   * Whether to wrap the avatar in a `<Tooltip>` showing `name`. Defaults to
   * `false` (back-compat — existing renders don't gain a hover affordance).
   * Inside `<AvatarGroup>`, the group's `tooltip` prop becomes the default
   * (which itself defaults to `true` for grouped avatars); explicit
   * per-child still wins.
   */
  tooltip?: boolean;
}

const sizeClass: Record<AvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
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
 * // Hover-discoverable name (off by default; opt in).
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
 * - ❌ Querying a status-bearing avatar by the bare name. `status` is folded
 *   into the accessible name (`"Alex, online"`), because colour alone cannot
 *   carry it — WCAG 1.4.1. Use `getByRole('img', { name: 'Alex, online' })`.
 * - ❌ Relying on the dot's colour to distinguish statuses in your own UI, or
 *   re-tinting it. Each status also renders a distinct shape (filled / half /
 *   barred / hollow); that shape is the channel that survives colour-vision
 *   deficiency, and `away` vs `busy` collapses without it.
 * - ❌ Adding your own visually-hidden status text next to the avatar. It would
 *   be announced twice, and inside the no-`src` branch — a `role="img"` — ARIA
 *   prunes children as presentational, so it would be silent there anyway.
 * - ❌ Using Avatar to show a non-person icon. Use an icon component instead.
 * - ❌ Wrapping the result with `role="img"` again. The component already
 *   handles ARIA: with `src` set, the inner `<img>` is the labeled image;
 *   without `src`, the wrapper has `role="img" aria-label={name}`.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name, src, size, status, tooltip, className, style, ...props },
  ref,
) {
  const t = useTranslation();
  const group = useAvatarGroup();
  const resolvedSize: AvatarSize = size ?? group?.size ?? 'md';
  const resolvedTooltip: boolean = tooltip ?? group?.tooltip ?? false;

  const [imageBroken, setImageBroken] = useState(false);
  useEffect(() => {
    setImageBroken(false);
  }, [src]);

  const hasImage = typeof src === 'string' && src.trim() !== '' && !imageBroken;
  const trimmedName = name.trim();
  const accessibleName = trimmedName === '' ? '?' : trimmedName;

  // #506. Presence was colour-only: the dot is decorative, and `status` reached
  // neither the accessible name nor the tooltip, so WCAG 1.4.1 applied and the
  // library did not meet it. The OKLab separation the token gate measures is
  // blind to dichromacy — under simulated protanopia light away/busy collapses
  // by an order of magnitude while that gate reads 0.158 and passes.
  //
  // FOLDED INTO THE NAME rather than announced from the dot, for two reasons.
  // Rule 10: presence is a property you ARRIVE at — an avatar sits in a list you
  // browse minutes after it rendered — and arrived-at properties belong in the
  // name. And mechanically, the no-image branch is `role="img"`, whose children
  // ARIA prunes as presentational: a visually-hidden span inside it would be
  // silent in exactly half the cases, which is the trap Rule 10 records for
  // Lightbox. Folding works identically in both branches.
  //
  // The dot itself stays aria-hidden, so nothing is announced twice.
  const statusLabel = status ? t(`avatar.presence.${status}` as const) : undefined;
  const labelledName = statusLabel ? `${accessibleName}, ${statusLabel}` : accessibleName;

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
      <img src={src} alt={labelledName} onError={() => setImageBroken(true)} />
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
      aria-label={labelledName}
      className={wrapperClass}
      style={mergedStyle}
    >
      {cropInner}
      {presenceDot}
    </span>
  );

  // Suppress the tooltip when we don't have a real name to show — the
  // `?` fallback is for unnamed avatars and saying "?" in a tooltip
  // would be noise. (Comparing trimmedName, not accessibleName, so a
  // person legitimately named `?` still gets a tooltip.)
  const hasRealName = trimmedName !== '';
  if (resolvedTooltip && hasRealName) {
    return <Tooltip content={accessibleName}>{inner}</Tooltip>;
  }

  return inner;
});
