import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './Split.module.scss';
import { COLLAPSE_BREAKPOINT_PX, type CollapseBreakpoint } from '../_internal/collapse';
import { mergeRefs } from '../_internal/refs';

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
   * A pinned `asideWidth` is preserved while the panes are side-by-side and
   * space is available, but can shrink as the container narrows so the stacked
   * panes stay within the split.
   *
   * Collapsed panes stack in **DOM order**, not always aside-first: with
   * the default `side="start"` that's aside → main; with `side="end"` it's
   * main → aside, because that's the order the panes are in the DOM. Forcing
   * aside-first when collapsed would need CSS `order`, which desynchronizes
   * visual order from tab order — an a11y defect. If you need the aside on top
   * when stacked, use `side="start"`.
   *
   * A `<Sticky>` passed as the `aside` stops pinning (and drops its `scroll`
   * height cap) while stacked, so it can't trap the page scroll on a phone.
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
  /**
   * Called with `true` when a `collapseBelow` split stacks and `false` when it
   * goes back side by side — once on mount with the initial state, then on
   * every change. Ignored without `collapseBelow`.
   *
   * Use it to move content you own between placements so DOM order matches
   * visual order in both states, instead of CSS `order` — e.g. render a
   * comment thread at the end of `main` while side by side and after the
   * `<Split>` once stacked, or a status switcher at the top of the aside vs.
   * above the split.
   *
   * It measures the SPLIT'S OWN content width against the same inclusive
   * threshold its container query uses (a `ResizeObserver`, read
   * synchronously on mount so the first paint is already right), so it agrees
   * with the CSS where `useBelowBreakpoint` — which measures the viewport —
   * would not beside an app sidebar. The same state is on the root as
   * `data-collapsed="true" | "false"`.
   */
  onCollapsedChange?: (collapsed: boolean) => void;
}

/** Content-box inline size — what `container-type: inline-size` queries. */
function contentWidth(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const px = (v: string) => parseFloat(v) || 0;
  return (
    el.getBoundingClientRect().width -
    px(cs.paddingLeft) -
    px(cs.paddingRight) -
    px(cs.borderLeftWidth) -
    px(cs.borderRightWidth)
  );
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
 * @example
 * // Record detail: comments last on the page in both states (#563).
 * const [stacked, setStacked] = useState(false);
 * <>
 *   <Split aside={<Sidebar />} side="end" collapseBelow="lg" onCollapsedChange={setStacked}>
 *     <RecordData />
 *     {!stacked && <Comments />}
 *   </Split>
 *   {stacked && <Comments />}
 * </>
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
    onCollapsedChange,
    className,
    style,
    ...props
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<boolean>();
  const onChangeRef = useRef(onCollapsedChange);
  onChangeRef.current = onCollapsedChange;

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!collapseBelow || !el) {
      setCollapsed(undefined);
      return;
    }
    let last: boolean | undefined;
    const measure = () => {
      // Inclusive, like `@container (max-width: …)`.
      const next = contentWidth(el) <= COLLAPSE_BREAKPOINT_PX[collapseBelow];
      if (next === last) return;
      last = next;
      setCollapsed(next);
      onChangeRef.current?.(next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapseBelow]);

  const asideCell = <div className={styles.aside}>{aside}</div>;
  const mainCell = <div className={styles.main}>{children}</div>;
  return (
    <div
      ref={mergeRefs(ref, rootRef)}
      data-collapsed={collapsed === undefined ? undefined : String(collapsed)}
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
