import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

/** Inner padding. See CardProps#padding for guidance on each. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Optional left-edge tone stripe color. When set on a Card, draws a 3px
 * accent-colored bar on the left edge. Uses the same token vocabulary as Alert.
 */
export type CardTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Inner padding.
   * - `none` — use when the card contains a table or list that should bleed
   *   edge-to-edge; inner sections manage their own padding.
   * - `sm` (12px) — dense info cards.
   * - `md` (16px, default) — most cases.
   * - `lg` (24px) — emphasis cards, marketing-style panels.
   */
  padding?: CardPadding;
  /**
   * Optional left-edge tone stripe (3px). Useful for "stat card" / "status card"
   * patterns where one card in a row needs visual emphasis. Default: no stripe
   * (the card keeps its standard bordered look).
   *
   * Uses the same tone vocabulary as `Alert`: `accent` / `info` / `success` /
   * `warning` / `danger`.
   */
  tone?: CardTone;
}

const paddingClass: Record<CardPadding, string> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

/**
 * Bordered container for grouped content. Supports an optional `tone` prop
 * that draws a 3px left-edge stripe in the tone color — useful for stat cards
 * or status panels where one card in a row needs visual emphasis. **Don't
 * nest Card in Card** — if you need to subdivide, use spacing or a horizontal
 * rule instead. If everything on your page is a card, none of them are.
 *
 * @example
 * <Card padding="md">
 *   <Stack gap="md">
 *     <h3>Acme team plan</h3>
 *     <p>Renewal due Q3.</p>
 *     <Cluster justify="end" gap="sm">
 *       <Button variant="secondary">Archive</Button>
 *       <Button>View deal</Button>
 *     </Cluster>
 *   </Stack>
 * </Card>
 *
 * @example
 * // Card with a bleeding table inside — sections control their own padding:
 * <Card padding="none">
 *   <header style={{ padding: 16 }}>Header</header>
 *   <ul>...</ul>
 * </Card>
 *
 * @example
 * // Tone-coded stat cards — row of cards, each with a left-edge stripe:
 * <Cluster gap="md" wrap>
 *   <Card padding="md" tone="accent">Open deals</Card>
 *   <Card padding="md" tone="success">Won this month</Card>
 *   <Card padding="md" tone="danger">Churned</Card>
 * </Cluster>
 *
 * @remarks When NOT to use
 * - As the only child of another Card. **Never nest cards.** If you need to
 *   subdivide, use spacing or a horizontal rule inside one card.
 * - As a layout primitive. Card is for *semantic grouping*; for layout use
 *   `Stack` / `Cluster` / CSS Grid.
 * - For every container. If the page looks like a deck of cards, nothing is
 *   visually grouped. Use Card for content that actually represents a unit.
 *
 * @remarks Anti-patterns
 * - ❌ `<Card style={{ padding: 20 }}>` — use the `padding` prop. If the
 *   value you need isn't there, it's a token/scale conversation.
 * - ❌ Adding hover shadows to make Cards "interactive". If the whole card
 *   is clickable, that's a different component (`LinkCard`, not yet shipped).
 * - ❌ Cards nested in Cards. Almost always means your information
 *   architecture is wrong.
 * - ❌ Hand-rolling a left-stripe via `className` / `style`. Use the `tone`
 *   prop — it reserves the border-left space so layout never shifts.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', tone, className, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      className={clsx(styles.card, paddingClass[padding], className)}
      data-tone={tone}
      {...props}
    />
  );
});
