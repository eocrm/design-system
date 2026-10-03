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
 * Indentation primitive — indents its own box by `level × gutter`.
 * @see docs/components/Indent.md
 */
// {...rest} last so consumer attrs win (Pattern A). But `style` is spread FIRST in
// the merge below so the internal --indent-level wins — depth is set via the `level`
// prop, not a raw style var (same var-protection as Grid's --grid-columns).
export const Indent = forwardRef<HTMLDivElement, IndentProps>(function Indent(
  { level = 1, gutter = 'lg', className, style, children, ...rest },
  ref,
) {
  // Clamp to a non-negative, finite depth (a NaN/∞ level would yield an invalid calc()).
  const indentLevel = Number.isFinite(level) ? Math.max(0, level) : 0;
  return (
    <div
      ref={ref}
      className={clsx(styles.indent, styles[`gutter-${gutter}`], className)}
      style={{ ...style, ['--indent-level' as string]: indentLevel } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
});
