import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { paletteTokens, type PaletteColor } from '../../palette';
import styles from './IconTile.module.scss';

type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number };

/**
 * Tile box size — `xs` 20 / `sm` 24 / `md` 32 / `lg` 40 px (sizes the tile, not
 * the icon), or `inline`: `1em`, following the surrounding text (sizes the icon
 * too).
 */
export type IconTileSize = 'inline' | 'xs' | 'sm' | 'md' | 'lg';

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
   * Tile box size. `'xs'` 20 / `'sm'` 24 / `'md'` 32 (**default**) / `'lg'` 40 px.
   * Sizes the tile box — size your icon child separately. `'xs'` brackets a
   * 14px glyph with ~3px of padding so the tile sits inside a text / Badge /
   * EntityChip row without growing it.
   *
   * `'inline'` is font-relative: a `1em` tile (the surrounding text's
   * font-size) centred on the text's capitals, whose glyph the tile sizes to
   * `0.75em` — a direct `<svg>` child's (a lucide icon's) own `size` is
   * overridden; wrap nothing around the icon. Use it in text contexts
   * (`EntityChip` `icon` / `trailing`, `Badge` rows, dense lists, running
   * text) where even `xs` towers over the capitals. It follows `font-size`,
   * so there is no size decision per call site.
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
 * @see docs/components/IconTile.md
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
