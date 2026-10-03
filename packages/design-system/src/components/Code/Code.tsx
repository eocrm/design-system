import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Code.module.scss';

/** Color tone. */
export type CodeTone = 'default' | 'muted' | 'accent' | 'danger';

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /**
   * Color tone for the code text. The chip background stays the same;
   * only the text color changes.
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted`
   * - `accent` — `--color-accent`
   * - `danger` — `--color-danger`
   */
  tone?: CodeTone;
  /** Code content. */
  children: ReactNode;
}

const TONE_CLASS: Record<CodeTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  accent: styles.toneAccent,
  danger: styles.toneDanger,
};

/**
 * Inline `<code>` primitive: monospace text with a subtle chip background.
 * @see docs/components/Code.md
 */
export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { tone = 'default', className, children, ...rest },
  ref,
) {
  // className merged above via clsx so consumer extensions stack with our classes;
  // {...rest} last so any other consumer-passed attr can override ours (Pattern A).
  return (
    <code ref={ref} className={clsx(styles.code, TONE_CLASS[tone], className)} {...rest}>
      {children}
    </code>
  );
});
