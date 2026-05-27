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
 * Page-root layout primitive. Wraps a CRM page's contents with the
 * canonical vertical rhythm between top-level sections (PageHeader,
 * filter row, body card / table, etc.). Default `gap="lg"` = 16px
 * between sections — matches every shipped mockup.
 *
 * Page is intentionally thin — it's a renamed Stack with a default,
 * sitting at the page root. Its identity exists so future page-level
 * concerns (max-width, scroll restoration, container queries) have
 * a natural home without churning every consumer.
 *
 * @example
 * // Canonical page shape — PageHeader + body sections
 * <Page>
 *   <PageHeader>
 *     <PageHeader.Title>Contacts</PageHeader.Title>
 *   </PageHeader>
 *   <Card>{filters}</Card>
 *   <Table>{rows}</Table>
 * </Page>
 *
 * @example
 * // Per-page rhythm override (rare — only when 'lg' doesn't fit)
 * <Page gap="md">
 *   {denseDashboardSections}
 * </Page>
 *
 * @remarks When NOT to use
 * - Nested page-like regions inside another Page — use `<Stack>` instead.
 *   Page is the OUTER wrapper at the page root; nesting two Pages
 *   compounds their rhythms in a confusing way.
 * - Inside a Card or modal body — those are sub-page contexts with
 *   their own padding contract. Use `<Stack>` there.
 *
 * @remarks Anti-patterns
 * - Adding inline padding or margin to Page. The page container
 *   (AppShell content, modal body) provides the outer padding;
 *   Page just provides the inner rhythm.
 * - Wrapping Page in another Page — see above.
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
