import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export interface RailSectionProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Section heading rendered in small-caps muted style above the section's
   * items. Hidden when the rail is collapsed (a small visual gap remains
   * between sections via the rail's `gap`). When provided, doubles as
   * `aria-label` for the section's `role="group"` so screen readers can
   * navigate by group.
   */
  title?: string;
  /** Items and/or groups belonging to this section. */
  children: ReactNode;
}

/**
 * Visually-grouped collection of `<Rail.Item>` and `<Rail.Group>` children.
 * Renders a `<div role="group">` so the grouping is announced to screen
 * readers; the title is the group's `aria-label`. Visually, the title is a
 * small-caps muted line above the items in expanded mode, and is faded out
 * (height 0, opacity 0) when the rail collapses.
 *
 * @example
 * <Rail.Section title="Main">
 *   <Rail.Item icon={<Home />} as={NavLink} to="/">Dashboard</Rail.Item>
 *   <Rail.Item icon={<Users />} as={NavLink} to="/contacts">Contacts</Rail.Item>
 * </Rail.Section>
 */
export const RailSection = forwardRef<HTMLDivElement, RailSectionProps>(function RailSection(
  { title, className, children, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      role="group"
      aria-label={title}
      className={clsx(styles.section, className)}
      {...props}
    >
      {title && <div className={styles.sectionTitle}>{title}</div>}
      {children}
    </div>
  );
});
