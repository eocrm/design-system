import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Logo.module.scss';

/** Mark size — `sm` (24) / `md` (32, default) / `lg` (40); the shared `--size-*` scale. */
export type LogoSize = 'sm' | 'md' | 'lg';

/** Where the wordmark sits relative to the mark. */
export type LogoTextPlacement = 'end' | 'bottom';

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The brand mark image URL — typically an imported SVG/PNG asset. The mark is
   * a **consumer-owned asset**; the design system ships no logo of its own.
   */
  src: string;
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
   * Accessible name for the mark when there's no `text` (used as the image
   * `alt`). Omit for a decorative mark (`alt=""`), or when `text` is present
   * (the wordmark is the name).
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
 * Latin lowercase letters whose ink tops out at x-height, plus the separators
 * that do the same. Deliberately an allowlist rather than "no uppercase": the
 * ascenders (`b d f h k l t`), the dotted `i`/`j`, digits, and every non-Latin
 * script reach above x-height, so trimming to the x-height edge would cut the
 * box above their ink. Descenders (`g p q y`) are in the set — the under-edge
 * is the same in both branches, so they are unaffected by the choice.
 *
 * The lookahead requires at least one letter, so a whitespace- or
 * punctuation-only wordmark doesn't qualify on a technicality.
 */
const X_HEIGHT_ONLY = /^(?=.*[acemnopqrsuvwxyzg])[acemnopqrsuvwxyzg\s\-.,]+$/;

/**
 * Which edge the wordmark's text box should be trimmed to. `ex` pulls the box
 * down to the x-height so an all-lowercase wordmark optically centers against
 * the mark; `cap` is the safe choice everywhere else — it can only ever leave a
 * little headroom, never crop ink.
 */
function getTextMetric(text: ReactNode): 'cap' | 'ex' {
  // A non-string wordmark (an element, a fragment) has no inspectable glyphs,
  // so fall back to the edge that cannot crop.
  if (typeof text !== 'string') {
    return 'cap';
  }

  return X_HEIGHT_ONLY.test(text) ? 'ex' : 'cap';
}

/**
 * Brand logo lockup: a consumer-supplied mark image (`src`), optionally with a
 * wordmark beside it (default) or below, plus an optional muted subline. The
 * design system arranges and sizes the lockup; the mark itself is a
 * consumer-owned asset — import an SVG/PNG and pass its URL.
 *
 * The wordmark's font + weight are themeable via the `--logo-text-font` /
 * `--logo-text-font-weight` CSS variables (the `subtext` is unaffected).
 * Spacing is themeable via `--logo-gap` (mark → wordmark, default
 * `var(--space-2)`) and `--logo-text-gap` (wordmark → `subtext`, default
 * `var(--space-1)`).
 *
 * Where `text-box-trim` is supported the lockup trims the wordmark's
 * half-leading and aligns it to its cap edge — or its x-height edge when the
 * wordmark is entirely x-height glyphs, e.g. `text="eocrm"` — so it optically
 * centers against the mark. Browsers without `text-box-trim` (Firefox as of
 * 2026-08) keep the untrimmed leading and `--logo-text-gap` does not apply; the
 * lockup reads slightly looser there, never clipped.
 *
 * @example
 * // Mark + wordmark — the common app-header / auth lockup:
 * import logo from '../assets/eocrm-logo.svg';
 * <Logo src={logo} text="eocrm" size="lg" />
 *
 * @example
 * // Mark only — give it an accessible name when it stands alone:
 * <Logo src={logo} label="eocrm" />
 *
 * @example
 * // Wordmark below the mark, centered:
 * <Logo src={logo} text="eocrm" textPlacement="bottom" />
 *
 * @example
 * // With a small muted subline (the app-shell brand lockup):
 * <Logo src={logo} text="eocrm" subtext="Free trial" size="sm" />
 *
 * @remarks When NOT to use
 * - For a third-party brand mark (Google / Yandex SSO) → use `<BrandIcon>`.
 * - For arbitrary content images → `<Image>`; for avatars → `<Avatar>`.
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `text` and `label` — double-announces. With `text` the mark
 *   is decorative (`alt=""`); `label` is only for a mark-only logo.
 */
export const Logo = forwardRef<HTMLDivElement, LogoProps>(function Logo(
  { src, text, subtext, textPlacement = 'end', size = 'md', label, className, ...props },
  ref,
) {
  // With `text`, the wordmark conveys the name → the mark is decorative (alt="").
  // Mark-only → `label` is the accessible name; absent → decorative.
  const alt = text == null && label ? label : '';
  const textMetric = getTextMetric(text);

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
      <img className={styles.mark} src={src} alt={alt} />
      {text != null && (
        <span className={styles.textBlock}>
          <span className={clsx(styles.text, textMetric === 'ex' ? styles.textEx : styles.textCap)}>
            {text}
          </span>
          {subtext != null && <span className={styles.subtext}>{subtext}</span>}
        </span>
      )}
    </div>
  );
});
