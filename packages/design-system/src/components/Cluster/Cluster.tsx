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
   * appears. That floor applies because a Cluster's overflow is `visible` —
   * per CSS Flexbox §4.5 a flex item has no automatic minimum size once its
   * overflow is anything else, which is why a `<Text truncate>` (overflow
   * hidden) never needs this and a Cluster around it does.
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
 * Horizontal layout primitive that wraps. Use for button rows, toolbars,
 * tag lists, breadcrumbs — anywhere you'd otherwise write
 * `display: flex; gap: ...; flex-wrap: wrap`.
 *
 * @example
 * // Form footer (the most common use):
 * <Cluster justify="end" gap="sm">
 *   <Button variant="secondary">Cancel</Button>
 *   <Button type="submit">Save</Button>
 * </Cluster>
 *
 * @example
 * // Toolbar: title on the left, actions on the right.
 * <Cluster justify="between" gap="md">
 *   <h1>Users</h1>
 *   <Cluster gap="sm">
 *     <Button variant="secondary">Filter</Button>
 *     <Button>Add user</Button>
 *   </Cluster>
 * </Cluster>
 *
 * @example
 * // Tag list — wraps to multiple lines when narrow.
 * <Cluster gap="xs">
 *   {tags.map(t => <Badge key={t.id} tone={t.tone}>{t.label}</Badge>)}
 * </Cluster>
 *
 * @example
 * // Inline, inside a <button> where a <div> is invalid HTML — as="span"
 * // renders inline-flex (icon + label in a segmented ButtonGroup.Item):
 * <ButtonGroup.Item value="list">
 *   <Cluster as="span" gap="xs" align="center" wrap={false}>
 *     <List size={14} aria-hidden />
 *     List
 *   </Cluster>
 * </ButtonGroup.Item>
 *
 * @example
 * // minWidth0 — custom Calendar chip content that ellipsizes instead of
 * // hard-clipping. The chip is a <button> with overflow: hidden, so the
 * // Cluster is a flex item and needs to be allowed to shrink:
 * <Calendar
 *   events={events}
 *   renderEvent={(event) => (
 *     <Cluster as="span" gap="xs" align="center" wrap={false} minWidth0>
 *       <Dot color="violet" />
 *       <Text as="span" size="inherit" truncate>{event.title}</Text>
 *     </Cluster>
 *   )}
 * />
 *
 * @remarks When NOT to use
 * - For aligned columns of equal width — use `<Grid>`. Cluster wraps
 *   unpredictably at narrow widths and isn't a column system.
 * - For content that must never wrap — set `wrap={false}` if you must, but
 *   reconsider whether that's truly required on narrow viewports.
 *
 * @remarks Anti-patterns
 * - ❌ Cluster as a 2-column layout. Use `<Grid columns={2}>` for "two columns, always".
 * - ❌ Inline `style={{ marginLeft: 'auto' }}` on a child to push it right.
 *   Use `justify="between"` (with a sibling on the left) or split into two
 *   Clusters in the parent.
 * - ❌ `minWidth0` on a Cluster holding buttons or badges. It lets the
 *   container shrink, so non-truncatable content gets clipped instead. Use it
 *   on the container whose TEXT should give way.
 * - ❌ `as="span"` as a general styling hook. Reach for it only when block
 *   content is invalid HTML (inside `<button>`, `<a>`, `<label>`); in normal
 *   flow, the default block `div` is what you want.
 */
export const Cluster = forwardRef<HTMLElement, ClusterProps>(function Cluster(
  {
    as = 'div',
    gap = 'md',
    justify = 'start',
    align = 'center',
    wrap = true,
    minWidth0 = false,
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
        className,
      )}
      {...props}
    />
  );
});
