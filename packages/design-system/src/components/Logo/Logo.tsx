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
   * Rendered as an `<img>` (`object-fit: contain`) with no CSS recolor — the
   * asset carries its own color. For third-party SSO marks use `<BrandIcon>`.
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
   * (the wordmark is the name). Never pass both `text` and `label`.
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
 * Latin lowercase letters that top out at x-height, plus separators that never
 * rise above it (`.` sits on the baseline, `,` hangs below it, `-` is
 * mid-x-height, space has no ink). Deliberately an allowlist rather than "no
 * uppercase": the ascenders
 * (`b d f h k l t`), the dotted `i`/`j`, digits, and every non-Latin script
 * reach well above x-height. Descenders (`g p q y`) are in the set — the
 * under-edge is the same in both branches, so they're unaffected by the choice.
 *
 * "Tops out at x-height" is the type designer's line, not a pixel guarantee: the
 * round letters (`a c e o s`) overshoot it by ~1% of em in most faces, `eocrm`
 * included. That overshoot is inherent to `ex` and far too small to read as
 * misalignment; it's the ascender-sized differences this list exists to catch.
 *
 * The lookahead requires at least one letter, so a whitespace- or
 * punctuation-only wordmark doesn't qualify on a technicality.
 */
const X_HEIGHT_ONLY = /^(?=.*[acemnopqrsuvwxyzg])[acemnopqrsuvwxyzg\s\-.,]+$/;

/**
 * Which edge the wordmark's text box should be trimmed to. `ex` pulls the box
 * down to the x-height so an all-lowercase wordmark optically centers against
 * the mark; `cap` is the conservative choice everywhere else.
 *
 * Note `cap` is not an ink-tight guarantee either — in most text faces the
 * ascender sits slightly above cap height, and diacritics (`É`, `Å`, `Й`) sit
 * above both. Neither clips: `text-box-trim` resizes the box, it does not crop
 * what overflows it. The choice is about where the lockup's optical centre
 * lands, and `cap` errs toward leaving headroom rather than removing too much.
 */
function getTextMetric(text: ReactNode): 'cap' | 'ex' {
  // A non-string wordmark (an element, a fragment) has no inspectable glyphs,
  // so fall back to the conservative edge.
  if (typeof text !== 'string') {
    return 'cap';
  }

  return X_HEIGHT_ONLY.test(text) ? 'ex' : 'cap';
}

/**
 * Brand logo lockup: a consumer-supplied mark image, optionally with a wordmark beside or below and a muted subline.
 * @see docs/components/Logo.md
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
