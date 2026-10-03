import { createElement, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ErrorState.module.scss';

/** Visual size. Tracks the typography + spacing scale (mirrors EmptyState). */
export type ErrorStateSize = 'sm' | 'md' | 'lg';

/** Horizontal alignment of the stacked content. */
export type ErrorStateAlign = 'center' | 'start';

/** Status tone — drives the icon tint and the danger live-region. */
export type ErrorStateTone = 'neutral' | 'danger';

/** Valid `<h*>` heading levels. */
export type ErrorStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Icon rendered above the title. Pass a lucide icon (sized by the consumer —
   * lg=48, md=32, sm=24), custom SVG, or any ReactNode. The icon's color is set
   * by `tone`; pass `aria-hidden="true"` on it when purely decorative.
   */
  icon?: ReactNode;

  /**
   * Required title, rendered as a semantic heading (default `<h1>` — it's
   * usually the page heading). Accepts ReactNode for inline emphasis.
   */
  title: ReactNode;

  /** Optional description rendered below the title. */
  description?: ReactNode;

  /**
   * Optional action(s) below the description — a `<Button>` or a
   * `<Cluster gap="sm">` of buttons. Keep to ONE primary action.
   */
  actions?: ReactNode;

  /**
   * Optional supplemental content rendered below the actions — e.g. an
   * `Error ID: …` line or a "view status" link. Reads as metadata, not primary
   * copy. Distinct from `description`, which sits above the actions.
   */
  extra?: ReactNode;

  /**
   * Status tone. Defaults to `'neutral'`.
   * - `'neutral'` — informational (404 / not-found). Icon uses `--color-fg-muted`.
   * - `'danger'` — an error (500 / crash). Icon uses `--color-danger`, and the
   *   wrapper gets `role="alert"` so an error-boundary fallback announces on
   *   mount. Override the role by passing your own `role`.
   */
  tone?: ErrorStateTone;

  /**
   * Visual size. Defaults to `'lg'` (full-page hero). Use `'sm'` / `'md'` when
   * the state is embedded in a smaller surface.
   */
  size?: ErrorStateSize;

  /**
   * Horizontal alignment of the stacked content. Defaults to `'center'`.
   * Use `'start'` in a tight column where centering looks stranded.
   */
  align?: ErrorStateAlign;

  /**
   * Heading level for `title`. Defaults to `1` (page-level). Lower it when the
   * screen is nested under an existing heading. Values outside `1–6` clamp to `1`.
   */
  headingLevel?: ErrorStateHeadingLevel;
}

function clampHeading(level: ErrorStateHeadingLevel | undefined): ErrorStateHeadingLevel {
  if (level === undefined) return 1;
  if (level < 1 || level > 6) return 1;
  return level;
}

/**
 * Page-level status / result screen: icon, title heading, description, actions and an `extra` slot.
 * @see docs/components/ErrorState.md
 */
export const ErrorState = forwardRef<HTMLElement, ErrorStateProps>(function ErrorState(
  {
    icon,
    title,
    description,
    actions,
    extra,
    tone = 'neutral',
    size = 'lg',
    align = 'center',
    headingLevel,
    className,
    ...props
  },
  ref,
) {
  const headingTag = `h${clampHeading(headingLevel)}` as const;

  // role="alert" on danger so an error-boundary fallback announces on mount.
  // Set before {...props} (Pattern A) so a consumer can override role/aria-*.
  return (
    <section
      ref={ref}
      role={tone === 'danger' ? 'alert' : undefined}
      className={clsx(
        styles.errorState,
        styles[`size-${size}`],
        styles[`align-${align}`],
        styles[`tone-${tone}`],
        className,
      )}
      {...props}
    >
      {icon != null && <span className={styles.icon}>{icon}</span>}
      {createElement(headingTag, { className: styles.title }, title)}
      {description != null && <p className={styles.description}>{description}</p>}
      {actions != null && <div className={styles.actions}>{actions}</div>}
      {extra != null && <div className={styles.extra}>{extra}</div>}
    </section>
  );
});
