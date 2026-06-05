import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Logo.module.scss';

/** Mark size — `sm` (24) / `md` (32, default) / `lg` (40); the shared `--size-*` scale. */
export type LogoSize = 'sm' | 'md' | 'lg';

/** Where the wordmark sits relative to the mark. */
export type LogoTextPlacement = 'end' | 'bottom';

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Wordmark rendered beside (or below) the mark — consumers pass `"eocrm"`.
   * Omit for a mark-only logo.
   */
  text?: ReactNode;
  /**
   * Where the wordmark sits relative to the mark. Defaults to `'end'` (beside);
   * `'bottom'` stacks it under the mark, centered.
   */
  textPlacement?: LogoTextPlacement;
  /** Mark size — `'sm'` (24) / `'md'` (32, default) / `'lg'` (40). */
  size?: LogoSize;
  /**
   * Accessible name for the mark when there's no `text`. Omit for a decorative
   * mark (`aria-hidden`) or when `text` is present (the text is the name).
   */
  label?: string;
  /**
   * Small, muted secondary line rendered under `text` — e.g. a plan or tagline
   * (`subtext="Free trial"`). Only shown when `text` is present.
   */
  subtext?: ReactNode;
}

const sizeClass: Record<LogoSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * The eocrm brand logo: the layered-hex mark, optionally with the `eocrm`
 * wordmark beside it (default) or below. The mark is a single-color inline SVG
 * that inherits `--logo-color` (defaults to `--color-accent`, the brand blue) —
 * override the `--logo-color` CSS variable to recolor it (e.g. on a dark surface).
 *
 * @example
 * // Mark + wordmark — the common app-header / auth lockup:
 * <Logo text="eocrm" size="lg" />
 *
 * @example
 * // Mark only — give it an accessible name when it stands alone:
 * <Logo label="eocrm" />
 *
 * @example
 * // Wordmark below the mark, centered:
 * <Logo text="eocrm" textPlacement="bottom" />
 *
 * @example
 * // With a small muted subline (the app-shell brand lockup):
 * <Logo text="eocrm" subtext="Free trial" size="sm" />
 *
 * @remarks When NOT to use
 * - For a third-party brand mark (Google / Yandex SSO) → use `<BrandIcon>`.
 * - For arbitrary content images → `<Image>`; for avatars → `<Avatar>`.
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `text` and `label` — double-announces ("eocrm eocrm"). With
 *   `text` the mark is already decorative; `label` is only for mark-only logos.
 */
export const Logo = forwardRef<HTMLDivElement, LogoProps>(function Logo(
  { text, subtext, textPlacement = 'end', size = 'md', label, className, ...props },
  ref,
) {
  const labelled = text == null && label != null && label !== '';
  return (
    // Pattern A — props last: Logo is consumer-overridable brand chrome.
    <div
      ref={ref}
      className={clsx(
        styles.logo,
        sizeClass[size],
        textPlacement === 'bottom' && styles.bottom,
        className,
      )}
      {...props}
    >
      <svg
        className={styles.mark}
        viewBox="0 0 160 160"
        role={labelled ? 'img' : undefined}
        aria-label={labelled ? label : undefined}
        aria-hidden={labelled ? undefined : true}
      >
        {labelled && <title>{label}</title>}
        <path
          d="M127.441 135.999L95.8134 152L80 144L64.1857 152L32.5579 136L80 112L127.441 135.999Z"
          fill="currentColor"
        />
        <path
          d="M160 96V119.529L143.256 127.999L80 96L16.7436 128L0 119.529V96L80 55.5294L160 96Z"
          fill="currentColor"
        />
        <path d="M160 40.4706V80L80 39.5294L0 80V40.4706L80 0L160 40.4706Z" fill="currentColor" />
      </svg>
      {text != null && (
        <span className={styles.textBlock}>
          <span className={styles.text}>{text}</span>
          {subtext != null && <span className={styles.subtext}>{subtext}</span>}
        </span>
      )}
    </div>
  );
});
