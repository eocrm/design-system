import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { paletteTokens, type PaletteColor } from '../../palette';
import styles from './IconTile.module.scss';

type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number };

/** Tile box size — `sm` 24 / `md` 32 / `lg` 40 px. Sizes the tile, not the icon. */
export type IconTileSize = 'sm' | 'md' | 'lg';

/** Tile shape — `'square'` (radius-md, default) or `'circle'` (radius-full). */
export type IconTileShape = 'square' | 'circle';

export interface IconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /**
   * The icon to frame — a lucide icon (sized by you, ~14–20px), custom SVG, or
   * any ReactNode. Required; IconTile is purely an icon frame.
   */
  icon: ReactNode;
  /**
   * Palette color for the tint — one of the 30 categorical colors. Defaults to
   * `'slate'`. Categorical (visual identity), NOT semantic; for status use a
   * `<Badge tone>` instead.
   */
  color?: PaletteColor;
  /**
   * Tile box size. `'sm'` 24 / `'md'` 32 (**default**) / `'lg'` 40 px. Sizes the
   * tile box — size your icon child separately.
   */
  size?: IconTileSize;
  /** `'square'` (radius-md, **default**) or `'circle'` (radius-full). */
  shape?: IconTileShape;
  /**
   * Accessible name. Omit (**default**) → the tile is decorative
   * (`aria-hidden`), for use beside text that carries the meaning. Set it →
   * `role="img"` + `aria-label`, for a standalone tile whose icon is the only
   * indicator.
   */
  label?: string;
}

/**
 * A small decorative tile that frames a single icon, tinted by a Palette color.
 * Use for the colored icon accent beside a stat, list row, or section heading.
 *
 * Distinct from `<Avatar>` (a person — initials/photo) and `<Badge>` (a text
 * chip with a semantic tone). IconTile holds an icon and uses categorical
 * Palette color, not status semantics.
 *
 * @example
 * <IconTile color="blue" icon={<Zap size={16} />} />
 *
 * @example
 * // Circle, decorative beside text:
 * <Cluster gap="sm" align="center">
 *   <IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
 *   <Text>alex@acme.co</Text>
 * </Cluster>
 *
 * @example
 * // Standalone + meaningful → give it a label:
 * <IconTile color="green" label="Verified" icon={<Check size={16} />} />
 *
 * @remarks When NOT to use
 * - A person → `<Avatar>` (initials / photo, round).
 * - Text or a status label → `<Badge>` (text chip with semantic `tone`).
 * - A plain icon with no tinted container → render the lucide icon directly
 *   (optionally in a `<Cluster>`). IconTile is specifically the tinted shape.
 *
 * @remarks Anti-patterns
 * - A decorative (default) IconTile used as the ONLY indicator of meaning with
 *   no nearby text — pass a `label` so AT users get the meaning.
 *
 * @remarks A11y
 * - Decorative by default (`aria-hidden="true"`). `label` makes it
 *   `role="img"` + `aria-label`; the icon then needs no separate `aria-hidden`.
 */
export const IconTile = forwardRef<HTMLSpanElement, IconTileProps>(function IconTile(
  { icon, color = 'slate', size = 'md', shape = 'square', label, className, style, ...rest },
  ref,
) {
  const { bg, fg } = paletteTokens(color);
  // Pass the palette tokens through as CSS custom properties; the stylesheet
  // reads them (background/color live in .module.scss). DRY — no hand-kept
  // 30-color class list — and token-correct (values are var(--color-palette-…),
  // never raw). Same dynamic-inline-var pattern as <Avatar>/<Progress>.
  const cssVars: StyleWithVars = { '--icon-tile-bg': bg, '--icon-tile-fg': fg };

  // Decorative by default; a non-empty `label` promotes it to a labelled image.
  // Empty/whitespace label stays decorative — aria-label="" would be announced
  // with no name. Spread before {...rest} (Pattern A) so a consumer can override
  // role/aria-*.
  const a11y =
    label != null && label.trim() !== ''
      ? { role: 'img', 'aria-label': label }
      : { 'aria-hidden': true as const };

  return (
    <span
      ref={ref}
      className={clsx(styles.tile, styles[`size-${size}`], styles[`shape-${shape}`], className)}
      style={{ ...cssVars, ...style }}
      {...a11y}
      {...rest}
    >
      {icon}
    </span>
  );
});
