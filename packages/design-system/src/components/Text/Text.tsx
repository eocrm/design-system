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

/** Visual size. */
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Color tone. */
export type TextTone =
  | 'default'
  | 'muted'
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
   */
  size?: TextSize;
  /**
   * Color tone. Defaults to `'default'`.
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted` (for secondary copy)
   * - `subtle` — `--color-fg-subtle` (for tertiary metadata)
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
 * Body / inline text primitive. Constrained-as dispatch (no polymorphic
 * generic) — accepts `p` (default), `span`, `div`, or `label`. Use for ALL
 * non-heading text in your UI: paragraphs, captions, labels, inline runs.
 *
 * Don't reach for raw `style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}` —
 * that's the whole reason `<Text>` exists. If you need a size / tone the
 * primitive doesn't expose, that's a token-vocabulary conversation, not a
 * component-skipping one.
 *
 * @example
 * // Default body text — block, md, regular:
 * <Text>Acme Inc · Renewal due Q3.</Text>
 *
 * @example
 * // Inline run inside a parent — span, smaller, muted:
 * <Text as="span" size="sm" tone="muted">12m ago</Text>
 *
 * @example
 * // Form label paired with an input:
 * <Text as="label" htmlFor="email" weight="medium">Email</Text>
 * <Input id="email" />
 *
 * @example
 * // Multi-line clamp inside a narrow card:
 * <Text lineClamp={2}>
 *   A long deal description that we want to ellipsis after two lines so the
 *   card stays at a predictable height.
 * </Text>
 *
 * @example
 * // State-coded inline text (e.g. validation message):
 * <Text size="sm" tone="danger">Email is required.</Text>
 *
 * @example
 * // Body copy under a heading, spaced with Stack — the canonical CRM-page shape:
 * <Stack gap="xs">
 *   <Title order={2}>Pipeline</Title>
 *   <Text tone="muted">Active deals for Q3.</Text>
 * </Stack>
 *
 * @remarks When NOT to use
 * - For heading text. Use `<Title order={N}>`.
 * - For inline `<code>`-style content. Use `<Code>`.
 * - For action triggers (clickable text). Use `<Button>` or `<Link>`.
 * - For pure layout containers. Use `<Stack>` / `<Cluster>` / `<Grid>`.
 *
 * @remarks Anti-patterns
 * - ❌ `<span style={{ fontSize: 'var(--font-size-sm)' }}>` — use `<Text as="span" size="sm">`.
 * - ❌ `<Text style={{ color: '#someHex' }}>` — pick a tone from the whitelist.
 *   The whitelist is the contract.
 * - ❌ `<Text as="h2">` — Text doesn't accept heading tags. Use `<Title order={2}>`.
 * - ❌ Wrapping a `<Title>` in `<Text>` for tone/weight tweaks. Pass tone/weight
 *   directly to the `<Title>` instead.
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
