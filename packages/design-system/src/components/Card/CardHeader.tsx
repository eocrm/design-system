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
   * `'subtle'` paints the header on a tinted (sunken) surface, for a nested editable
   * sub-section inside a `Card.Body` (e.g. a condition group). Defaults to
   * `'default'`.
   */
  surface?: 'default' | 'subtle';
  /**
   * Optional interactive slot right after the title (e.g. a `ButtonGroup`
   * mode switch). Rendered outside the heading, so it is not part of the
   * heading's name. Order: title, controls, meta, action. Controls never
   * shrink: on a wide header the title ellipsizes down to a short minimum
   * width; on a narrow header (under ~360px of content) the controls wrap onto
   * a second row under the title, which keeps the first row with meta and
   * action. Keep titles short, or pass a `title` attribute for long ones.
   */
  controls?: ReactNode;
  /**
   * Optional right-aligned slot — typically a `<Link>` or `<Button>` that
   * lets the user navigate to a full list or take a section-level action.
   * Rendered inside a `<span>` that never shrinks or wraps (flex-shrink: 0;
   * with `meta` or `controls`, min-width: max-content). Beside `controls` it is
   * the removal/section action of a nested sub-group (e.g. a ghost delete
   * button), right-aligned after any meta.
   */
  action?: ReactNode;
  /**
   * Optional secondary, non-interactive text beside the title — freshness
   * ("Updated 3 minutes ago") or status. Muted and single-line; sits just
   * before `action` and is the first thing to give way at narrow widths: it
   * truncates with an ellipsis before the title gives up any width, while
   * `action` keeps its width. In a `fill` Card (which needs a parent of
   * definite width) it is also visually hidden, still read by screen
   * readers, once only a sliver would show. Not part
   * of the heading's name. Put controls in `controls` or `action`, never
   * here. `false` and `''` count as no meta.
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
  { headerLevel = 'h3', surface = 'default', controls, action, meta, children, className, ...rest },
  ref,
) {
  // headerLevel is a string union of valid HTML heading tag names; cast to
  // the union (not a single literal) so the JSX dispatch type is honest.
  const Heading = headerLevel as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const hasMeta = meta != null && meta !== false && meta !== '';
  const hasControls = controls != null && controls !== false && controls !== '';
  const title = <Heading className={styles.title}>{children}</Heading>;
  const metaNode = hasMeta && (
    <span className={styles.meta}>
      <span className={styles.metaText}>{meta}</span>
    </span>
  );
  const actionNode = action != null ? <span className={styles.action}>{action}</span> : null;
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      className={clsx(
        styles.header,
        hasMeta && styles.withMeta,
        hasControls && styles.withControls,
        surface === 'subtle' && styles.subtle,
        className,
      )}
      data-surface={surface === 'subtle' ? 'subtle' : undefined}
      {...rest}
    >
      {hasControls ? (
        // The header is the size container; this inner grid is what its
        // container query re-lays out (a container can't restyle itself).
        <div className={styles.controlsGrid}>
          {title}
          <span className={styles.controls}>{controls}</span>
          {!hasMeta && <span aria-hidden="true" />}
          {metaNode}
          {/* Placeholder keeps the column count fixed when there is no action. */}
          {actionNode ?? <span aria-hidden="true" />}
        </div>
      ) : (
        <>
          {title}
          {metaNode}
          {actionNode}
        </>
      )}
    </div>
  );
});
