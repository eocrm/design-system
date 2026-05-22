import { createElement, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EmptyState.module.scss';

/** Visual size. Tracks typography + spacing scale. */
export type EmptyStateSize = 'sm' | 'md' | 'lg';

/** Horizontal alignment of the stacked content. */
export type EmptyStateAlign = 'center' | 'start';

/** Valid `<h*>` heading levels. */
export type EmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Icon rendered above the title. Pass a lucide icon, custom SVG, or any
   * ReactNode. Sized by the consumer — recommended: sm=24, md=32, lg=48.
   * Omit for an icon-less empty state.
   */
  icon?: ReactNode;

  /**
   * Required title. Rendered as a semantic heading (default `<h3>`).
   * Accepts ReactNode so inline emphasis works
   * (e.g., `<>Found <strong>0</strong> results</>`). Keep it short and
   * announceable — AT users hear it via heading navigation.
   */
  title: ReactNode;

  /** Optional description rendered below the title. */
  description?: ReactNode;

  /**
   * Optional action(s) rendered below the description. Typically a
   * `<Button>` or a `<Cluster gap="sm">` of buttons.
   */
  actions?: ReactNode;

  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — compact for inline / popover use (empty Select results,
   *   empty filter chips). Icon target 24px, font-size-sm title.
   * - `'md'` — default for cards / sections (DataTable empty row, inbox
   *   empty). Icon target 32px, font-size-md title.
   * - `'lg'` — hero / full-page empty states. Icon target 48px,
   *   font-size-xl title.
   */
  size?: EmptyStateSize;

  /**
   * Horizontal alignment of the stacked content. Defaults to `'center'`.
   * Use `'start'` when the empty state sits in a tight column where
   * centering would look stranded.
   */
  align?: EmptyStateAlign;

  /**
   * Heading level for the `title`. Defaults to `3` (renders `<h3>`).
   * Set higher (4–6) when the empty state lives deep inside the page's
   * heading hierarchy. Set to `2` when the empty state IS the page's
   * primary content. Values outside `1–6` clamp to `3`.
   */
  headingLevel?: EmptyStateHeadingLevel;
}

function clampHeading(level: EmptyStateHeadingLevel | undefined): EmptyStateHeadingLevel {
  if (level === undefined) return 3;
  if (level < 1 || level > 6) return 3;
  return level;
}

/**
 * Empty-state container — opinionated "nothing here" treatment. Renders
 * an optional icon, a required title (as a semantic heading), an optional
 * description, and optional action(s), stacked vertically with token-correct
 * spacing.
 *
 * Use to keep empty states consistent across the app. For unusual layouts,
 * compose `<Stack>` + `<Button>` directly — this component is deliberately
 * inflexible.
 *
 * @example
 * <EmptyState
 *   icon={<Inbox size={32} />}
 *   title="No contacts yet"
 *   description="Add your first contact to get started."
 *   actions={<Button>Add contact</Button>}
 * />
 *
 * @example
 * // Multiple actions:
 * <EmptyState
 *   icon={<Search size={32} />}
 *   title="No results"
 *   description="Try a different query or clear the filters."
 *   actions={
 *     <Cluster gap="sm" justify="center">
 *       <Button onClick={clearFilters}>Clear filters</Button>
 *       <Button variant="ghost" onClick={openSearch}>New search</Button>
 *     </Cluster>
 *   }
 * />
 *
 * @example
 * // Inline (in a Select dropdown's empty results):
 * <EmptyState
 *   size="sm"
 *   icon={<SearchX size={24} />}
 *   title="No matches"
 * />
 *
 * @remarks When NOT to use
 * - **Loading state** → use `<Skeleton>`. Skeleton implies "data coming";
 *   EmptyState implies "nothing here, possibly forever."
 * - **Error state** → consumer renders a danger-tinted treatment. We
 *   intentionally don't ship `variant="error"` because errors have
 *   different a11y (live regions, retry actions) than empty states.
 * - **Page-level 404 / 500** → use a dedicated error page, not EmptyState.
 *
 * @remarks Anti-patterns
 * - Passing a long sentence as `title`. Keep titles short — long
 *   strings hurt heading-navigation UX.
 * - Multiple primary action buttons. Empty states should have ONE
 *   clear next action; secondaries are ghost variant.
 * - Skipping the `description` to save space. The two-line treatment
 *   (title + description) is what makes empty states scannable.
 */
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(function EmptyState(
  {
    icon,
    title,
    description,
    actions,
    size = 'md',
    align = 'center',
    headingLevel,
    className,
    ...props
  },
  ref,
) {
  const headingTag = `h${clampHeading(headingLevel)}` as const;

  return (
    <section
      ref={ref}
      {...props}
      className={clsx(
        styles.emptyState,
        styles[`size-${size}`],
        styles[`align-${align}`],
        className,
      )}
    >
      {icon != null && <span className={styles.icon}>{icon}</span>}
      {createElement(headingTag, { className: styles.title }, title)}
      {description != null && <p className={styles.description}>{description}</p>}
      {actions != null && <div className={styles.actions}>{actions}</div>}
    </section>
  );
});
