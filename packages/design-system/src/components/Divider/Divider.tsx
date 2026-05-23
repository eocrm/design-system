import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import styles from './Divider.module.scss';

/** Layout direction. Defaults to `'horizontal'`. */
export type DividerOrientation = 'horizontal' | 'vertical';

/** Line style. Defaults to `'solid'`. */
export type DividerVariant = 'solid' | 'dashed';

/**
 * Line thickness tier. Defaults to `'sm'` (1px).
 * - `'sm'` — `--border-width` (1px). Default. Quiet separation.
 * - `'md'` — `--border-width-emphasis` (2px). Section breaks.
 * - `'lg'` — `--border-width-strong` (3px). Heavy emphasis; rare.
 */
export type DividerSize = 'sm' | 'md' | 'lg';

export interface DividerProps
  extends Omit<HTMLAttributes<HTMLElement>, 'role' | 'children'> {
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: DividerOrientation;

  /** Line style. Defaults to `'solid'`. */
  variant?: DividerVariant;

  /** Line thickness tier. Defaults to `'sm'`. */
  size?: DividerSize;

  /**
   * Optional centered label rendered between two line segments.
   * Common pattern: `<Divider>OR</Divider>` for auth-form section breaks.
   *
   * When `children` is set, the root becomes `<div role="separator">`
   * instead of `<hr>` (HTML `<hr>` cannot have children).
   *
   * Works with `orientation="vertical"` but renders awkwardly (text wraps
   * across two short line segments). Avoid vertical + label combos.
   */
  children?: ReactNode;
}

const ORIENTATION_CLASS: Record<DividerOrientation, string> = {
  horizontal: styles.horizontal,
  vertical: styles.vertical,
};

const VARIANT_CLASS: Record<DividerVariant, string> = {
  solid: '',
  dashed: styles.dashed,
};

const SIZE_CLASS: Record<DividerSize, string> = {
  sm: '',
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * Thin separator primitive. Horizontal (default) or vertical, solid or
 * dashed, three size tiers, optional centered label.
 *
 * When no `children` are passed, renders a native `<hr>` (the right HTML
 * semantic for a thematic break). When `children` is set, the root becomes
 * `<div role="separator">` with two line spans flanking the label — HTML
 * `<hr>` cannot have children.
 *
 * No spacing prop — the parent owns layout per Rule 4. Use Stack's `gap`
 * around the Divider to control spacing.
 *
 * @example
 * // Default — horizontal solid line
 * <Divider />
 *
 * @example
 * // Vertical separator inside a toolbar Cluster
 * <Cluster gap="sm">
 *   <Button>Edit</Button>
 *   <Divider orientation="vertical" />
 *   <Button>Duplicate</Button>
 * </Cluster>
 *
 * @example
 * // Labeled (auth-form pattern)
 * <Divider>OR</Divider>
 *
 * @example
 * // Variants + sizes
 * <Divider variant="dashed" />
 * <Divider size="lg" />
 *
 * @remarks When NOT to use
 * - Below a heading → just use the heading's `border-bottom`.
 * - Between unrelated stacked sections → use Stack with `gap` instead.
 * - Tone-driven separators ("error" / "success") → use `<Alert>`.
 *
 * @remarks Anti-patterns
 * - ❌ `<Divider orientation="vertical">OR</Divider>` — text wraps awkwardly.
 * - ❌ `<Divider size="lg" />` for casual breaks. Reserve `lg` (3px) for strong hierarchy.
 * - ❌ `<Divider style={{ marginY: 16 }} />` — parent owns spacing.
 */
export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(
  {
    orientation = 'horizontal',
    variant = 'solid',
    size = 'sm',
    children,
    className,
    ...props
  },
  ref,
) {
  const classes = clsx(
    styles.divider,
    ORIENTATION_CLASS[orientation],
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    children != null && styles.labeled,
    className,
  );

  if (children == null) {
    // Pattern B — {...props} first so role/aria-orientation/className can't be overridden.
    return (
      <hr
        ref={ref as Ref<HTMLHRElement>}
        {...props}
        role="separator"
        aria-orientation={orientation}
        className={classes}
      />
    );
  }

  // Pattern B — {...props} first so role/aria-orientation/className can't be overridden.
  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      {...props}
      role="separator"
      aria-orientation={orientation}
      data-labeled="true"
      className={classes}
    >
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
      <span className={styles.line} aria-hidden="true" />
    </div>
  );
});
