import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { type PaletteColor } from '../../palette';
import { type BadgeTone } from '../Badge';
import styles from './Dot.module.scss';

export interface DotProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * One of the 30 `PaletteColor`s — renders the bare circle in that color's
   * saturated `--color-palette-<name>-fg` token. Takes precedence over `tone`.
   */
  color?: PaletteColor;
  /**
   * A semantic `BadgeTone` (`neutral` default / `info` / `success` / `warning` /
   * `danger` / `purple`) — used when `color` is omitted.
   */
  tone?: BadgeTone;
}

/**
 * A bare, background-less colored circle (`--size-badge-dot`, 6px) for
 * color-coding affordances — a leading dot on a filter trigger / `FilterChip`,
 * a status indicator, a legend swatch. Unlike `<Badge dot>` it paints NO badge
 * surface; it is just the dot. Decorative: rendered `aria-hidden` by default —
 * always pair it with a visible label / accessible text (the dot alone conveys
 * nothing to assistive tech).
 *
 * Pass `color` for any of the 30 `PaletteColor`s, or `tone` for one of the 6
 * semantic `BadgeTone`s. `color` wins if both are set; neither → `neutral`.
 *
 * @example
 * // Palette color, paired with a label:
 * <Cluster gap="xs"><Dot color="violet" /> Range</Cluster>
 *
 * @example
 * // Semantic tone:
 * <Dot tone="success" />
 *
 * @remarks When NOT to use
 * - As a status pill WITH text → use `<Badge>` (it owns a surface + label).
 * - As the sole signal of meaning → a bare dot is decorative (`aria-hidden`);
 *   always accompany it with text or an accessible label.
 *
 * @remarks Anti-patterns
 * - ❌ Relying on the dot color alone to convey state to all users — color is
 *   not an accessible signal on its own; pair with text.
 */
export const Dot = forwardRef<HTMLSpanElement, DotProps>(function Dot(
  { color, tone = 'neutral', className, style, 'aria-hidden': ariaHidden, ...props },
  ref,
) {
  return (
    <span
      // {...props} first so component-owned attrs (aria-hidden default, data-*,
      // class, color style) win; consumer can still override via explicit props.
      {...props}
      ref={ref}
      aria-hidden={ariaHidden ?? true}
      data-tone={color ? undefined : tone}
      data-palette={color}
      className={clsx(styles.dot, className)}
      style={
        color
          ? ({ background: `var(--color-palette-${color}-fg)`, ...style } as CSSProperties)
          : style
      }
    />
  );
});
