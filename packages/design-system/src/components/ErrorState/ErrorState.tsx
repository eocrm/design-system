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
 * Page-level status / result screen — the dedicated component `<EmptyState>`
 * points to for "page-level 404 / 500" and the danger-tinted, live-region error
 * treatment it intentionally doesn't ship. Renders an optional icon, a required
 * title (semantic heading, default `<h1>`), an optional description, optional
 * action(s), and an optional `extra` slot (e.g. an error ID), stacked
 * vertically with token-correct spacing.
 *
 * Use `<EmptyState>` for "nothing here" inside a surface; use
 * `<Alert tone="error">` for an in-flow, dismissible banner. ErrorState is a
 * whole-screen state.
 *
 * @example
 * // 404 — neutral tone
 * <ErrorState
 *   icon={<Compass size={48} aria-hidden="true" />}
 *   title="Page not found"
 *   description="The page you're looking for doesn't exist or has been moved."
 *   actions={<Button onClick={goHome}>Go to homepage</Button>}
 * />
 *
 * @example
 * // Error-boundary fallback — danger tone announces via role="alert"
 * <ErrorState
 *   tone="danger"
 *   icon={<TriangleAlert size={48} aria-hidden="true" />}
 *   title="Something went wrong"
 *   description="An unexpected error occurred. We've logged it."
 *   actions={
 *     <Cluster gap="sm" justify="center">
 *       <Button onClick={reset}>Try again</Button>
 *       <Button variant="secondary" onClick={goHome}>Go home</Button>
 *     </Cluster>
 *   }
 *   extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
 * />
 *
 * @example
 * // Centered inside a Screen (standalone page)
 * <Screen backdrop="accent">
 *   <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
 * </Screen>
 *
 * @remarks When NOT to use
 * - **In-surface empty state** (empty table, no search results) → `<EmptyState>`.
 *   ErrorState is page-level; EmptyState lives inside a card / section.
 * - **In-flow notification** (a banner above a form) → `<Alert tone="error">`.
 * - **A status the tone scale doesn't cover** (warning / success) → extend the
 *   `ErrorStateTone` union; don't repurpose `danger`.
 *
 * @remarks Anti-patterns
 * - Multiple primary buttons. One clear primary; secondaries are
 *   `variant="secondary"` / `ghost`.
 * - A long sentence as `title` — it's the page heading, keep it short.
 *
 * @remarks A11y
 * - `tone="danger"` sets `role="alert"` so a boundary fallback announces
 *   assertively on mount — the whole subtree (title + description + actions) is
 *   read out in one burst, which suits a boundary-mounted fallback. For a
 *   *standalone* error page (not a boundary), consider passing `role={undefined}`
 *   so the content isn't announced as a wall of text on load; the title's heading
 *   semantics suffice. Override by passing your own `role`.
 * - The icon is NOT auto-`aria-hidden` — pass `aria-hidden="true"` for a
 *   decorative icon (the title carries the meaning).
 * - For `tone="neutral"`, the `<section>` is NOT a screen-reader landmark unless
 *   it has an accessible name. Pass `aria-label` (or `aria-labelledby`) when this
 *   component IS the page's primary region (typical for a full-page 404) — mirrors
 *   `EmptyState`'s guidance on named sections.
 * - `headingLevel` defaults to `1`; lower it when the component is nested under
 *   an existing heading.
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
