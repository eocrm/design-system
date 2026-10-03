import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Timeline.module.scss';

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  /** Tighter gutter, node box, and spacing for dense sidebar widgets. Default `false`. */
  compact?: boolean;
  /** `<Timeline.Item>`s. */
  children: ReactNode;
}

export interface TimelineItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'children'> {
  /**
   * The gutter node — an `<Avatar>`, `<Dot>`, icon, etc. Centered in a fixed node box so
   * the connector aligns regardless of node content.
   */
  node: ReactNode;
  /** The item content (right of the node) — e.g. name·type·time, body, system text. */
  children: ReactNode;
}

/**
 * Vertical activity-feed primitive: a connector line between per-item `node` slots, with content to the right.
 * @see docs/components/Timeline.md
 */
const TimelineRoot = forwardRef<HTMLOListElement, TimelineProps>(function Timeline(
  { compact = false, className, children, ...rest },
  ref,
) {
  return (
    <ol ref={ref} className={clsx(styles.root, compact && styles.compact, className)} {...rest}>
      {children}
    </ol>
  );
});

const TimelineItem = forwardRef<HTMLLIElement, TimelineItemProps>(function TimelineItem(
  { node, className, children, ...rest },
  ref,
) {
  return (
    <li ref={ref} className={clsx(styles.item, className)} {...rest}>
      <div className={styles.gutter}>
        <div className={styles.nodeBox}>{node}</div>
        <span className={styles.connector} aria-hidden="true" />
      </div>
      <div className={styles.content}>{children}</div>
    </li>
  );
});
TimelineItem.displayName = 'Timeline.Item';

export const Timeline = Object.assign(TimelineRoot, { Item: TimelineItem });
