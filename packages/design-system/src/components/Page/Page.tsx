import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { type StackGap } from '../Stack';
import styles from './Page.module.scss';

/**
 * Gap union for `<Page>`. Reuses `StackGap` so the scale stays
 * synchronized across layout primitives — when Stack gains a size,
 * Page gains it automatically.
 */
export type PageGap = StackGap;

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Vertical rhythm between top-level page sections.
   * - `xs` (4) / `sm` (8) / `md` (12) — tighter than canonical; rare.
   * - `lg` (16, **default**) — the canonical CRM page rhythm; matches
   *   every shipped mockup.
   * - `xl` (24) / `2xl` (32) — looser; for spacious overview / hero pages.
   */
  gap?: PageGap;
  children: ReactNode;
}

const gapClass: Record<PageGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

/**
 * Page-root layout primitive: a thin Stack with the canonical `gap="lg"` rhythm between top-level sections.
 * @see docs/components/Page.md
 */
export const Page = forwardRef<HTMLDivElement, PageProps>(function Page(
  { gap = 'lg', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.root, gapClass[gap], className)}
      // {...rest} last so consumer overrides win (Pattern A — Page has no
      // locked-in attributes; even data-* and aria-* can be overridden).
      {...rest}
    >
      {children}
    </div>
  );
});
