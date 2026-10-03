import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Text.module.scss';

/**
 * Rendered element. Constrained to a small string union (not polymorphic).
 * If you need to render Text as a router-aware link or a custom element, use
 * `<Link>` (polymorphic via `as`) or `<Text as="span">` + your own wrapper —
 * not a generic Text.
 */
export type TextAs = 'p' | 'span' | 'div' | 'label';

/** Visual size. `'inherit'` takes font-size and line-height from the parent (inline runs inside headings). */
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'inherit';

/** Color tone. `'subtle'` is deprecated and resolves to `'muted'` — see {@link TextProps.tone}. */
export type TextTone =
  | 'default'
  | 'muted'
  /** @deprecated Resolves to `muted` (#521) — changes dark-theme appearance. Use `muted`. */
  | 'subtle'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning';

/** Font weight. */
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/** Text alignment. */
export type TextAlign = 'left' | 'center' | 'right';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /**
   * Associates a `<label>` with its form control. Only meaningful when
   * `as="label"` — passes through as the native `for` attribute.
   */
  htmlFor?: string;
  /**
   * Rendered element. Defaults to `'p'` (block, default body text). Use
   * `'span'` for inline runs, `'div'` for block containers that can't be a
   * `<p>` (e.g. when the body needs nested block-level elements that React
   * would warn about inside `<p>`), `'label'` for form labels (pair with
   * `htmlFor`).
   */
  as?: TextAs;
  /**
   * Visual size. Defaults to `'md'` (body text).
   * - `xs` — 11px, dense metadata / captions
   * - `sm` — 12px, small body / labels
   * - `md` — 14px, body text (default)
   * - `lg` — 16px, large body / lead text
   * - `xl` — 20px, very large body (rare)
   * - `inherit` — no fixed size; font-size AND line-height inherit from the
   *   parent. For inline runs inside a heading (`as="span"` inside a
   *   `<Title>` / `<PageHeader.Title>`) that must keep the heading's size —
   *   e.g. a muted task-key prefix. Tone / weight still apply — font-weight
   *   stays Text's own (default `regular`), it does NOT inherit; pass
   *   `weight` to match the heading if needed.
   */
  size?: TextSize;
  /**
   * Color tone. Defaults to `'default'`.
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted` (for secondary copy)
   * - `subtle` — **@deprecated (#521): resolves to `muted`. Use `muted`.**
   *   In LIGHT theme the two neutrals were indistinguishable: OKLab ΔE 0.0261
   *   when the deprecation was filed, 0.0365 after `--color-fg-muted` was retuned,
   *   against the 0.065 floor this library's perceptual gates use. In DARK
   *   they were 0.0707 apart — a real step — so **this deprecation changes
   *   dark-theme appearance**: `subtle` text in dark gets lighter, moving from
   *   `--color-fg-subtle` to `--color-fg-muted`. That is the accepted trade
   *   (a tier that exists in one theme only is not a tier), but it is a
   *   visual change, not the removal of a duplicate. `--text-fg-subtle` now
   *   aliases `--text-fg-muted`, so nothing breaks at the type or build level;
   *   if you need the old dark value back, override `--text-fg-subtle`.
   * - `accent` — `--color-accent`
   * - `danger` / `success` / `warning` — state-coded text
   */
  tone?: TextTone;
  /** Font weight. Defaults to `'regular'`. */
  weight?: TextWeight;
  /** Text alignment. Defaults to `'left'`. */
  align?: TextAlign;
  /**
   * Truncate to a single line with ellipsis. Defaults to `false`. Use inside
   * narrow containers (table cells, card list rows). Mutually exclusive with
   * `lineClamp` — if both are set, `lineClamp` wins.
   */
  truncate?: boolean;
  /**
   * Clamp to N lines with ellipsis (uses `-webkit-line-clamp`). Defaults to
   * `undefined`. Overrides `truncate` when set. Example: `lineClamp={2}` for
   * a 2-line description that ellipses on the third.
   *
   * If you also pass `style.WebkitLineClamp`, the `lineClamp` prop takes
   * precedence — the component merges the dynamic line-clamp value into
   * `style` AFTER spreading your `style`, so the prop wins.
   */
  lineClamp?: number;
  /** Text content. */
  children: ReactNode;
}

const SIZE_CLASS: Record<TextSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  inherit: styles.sizeInherit,
};

const TONE_CLASS: Record<TextTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  subtle: styles.toneSubtle,
  accent: styles.toneAccent,
  danger: styles.toneDanger,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
};

const WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: styles.weightRegular,
  medium: styles.weightMedium,
  semibold: styles.weightSemibold,
  bold: styles.weightBold,
};

const ALIGN_CLASS: Record<TextAlign, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight,
};

/**
 * Body / inline text primitive for all non-heading text (`p`, `span`, `div` or `label`).
 * @see docs/components/Text.md
 */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as = 'p',
    size = 'md',
    tone = 'default',
    weight = 'regular',
    align = 'left',
    truncate = false,
    lineClamp,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const Component = as;
  // lineClamp overrides truncate when both are set — lineClamp is strictly
  // more expressive.
  const useLineClamp = typeof lineClamp === 'number' && lineClamp > 0;
  const useTruncate = !useLineClamp && truncate;

  // lineClamp's `-webkit-line-clamp` is a dynamic value — set inline rather
  // than generate one class per N. Merge with any consumer-provided style.
  const mergedStyle: CSSProperties | undefined = useLineClamp
    ? { ...style, WebkitLineClamp: lineClamp }
    : style;

  // The rendered element type varies across the union, so the JSX ref slot
  // expects an intersection of all four element ref types. We cast through
  // unknown to satisfy it — the runtime type is always correct because
  // Component is exactly `as`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const domRef = ref as unknown as React.Ref<any>;

  // className merged above via clsx so consumer extensions stack with our classes;
  // {...rest} last so any other consumer-passed attr can override ours (Pattern A).
  return (
    <Component
      ref={domRef}
      className={clsx(
        styles.text,
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        WEIGHT_CLASS[weight],
        ALIGN_CLASS[align],
        useTruncate && styles.truncate,
        useLineClamp && styles.lineClamp,
        className,
      )}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Component>
  );
});
