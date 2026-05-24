import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Title.module.scss';

/** Heading semantic level — what `<hN>` element to render and the default visual size. */
export type TitleOrder = 1 | 2 | 3 | 4 | 5 | 6;

/** Visual size override. When omitted, derived from `order` (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm). */
export type TitleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/** Color tone. Tone maps to a `--color-*` token. */
export type TitleTone = 'default' | 'muted' | 'subtle' | 'accent' | 'danger';

/** Font weight. */
export type TitleWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Heading semantic level (1–6). REQUIRED — forces the consumer to think about
   * heading hierarchy on the page. Drives both the rendered element (`<h1>`–`<h6>`)
   * and the default visual size (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm).
   */
  order: TitleOrder;
  /**
   * Visual size override. Defaults to the size for the given `order`. Use this
   * when the semantic level and the visual size need to diverge — e.g. a small
   * section title that's still an `<h2>` for screen readers.
   */
  size?: TitleSize;
  /**
   * Color tone. Defaults to `'default'` (full foreground).
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted`
   * - `subtle` — `--color-fg-subtle`
   * - `accent` — `--color-accent`
   * - `danger` — `--color-danger`
   */
  tone?: TitleTone;
  /**
   * Font weight. Defaults to `'semibold'` (matches the most common heading
   * weight across the existing mockups).
   */
  weight?: TitleWeight;
  /**
   * Truncate the title to a single line with ellipsis. Useful inside narrow
   * cards or grid cells. Defaults to `false`.
   */
  truncate?: boolean;
  /** Title text content. */
  children: ReactNode;
}

/**
 * Default size map keyed by `order`. Each heading level maps to one font-size
 * token. Override via the `size` prop when the semantic level and visual size
 * should diverge.
 */
const SIZE_BY_ORDER: Record<TitleOrder, TitleSize> = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'md',
  6: 'sm',
};

const SIZE_CLASS: Record<TitleSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  '2xl': styles.size2xl,
  '3xl': styles.size3xl,
};

const TONE_CLASS: Record<TitleTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  subtle: styles.toneSubtle,
  accent: styles.toneAccent,
  danger: styles.toneDanger,
};

const WEIGHT_CLASS: Record<TitleWeight, string> = {
  regular: styles.weightRegular,
  medium: styles.weightMedium,
  semibold: styles.weightSemibold,
  bold: styles.weightBold,
};

/**
 * Semantic heading primitive. Renders `<h1>`–`<h6>` based on `order`, with a
 * default visual size from the order→size map. Use `size` to decouple the
 * visual size from the semantic level (e.g. a nested section that needs a
 * smaller-looking h2).
 *
 * Use `<Title>` for ALL heading text in your UI. Don't write raw `<h1>` /
 * `<h2>` / `<h3>` elements with className — the typography primitives exist
 * precisely so you never need to.
 *
 * @example
 * // Page title — biggest, h1 for screen readers:
 * <Title order={1}>Dashboard</Title>
 *
 * @example
 * // Section heading at the canonical size:
 * <Title order={2}>Recent activity</Title>
 *
 * @example
 * // Override visual size when nested deep but you still want the right SR level:
 * <Title order={2} size="lg">Section that's semantically h2 but visually compact</Title>
 *
 * @example
 * // De-emphasize via tone:
 * <Title order={3} tone="muted">Filter group label</Title>
 *
 * @remarks When NOT to use
 * - For body text. Use `<Text>` instead.
 * - For inline emphasis. Use `<strong>` / `<em>` / `<Text weight="semibold">`.
 * - When you only want monospaced text (e.g. a code identifier). Use `<Code>`.
 * - To pick a font size visually without thinking about heading hierarchy.
 *   The required `order` prop is there to force the conversation: what level
 *   is this heading on the page?
 *
 * @remarks Anti-patterns
 * - ❌ `<h2 className={styles.title}>` — use `<Title order={2}>`. The library
 *   exists so consumer SCSS never names a typography class.
 * - ❌ `<Title order={1} size="xs">` — almost certainly a sign that the page's
 *   heading hierarchy is wrong. Bump the order to a higher number instead of
 *   shrinking a low-order heading.
 * - ❌ Skipping heading levels (`order={1}` then jumping to `order={4}`).
 *   Hurts SR users. Use sequential orders.
 */
export const Title = forwardRef<HTMLHeadingElement, TitleProps>(function Title(
  {
    order,
    size,
    tone = 'default',
    weight = 'semibold',
    truncate = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const Heading = `h${order}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const effectiveSize = size ?? SIZE_BY_ORDER[order];
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <Heading
      ref={ref}
      className={clsx(
        styles.title,
        SIZE_CLASS[effectiveSize],
        TONE_CLASS[tone],
        WEIGHT_CLASS[weight],
        truncate && styles.truncate,
        className,
      )}
      {...rest}
    >
      {children}
    </Heading>
  );
});
