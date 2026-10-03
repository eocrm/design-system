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
import { CardBody } from './CardBody';
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
   * card contains compound subcomponents (`Card.Header` / `Card.Body` /
   * `Card.List` / `Card.ListRow`) so its sections bleed to the card edge
   * automatically.
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
   * cells whose wrapper already has a definite height. When a direct
   * `Card.Body` child is present, `fill` also establishes Card's internal
   * column and minimum-height chain; add `scroll` to the Body to keep a sibling
   * Header fixed above a scrolling content region. Defaults to `false`.
   * @default false
   */
  fill?: boolean;
}

const paddingClass: Record<CardPadding, string> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

interface CompoundChildrenInfo {
  hasCompound: boolean;
  hasBody: boolean;
}

function inspectCompoundChildren(children: ReactNode): CompoundChildrenInfo {
  return Children.toArray(children).reduce<CompoundChildrenInfo>(
    (info, child) => {
      if (!isValidElement(child)) return info;
      const type = child.type;
      if (type === CardBody) {
        return { hasCompound: true, hasBody: true };
      }
      if (type === CardHeader || type === CardList || type === CardListRow) {
        return { ...info, hasCompound: true };
      }
      // Fragments are transparent — Children.toArray preserves them as nodes,
      // but a consumer who wraps compound children in a `<>` (e.g. for a
      // conditional render) clearly still wants the auto-detect to fire.
      if (type === Fragment) {
        const nested = inspectCompoundChildren((child.props as { children?: ReactNode }).children);
        return {
          hasCompound: info.hasCompound || nested.hasCompound,
          hasBody: info.hasBody || nested.hasBody,
        };
      }
      return info;
    },
    { hasCompound: false, hasBody: false },
  );
}

/**
 * Bordered container for grouped content, with an optional compound API (`Card.Header` / `Body` / `List` / `ListRow`).
 * @see docs/components/Card.md
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding, tone, overflow = 'hidden', fill = false, className, children, ...props },
  ref,
) {
  const compoundChildren = inspectCompoundChildren(children);
  // Compound subcomponents (Card.Header / Card.Body / Card.List /
  // Card.ListRow) manage their own internal padding and want to bleed to the
  // card edge. When any are present and `padding` wasn't passed explicitly,
  // default to 'none' so the consumer doesn't have to repeat themselves.
  // Explicit `padding` wins.
  const effectivePadding: CardPadding = padding ?? (compoundChildren.hasCompound ? 'none' : 'md');
  // {...props} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      className={clsx(
        styles.card,
        paddingClass[effectivePadding],
        overflow === 'visible' && styles.overflowVisible,
        fill && styles.fill,
        fill && compoundChildren.hasBody && styles.fillWithBody,
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
  Body: CardBody,
  Header: CardHeader,
  List: CardList,
  ListRow: CardListRow,
});
