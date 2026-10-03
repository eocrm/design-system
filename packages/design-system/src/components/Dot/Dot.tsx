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
 * A bare, background-less colored circle for color-coding affordances (leading dot, status indicator, legend swatch).
 * @see docs/components/Dot.md
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
