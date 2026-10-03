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
 * Visually grouped collection of rail items, announced as a `role="group"` named by its title (`Rail.Section`).
 * @see docs/components/Rail.md
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
