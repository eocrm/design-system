import { forwardRef, type HTMLAttributes, type Ref } from 'react';
import clsx from 'clsx';
import styles from './Cluster.module.scss';

/** Horizontal gap between children. Values in pixels: 4 / 8 / 12 / 16 / 24 / 32. */
export type ClusterGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Main-axis distribution. `between` is the toolbar pattern. */
export type ClusterJustify = 'start' | 'center' | 'end' | 'between';

/** Cross-axis alignment. */
export type ClusterAlign = 'start' | 'center' | 'end' | 'baseline';

/**
 * Rendered element. A small union rather than a fully generic polymorphic
 * `as`, mirroring `TextAs`; details on the `as` prop.
 */
export type ClusterAs = 'div' | 'span' | 'section' | 'aside';

export interface ClusterProps extends HTMLAttributes<HTMLElement> {
  /**
   * Element to render. Defaults to `'div'`.
   * - `div` (default) — block-level flex container; right for nearly all uses.
   * - `span` — renders `display: inline-flex`, for phrasing-content contexts
   *   where a block element is invalid HTML: inside `<button>` (e.g. a
   *   `ButtonGroup.Item` icon + label), `<a>`, or `<label>`.
   * - `section` — only for a genuinely standalone, nameable region; pair with
   *   `aria-label`/`aria-labelledby` (an unnamed section is just a div to AT).
   * - `aside` — exposes a `complementary` landmark to screen readers; label it,
   *   and never use it for mere visual grouping.
   *
   * `span` is the ONLY value valid inside `<button>`/`<a>`/`<label>` —
   * `section` and `aside` are flow content and remain invalid HTML there.
   */
  as?: ClusterAs;
  /**
   * Gap between children, in pixels:
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   */
  gap?: ClusterGap;
  /**
   * Horizontal distribution.
   * - `start` (default) — items at the start.
   * - `center` — items centered.
   * - `end` — items at the end. Canonical form-footer pattern.
   * - `between` — first item at start, last at end, gap between. Canonical toolbar pattern (title left, actions right).
   */
  justify?: ClusterJustify;
  /**
   * Vertical alignment.
   * - `start` / `center` (default) / `end` / `baseline`.
   */
  align?: ClusterAlign;
  /**
   * Lets the container shrink below its content's intrinsic width
   * (`min-width: 0`), so a `<Text truncate>` inside can ellipsize instead of
   * being hard-cut by a clipping ancestor.
   *
   * Reach for it when this Cluster is an item of a **row** flex container (or a
   * grid item) that clips — a `Calendar` `renderEvent` chip, a `Card.Header`
   * row. Without it the flex default (`min-width: auto`) floors the
   * container at its content's min-content width and the ellipsis never
   * appears. That floor applies because a Cluster sets no `overflow` — per CSS
   * Flexbox §4.5 a flex item keeps its automatic minimum size while its computed
   * `overflow` is non-scrollable (`visible` or `clip`); the scrollable values
   * (`hidden`/`auto`/`scroll`) drop it to `0`. That is why a `<Text truncate>`
   * (overflow hidden) never needs this and a Cluster around it does.
   *
   * It is a **no-op** inside a column `Stack` (the automatic minimum size
   * applies only on the flex MAIN axis, so there is no horizontal floor), and
   * inside a plain block or a table cell (the automatic minimum size applies
   * to flex and grid ITEMS only, so `min-width: auto` is just `0` there). A table cell is
   * a no-op for a different reason than it looks: auto table layout floors the
   * cell at its content's min-content width regardless, so what makes text
   * truncate there is `table-layout: fixed` or a `max-width` on the cell — not
   * this prop.
   *
   * Opt-in rather than the default on purpose: a container that CAN shrink
   * also VOLUNTEERS for shrink, so turning it on where the content is NOT
   * truncatable (buttons, badges, icons) lets that content be clipped
   * instead. Set it on the container whose text should give way, not on one
   * holding controls.
   *
   * Related: `<Constrain flex="grow">` applies the same `min-width: 0` but
   * also forces `flex: 1 1 0`, and renders a `<div>` — reach for this prop
   * when you want only the shrink permission, or when you are inside a
   * `<button>`/`<a>`/`<label>` where a `<div>` is invalid HTML.
   *
   * @default false
   */
  minWidth0?: boolean;
  /**
   * Caps the cluster at its container's width (`max-width: 100%`). Meant for
   * `as="span"` inside running text: an inline cluster otherwise sizes to its
   * content, so a `<Text as="span" truncate>` child with a long title makes
   * the cluster overflow the paragraph instead of ellipsizing at the line
   * edge. Combine with `wrap={false}` + a truncating child. The chip is one
   * inline box: if the text before it leaves too little room on the line, the
   * whole chip wraps to the next line, then ellipsizes at the full paragraph
   * width. Phrasing-safe (still a span) — unlike `<Constrain maxWidth>`, which
   * renders a `<div>` that is invalid inside `<p>` (#571).
   *
   * For an entity link row (icon, KEY, title, status, adornments) prefer
   * `<EntityChip truncate trailing={…}>`, which does exactly this.
   *
   * @default false
   */
  maxWidthFull?: boolean;
  /**
   * Whether children wrap to additional lines when the container is narrow.
   * - `true` (default) — natural for toolbars and tag lists.
   * - `false` — use sparingly, when overflow is preferable to wrapping
   *   (e.g. inside a narrow table cell with fixed-width action buttons).
   */
  wrap?: boolean;
}

const gapClass: Record<ClusterGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

const justifyClass: Record<ClusterJustify, string> = {
  start: styles.justifyStart,
  center: styles.justifyCenter,
  end: styles.justifyEnd,
  between: styles.justifyBetween,
};

const alignClass: Record<ClusterAlign, string> = {
  start: styles.alignStart,
  center: styles.alignCenter,
  end: styles.alignEnd,
  baseline: styles.alignBaseline,
};

/**
 * Horizontal layout primitive that wraps.
 * @see docs/components/Cluster.md
 */
export const Cluster = forwardRef<HTMLElement, ClusterProps>(function Cluster(
  {
    as = 'div',
    gap = 'md',
    justify = 'start',
    align = 'center',
    wrap = true,
    minWidth0 = false,
    maxWidthFull = false,
    className,
    ...props
  },
  ref,
) {
  const Component = as;
  // The rendered element type varies across the union, so the JSX ref slot
  // expects an intersection of the element ref types. Cast like Text does —
  // the runtime type is always correct because Component is exactly `as`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const domRef = ref as unknown as Ref<any>;
  // className merged via clsx so consumer classes stack with ours;
  // {...props} last so the consumer can override anything (Pattern A).
  return (
    <Component
      ref={domRef}
      className={clsx(
        styles.cluster,
        as === 'span' && styles.inline,
        gapClass[gap],
        justifyClass[justify],
        alignClass[align],
        wrap && styles.wrap,
        minWidth0 && styles.minWidth0,
        maxWidthFull && styles.maxWidthFull,
        className,
      )}
      {...props}
    />
  );
});
