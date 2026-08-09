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
 * centers against the mark. Adding a `subtext` also moves the wordmark's *under*
 * edge from the baseline down to the font's descent, so `--logo-text-gap` is
 * clear space rather than something the descenders eat into. That gap is
 * therefore measured from the descent line, not from the ink: with a
 * descender-free wordmark the visible space runs about 1.8–2.3× the token.
 * Browsers without `text-box-trim` (Firefox as of 2026-08) keep the untrimmed
 * leading and `--logo-text-gap` does not apply; the lockup reads looser and
 * taller there, never clipped.
 *
 * Because the trim is new, two things changed relative to previous versions on
 * supporting browsers. **Height:** most `subtext` lockups and every
 * `textPlacement="bottom"` lockup are shorter — a subtext-less
 * `textPlacement="bottom"` at `size="lg"` goes 74.4px → 59.6px with the
 * playground's Outfit wordmark. The plain side-by-side lockup keeps its height,
 * since the mark sets it. **Position:** the wordmark rises against the mark in
 * every shape, including those whose height is unchanged — side-by-side, its ink
 * centre sat 1.3/2.2/3.0px below the mark's *box* centre at sm/md/lg and now
 * sits within 0.1px. That is the correction, but it means every lockup with a
 * wordmark moved visually. All these figures are Chromium + Outfit-600 and are
 * not pinned by any test; re-measure in your own face. Size fixed-height brand
 * bars off the mark rather than the lockup; AGENTS.md has the per-shape figures.
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
 * // With a small muted subline — a name + plan lockup:
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
