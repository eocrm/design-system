import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Indent.module.scss';

/** Per-level indent size — a spacing step. */
export type IndentGutter = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface IndentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Nesting depth — multiplies the gutter. `0` = flush (no indent, e.g. a
   * root-level comment). Defaults to `1` (one gutter). Negative values clamp to `0`.
   */
  level?: number;
  /**
   * Per-level indent size — a spacing step. Defaults to `'lg'` (16px per level).
   * - `xs` 4px · `sm` 8px · `md` 12px · `lg` 16px · `xl` 24px · `2xl` 32px
   */
  gutter?: IndentGutter;
  /** The nested content to indent. Required — an Indent with nothing inside indents nothing. */
  children: ReactNode;
}

/**
 * Indentation primitive — indents its own box by `level × gutter`, token-based and
 * RTL-aware (`padding-inline-start`). The DS-native way to express nesting depth
 * (threaded comment trees, file trees, outline views) without inline CSS.
 *
 * It pads its OWN box only — it does not arrange its children (mirrors `Constrain`,
 * which only sizes its own box). Put a `<Stack>`/`<Cluster>` *inside* it when the
 * indented block has multiple rows. `level={0}` is flush; nesting compounds because
 * padding stacks, so a flat list at known depths and a physically-nested tree both work.
 *
 * @example
 * // A flat comment list rendered at known depths:
 * {comments.map((c) => (
 *   <Indent key={c.id} level={c.depth}>
 *     <CommentCard comment={c} />
 *   </Indent>
 * ))}
 *
 * @example
 * // Tighter gutter for a dense outline:
 * <Indent level={2} gutter="sm">
 *   <Text>Deeply nested line</Text>
 * </Indent>
 *
 * @remarks When NOT to use
 * - Vertical spacing between siblings → `<Stack gap>`. Indent adds a leading inline
 *   gutter to one box; it doesn't space a list.
 * - A bordered / padded surface → `<Card>`.
 * - Arranging children in a row → `<Cluster>`.
 *
 * @remarks Anti-patterns
 * - ❌ Using `<Indent>` for general left padding on non-nested content — it expresses
 *   hierarchy/depth; for plain spacing reach for the parent layout primitive.
 * - ❌ Passing a fractional or huge `level` — it's a depth count (0, 1, 2, …).
 * - ❌ Expecting it to arrange children — wrap a `<Stack>` inside if the indented
 *   block has multiple rows.
 */
// {...rest} last so consumer attrs win (Pattern A); `style` is merged explicitly so
// a consumer `style` can't clobber the internal --indent-level (same as Split/Grid).
export const Indent = forwardRef<HTMLDivElement, IndentProps>(function Indent(
  { level = 1, gutter = 'lg', className, style, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.indent, styles[`gutter-${gutter}`], className)}
      style={{ ['--indent-level' as string]: Math.max(0, level), ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
});
