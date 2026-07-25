import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './AppLayout.module.scss';

export interface AppLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Top bar slot — sits above the main content, spanning the content column to
   * the right of the sidebar (not the full window width). Omit for no top bar.
   */
  topBar?: ReactNode;
  /**
   * Sidebar slot — runs the full height down the left, alongside both the top
   * bar and the content. Sets its own width (intrinsic). Omit for no sidebar.
   */
  sidebar?: ReactNode;
  /**
   * Pin the sidebar to the viewport: `position: sticky; top: 0; height: 100dvh`
   * with internal overflow scrolling. On pages taller than the viewport the
   * sidebar (and a `Rail` inside it — its `Rail.Spacer` + `Rail.Footer` /
   * CollapseToggle) spans exactly the SCREEN, keeping the footer glued to the
   * viewport bottom instead of the page bottom. Default `false` (sidebar
   * stretches to the full row/page height — the original behavior).
   *
   * Prefer this over wrapping the sidebar slot in `Sticky` — the rail's
   * `height: 100%` + flex spacer need a DEFINITE viewport height to pin the
   * footer, which `Sticky`'s max-height capping can't provide.
   */
  sidebarPinned?: boolean;
  /** Main content slot — fills the remaining space below the top bar. */
  children: ReactNode;
}

/**
 * Viewport-filling application shell layout, matching the CRM shell topology: a
 * full-height `sidebar` down the left, an optional `topBar` over the content
 * column, and the main `children` below it. Fills the viewport
 * (`min-height: 100vh`).
 *
 * Replaces the ad-hoc `Stack` + `Cluster` shell composition consumers hand-rolled,
 * which couldn't express `min-height: 100vh` without raw CSS.
 *
 * @example
 * // Mounted once at the app root:
 * <AppLayout topBar={<TopBar />} sidebar={<Rail>{nav}</Rail>}>
 *   <Page>{routedContent}</Page>
 * </AppLayout>
 *
 * @example
 * // No sidebar — top bar + content only:
 * <AppLayout topBar={<TopBar />}>
 *   <Page>{content}</Page>
 * </AppLayout>
 *
 * @example
 * // Tall pages: pin the sidebar so a Rail's footer/CollapseToggle stays glued
 * // to the viewport bottom instead of scrolling away with the page:
 * <AppLayout sidebar={<Rail>{nav}<Rail.Spacer /><Rail.Footer>{footer}</Rail.Footer></Rail>} sidebarPinned>
 *   <Page>{routedContent}</Page>
 * </AppLayout>
 *
 * @remarks Layout-owning primitive
 * Like `<Page>` / `<Screen>` / `<Rail>`, AppLayout is the documented exception to
 * the "components don't own layout" rule — owning the full-height shell layout
 * (viewport fill + full-height sidebar + top-bar-over-content) is its entire job.
 * Its only own-styling is the content region's gutter + subtle canvas (both
 * token-driven — see below); the `topBar` / `sidebar` slots bring their own surfaces.
 *
 * @remarks Content padding
 * The main region ships the canonical shell content gutter by default
 * (`--app-layout-content-padding`, default `var(--space-6)`) — so a DS-only
 * consumer gets padded routed content with **no prop and no raw CSS** (routed
 * pages no longer render flush against the rail / top bar). Need a full-bleed
 * main region? Override the token in your scope —
 * `--app-layout-content-padding: 0` — no prop required.
 *
 * Migration: a consumer that previously added its own gutter (a
 * `padding: var(--space-6)` wrapper / shim around the routed content) should
 * remove that shim now, or the gutters double up.
 *
 * @remarks Content canvas
 * The main region paints a subtle canvas by default
 * (`--app-layout-content-background`, default `var(--color-bg-subtle)`) so white
 * `<Card>`s lift off it — matching every shipped mockup, **no prop and no raw
 * CSS**. Want a flat (transparent) content area? Override the token in your scope
 * — `--app-layout-content-background: transparent` — no prop required.
 *
 * @remarks When NOT to use
 * - ❌ For in-page content layout — use `<Stack>` / `<Cluster>` / `<Grid>`.
 * - ❌ For a chromeless full-bleed page (sign-in / 404 / error) — use `<Screen>`.
 * - ❌ Don't nest AppLayout inside another AppLayout, `<Page>`, or `<Screen>`.
 *   It's the top-level shell, mounted once at the app root.
 *
 * @remarks Scrolling
 * This is a **page-scroll** shell: `min-height: 100vh` lets it grow with tall
 * content, so the whole window scrolls and the chrome scrolls away with it. For
 * the common "fixed chrome + independently-scrolling content" layout, override
 * the root to a fixed `height: 100vh` (or `100dvh`) via `className` — then
 * `<Rail>` / the main region manage their own overflow.
 */
export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout(
  { topBar, sidebar, sidebarPinned, children, className, ...props },
  ref,
) {
  // Pattern A — props last: AppLayout is a consumer-overridable layout
  // primitive (like Stack/Card), so {...props} wins over our defaults.
  // Topology: a row of [full-height sidebar | a column of (topBar, main)] — so
  // the sidebar spans the whole height and the top bar sits only over the
  // content column, matching the CRM shell (see playground AppShell).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {sidebar != null && (
        <div className={clsx(styles.sidebar, sidebarPinned && styles.sidebarPinned)}>
          {sidebar}
        </div>
      )}
      <div className={styles.body}>
        {topBar != null && <div className={styles.topBar}>{topBar}</div>}
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
});
