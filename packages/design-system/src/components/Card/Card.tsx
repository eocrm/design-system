import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';
import { CardHeader } from './CardHeader';
import { CardList } from './CardList';
import { CardListRow } from './CardListRow';

/** Inner padding. See CardProps#padding for guidance on each. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Optional left-edge tone stripe color. When set on a Card, draws a 3px
 * accent-colored bar on the left edge. Uses the same token vocabulary as Alert.
 */
export type CardTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

/** How the Card clips its children. See CardProps#overflow. */
export type CardOverflow = 'hidden' | 'visible';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Inner padding.
   * - `none` — use when the card contains a table or list that should bleed
   *   edge-to-edge; inner sections manage their own padding.
   * - `sm` (12px) — dense info cards.
   * - `md` (16px) — default for plain-content cards.
   * - `lg` (24px) — emphasis cards, marketing-style panels.
   *
   * When omitted, defaults to `'md'` for plain content, or `'none'` when the
   * card contains compound subcomponents (`Card.Header` / `Card.List` /
   * `Card.ListRow`) so the header and rows bleed to the card edge automatically.
   * Pass an explicit value to override the auto-detect.
   *
   * **Detection is shallow:** only direct children are inspected. Fragments
   * (`<>...</>`) are transparent — the detection recurses into them, so
   * conditional renders that wrap compound children in a Fragment still
   * trigger the auto-detect. But wrapping a `Card.Header` in any other
   * element (`<div>`, `<Stack>`, etc.) defeats the heuristic — pass
   * `padding="none"` explicitly in that case.
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
  /**
   * How the card clips its children at the rounded border.
   * - `hidden` (default) — children are clipped to the rounded border. This
   *   prevents the visible seam that appears at the corners when a child has
   *   square corners (Table's internal scroll wrapper, images, full-bleed
   *   media). Overlays in this library (DropdownMenu, Tooltip, Popover, Drawer,
   *   Modal) portal to `document.body` and are NOT clipped by this. Focus
   *   outlines use CSS `outline`, which is not affected by ancestor overflow.
   * - `visible` — opt out of clipping. Use when a direct child needs to
   *   overhang the card edge — decorative badges that protrude from a corner,
   *   hover-lift transforms whose shadow extends past the card border, etc.
   *
   * @default 'hidden'
   */
  overflow?: CardOverflow;
  /**
   * Fill the containing block's height and allow the Card to shrink within a
   * narrow grid cell. Use in stretched Grid, Sortable, or DashboardCanvas
   * cells whose wrapper already has a definite height. Defaults to `false`.
   */
  fill?: boolean;
}

const paddingClass: Record<CardPadding, string> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

function hasCompoundChildren(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (!isValidElement(child)) return false;
    const type = child.type;
    if (type === CardHeader || type === CardList || type === CardListRow) return true;
    // Fragments are transparent — Children.toArray preserves them as nodes,
    // but a consumer who wraps compound children in a `<>` (e.g. for a
    // conditional render) clearly still wants the auto-detect to fire.
    if (type === Fragment) {
      return hasCompoundChildren((child.props as { children?: ReactNode }).children);
    }
    return false;
  });
}

/**
 * Bordered container for grouped content. Supports an optional `tone` prop
 * that draws a 3px left-edge stripe in the tone color — useful for stat cards
 * or status panels where one card in a row needs visual emphasis. **Don't
 * nest Card in Card** — if you need to subdivide, use spacing or a horizontal
 * rule instead. If everything on your page is a card, none of them are.
 *
 * Compound API — `Card.Header` / `Card.List` / `Card.ListRow` for the
 * "section card with a list of rows" pattern. When any of these subcomponents
 * appear as a direct child, `padding` auto-defaults to `'none'` so the header
 * and rows bleed to the card edge. Pass `padding` explicitly to override.
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
 * // Compound API — section card with header + action + list rows.
 * // No `padding` prop needed: the presence of Card.Header / Card.List makes
 * // the card auto-default to padding="none".
 * <Card>
 *   <Card.Header action={<Link>View all</Link>}>
 *     Deals needing attention
 *   </Card.Header>
 *   <Card.List>
 *     {deals.map(d => (
 *       <Card.ListRow key={d.id}>
 *         <Stack gap="xs">
 *           <span>{d.title}</span>
 *           <span>{d.company}</span>
 *         </Stack>
 *         <Avatar name={d.owner} size="sm" />
 *       </Card.ListRow>
 *     ))}
 *   </Card.List>
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
 * @example
 * // Fill a bounded dashboard cell without consumer CSS:
 * <Card fill>
 *   <Card.Header>Pipeline</Card.Header>
 *   <Chart />
 * </Card>
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
 * - ❌ `<Card style={{ overflow: 'visible' }}>` — use `<Card overflow="visible">`.
 *   The default `hidden` exists so square-cornered children (Tables with internal
 *   scroll wrappers, images, full-bleed media) don't show a seam at the rounded
 *   corner.
 * - ❌ `<Card style={{ height: '100%' }}>` — use `<Card fill>`. The modifier
 *   also applies the shrink-safe minimum width required in narrow grid cells.
 * - ❌ Adding hover shadows to make Cards "interactive". If the whole card
 *   is clickable, that's a different component (`LinkCard`, not yet shipped).
 * - ❌ Cards nested in Cards. Almost always means your information
 *   architecture is wrong.
 * - ❌ Hand-rolling a left-stripe via `className` / `style`. Use the `tone`
 *   prop — it reserves the border-left space so layout never shifts.
 * - ❌ Hand-rolling `.cardHeader` / `.list` / `.listRow` SCSS. Use the
 *   compound API (`Card.Header` / `Card.List` / `Card.ListRow`) instead.
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding, tone, overflow = 'hidden', fill = false, className, children, ...props },
  ref,
) {
  // Compound subcomponents (Card.Header / Card.List / Card.ListRow) manage
  // their own internal padding and want to bleed to the card edge. When any
  // are present and `padding` wasn't passed explicitly, default to 'none' so
  // the consumer doesn't have to repeat themselves. Explicit `padding` wins.
  const effectivePadding: CardPadding = padding ?? (hasCompoundChildren(children) ? 'none' : 'md');
  // {...props} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      className={clsx(
        styles.card,
        paddingClass[effectivePadding],
        overflow === 'visible' && styles.overflowVisible,
        fill && styles.fill,
        className,
      )}
      data-tone={tone}
      {...props}
    >
      {children}
    </div>
  );
});

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  List: CardList,
  ListRow: CardListRow,
});
