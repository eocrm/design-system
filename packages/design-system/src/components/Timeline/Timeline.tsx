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
 * Vertical activity-feed primitive — a connector line running between per-item `node`
 * slots (avatar / dot / icon) with content to the right. The line connects consecutive
 * nodes and **stops at the last node**. Use `<Timeline compact>` for a dense sidebar widget.
 *
 * @example
 * <Timeline>
 *   {activities.map((a) => (
 *     <Timeline.Item key={a.id} node={<Avatar name={a.actor} size="sm" src={a.avatarUrl} />}>
 *       <Text size="sm"><strong>{a.actor}</strong> · {a.type} · {a.time}</Text>
 *       <Text size="sm" tone="muted">{a.body}</Text>
 *     </Timeline.Item>
 *   ))}
 * </Timeline>
 *
 * @example
 * // Compact sidebar widget with dot nodes:
 * <Timeline compact>
 *   <Timeline.Item node={<Dot tone="success" />}>
 *     <Text size="sm">Renewal confirmed</Text>
 *   </Timeline.Item>
 * </Timeline>
 *
 * @remarks When NOT to use
 * - A plain vertical list with no connector / nodes → `<Stack>`.
 * - A horizontal step indicator → not this (Timeline is vertical).
 *
 * @remarks Anti-patterns
 * - ❌ Expecting a built-in dot — `node` is a slot; pass `<Dot>` / `<Avatar>` / an icon.
 * - ❌ Hand-rolling the connector line — it's built in and stops at the last item automatically.
 * - ❌ Putting layout margins on items — spacing comes from `compact` / the row gap token.
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
