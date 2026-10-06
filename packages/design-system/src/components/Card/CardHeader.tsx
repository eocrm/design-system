import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

/** Heading level wrapping the title. Defaults to 'h3'. Same vocab as Accordion. */
export type CardHeaderLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Heading level for the title text. Defaults to `'h3'` (assumes the page
   * has an h1/h2 above). Override when this section sits beneath an h1
   * directly (`headerLevel="h2"`) or further nested (`headerLevel="h4"`).
   */
  headerLevel?: CardHeaderLevel;
  /**
   * Optional right-aligned slot — typically a `<Link>` or `<Button>` that
   * lets the user navigate to a full list or take a section-level action.
   * Rendered inside a `<span>` that is flex-shrink: 0 so it never wraps.
   */
  action?: ReactNode;
  /**
   * Optional secondary, non-interactive text beside the title — freshness
   * ("Updated 3 minutes ago") or status. Muted and single-line; sits just
   * before `action` and is the first thing to give way at narrow widths: it
   * truncates with an ellipsis before the title gives up any width, while
   * `action` keeps its width. In a `fill` Card it is also visually hidden
   * (still read by screen readers) once only a sliver would show. Not part
   * of the heading's name. Put controls in `action`, never here. `false`
   * and `''` count as no meta.
   */
  meta?: ReactNode;
  /**
   * Title content. Becomes the inner text of the heading element. Typically
   * a plain string, but can contain inline elements if needed.
   */
  children: ReactNode;
}

/**
 * Title row subcomponent for `<Card>` with optional right-aligned meta text and action slot.
 * @see docs/components/Card.md
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { headerLevel = 'h3', action, meta, children, className, ...rest },
  ref,
) {
  // headerLevel is a string union of valid HTML heading tag names; cast to
  // the union (not a single literal) so the JSX dispatch type is honest.
  const Heading = headerLevel as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const hasMeta = meta != null && meta !== false && meta !== '';
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div ref={ref} className={clsx(styles.header, hasMeta && styles.withMeta, className)} {...rest}>
      <Heading className={styles.title}>{children}</Heading>
      {hasMeta && (
        <span className={styles.meta}>
          <span className={styles.metaText}>{meta}</span>
        </span>
      )}
      {action != null && <span className={styles.action}>{action}</span>}
    </div>
  );
});
