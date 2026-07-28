import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Split.module.scss';
import type { CollapseBreakpoint } from '../_internal/collapse';

/** Which side the `aside` pane sits on. RTL-aware (DOM + column order flip together). */
export type SplitSide = 'start' | 'end';

/** Gap between the two panes. Same scale as Stack/Cluster/Grid. */
export type SplitGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Cross-axis (vertical) alignment of the two panes. */
export type SplitAlign = 'start' | 'stretch' | 'center';

export interface SplitProps extends HTMLAttributes<HTMLDivElement> {
  /** The narrow, intrinsic-width pane — a vertical `Tabs` rail, filter list, or nav column. */
  aside: ReactNode;
  /**
   * Which side `aside` sits on.
   * - `'start'` (default) — leading edge (left in LTR).
   * - `'end'` — trailing edge (right in LTR).
   */
  side?: SplitSide;
  /**
   * `aside` column width.
   * - `'auto'` (default) — intrinsic; sizes to the pane's content.
   * - a CSS length (e.g. `'240px'`) — pins the column so `main` doesn't reflow
   *   when `aside` content changes width.
   */
  asideWidth?: string;
  /**
   * Gap between the two panes, in pixels:
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   * Same scale as Stack, Cluster, and Grid.
   */
  gap?: SplitGap;
  /**
   * Cross-axis (vertical) alignment of the panes.
   * - `'start'` (default) — panes hug the top.
   * - `'stretch'` — `aside` matches `main`'s height (full-height bordered rail).
   * - `'center'` — panes vertically centered.
   */
  align?: SplitAlign;
  /**
   * Stack the two panes vertically when the SPLIT'S OWN width (container
   * query, not viewport) drops below the preset: `sm` 480px / `md` 640px /
   * `lg` 768px. Same scale as `Grid`'s `collapseBelow`. Without it a pinned
   * `asideWidth` rail squeezes `main` to nothing on narrow screens.
   *
   * Collapsed panes stack in **DOM order**, not always aside-first: with
   * the default `side="start"` that's aside → main; with `side="end"` it's
   * main → aside, because that's the order the panes are in the DOM. Forcing
   * aside-first when collapsed would need CSS `order`, which desynchronizes
   * visual order from tab order — an a11y defect. If you need the aside on top
   * when stacked, use `side="start"`.
   *
   * ❌ Anti-pattern: a `collapseBelow` split must get its width from its
   * parent. `container-type: inline-size` zeroes the split's contribution to
   * intrinsic sizing, so in an intrinsic-width context (another `Split`'s
   * default `auto` aside track, a `Cluster` item, `width: max-content`) it
   * renders at width 0 — give the parent a concrete width instead. The split
   * also becomes the containing block for absolutely-positioned descendants
   * (layout containment). Splits without the prop pay none of this.
   */
  collapseBelow?: CollapseBreakpoint;
}

const gapClass: Record<SplitGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

const collapseClass: Record<CollapseBreakpoint, string> = {
  sm: styles.collapseSm,
  md: styles.collapseMd,
  lg: styles.collapseLg,
};

const alignClass: Record<SplitAlign, string> = {
  start: styles.alignStart,
  stretch: styles.alignStretch,
  center: styles.alignCenter,
};

/**
 * Master–detail layout primitive: an intrinsic-width `aside` pane beside a
 * filling `main` pane (`children`), via CSS grid `auto 1fr`. Sibling to
 * `Stack` (vertical) / `Cluster` (horizontal-wrap) / `Grid` (2D). Like those —
 * and `AppLayout`/`Page`/`Screen` — Split is a documented exception to the
 * "components don't own layout" rule: it owns only its internal grid.
 *
 * Use it whenever a narrow rail (a vertical `Tabs` strip, a filter list, a nav
 * column) sits beside a wider detail panel. Unlike `Cluster` it never wraps the
 * panel below the rail; unlike `Grid columns={2}` the rail keeps its natural
 * width instead of taking half.
 *
 * @example
 * // Vertical Tabs rail beside its detail panel (the canonical use):
 * <Split aside={<Tabs orientation="vertical" items={items} activeId={id} onChange={setId} />}>
 *   <SectionPanel id={id} />
 * </Split>
 *
 * @example
 * // Pinned rail width, aside on the right:
 * <Split aside={<Filters />} side="end" asideWidth="260px" gap="lg">
 *   <Results />
 * </Split>
 *
 * @example
 * // Settings screen that stacks on narrow containers (rail on top, DOM order).
 * <Split aside={<Tabs orientation="vertical" ... />} asideWidth="220px" collapseBelow="sm">
 *   <SettingsPanel />
 * </Split>
 *
 * @remarks When NOT to use
 * - For equal-width columns — use `<Grid columns={2}>`. Split is intentionally
 *   asymmetric (intrinsic aside + filling main).
 * - For a wrapping row of peers (toolbar, tag list) — use `<Cluster>`.
 * - For the app-level shell (full-height sidebar + topbar) — use `<AppLayout>`.
 *   Split is for *in-page* two-pane regions.
 *
 * @remarks Anti-patterns
 * - ❌ Putting primary page navigation in `aside`. That belongs in the app
 *   shell (`<Rail>` / `<AppLayout sidebar>`); Split's aside is intra-page.
 * - ❌ Expecting `main` to push the layout wider than its container — it has
 *   `min-width: 0`, so its content shrinks/scrolls instead of overflowing.
 * - ❌ A `collapseBelow` split in an intrinsic-width context (another
 *   `Split`'s default `auto` aside track, a `Cluster` item,
 *   `width: max-content`). `container-type: inline-size` makes it contribute
 *   zero intrinsic width, so it renders at width 0 — give the parent a
 *   concrete width instead.
 */
export const Split = forwardRef<HTMLDivElement, SplitProps>(function Split(
  {
    aside,
    children,
    side = 'start',
    asideWidth = 'auto',
    gap = 'md',
    align = 'start',
    collapseBelow,
    className,
    style,
    ...props
  },
  ref,
) {
  const asideCell = <div className={styles.aside}>{aside}</div>;
  const mainCell = <div className={styles.main}>{children}</div>;
  return (
    <div
      ref={ref}
      className={clsx(
        styles.split,
        side === 'end' ? styles.sideEnd : styles.sideStart,
        gapClass[gap],
        alignClass[align],
        collapseBelow && styles.collapsible,
        collapseBelow && collapseClass[collapseBelow],
        className,
      )}
      // asideWidth → custom property the SCSS grid template reads. Consumer
      // `style` spread AFTER so they can still override anything.
      style={{ '--split-aside-width': asideWidth, ...style } as CSSProperties}
      {...props}
    >
      {side === 'end' ? (
        <>
          {mainCell}
          {asideCell}
        </>
      ) : (
        <>
          {asideCell}
          {mainCell}
        </>
      )}
    </div>
  );
});
