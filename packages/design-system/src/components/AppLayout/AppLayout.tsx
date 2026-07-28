import { forwardRef, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { useBelowBreakpoint } from '../../hooks/useBelowBreakpoint';
import type { CollapseBreakpoint } from '../_internal/collapse';
import { useControllableState } from '../_internal/useControllableState';
import { Drawer } from '../Drawer';
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
   * sidebar (and a `Rail` inside it — including its `Rail.Footer` /
   * CollapseToggle) spans exactly the SCREEN, keeping the footer glued to the
   * viewport bottom instead of the page bottom. Default `false` (sidebar
   * stretches to the full row/page height — the original behavior).
   *
   * Prefer this over wrapping the sidebar slot in `Sticky` — the rail pins its
   * footer by filling its own `height: 100%` box, which needs a DEFINITE
   * height to resolve against. `Sticky` sets `align-self: start`, which drops
   * the row stretch that made it definite, so the footer stops pinning.
   *
   * `100dvh` is always relative to the real browser viewport, never to a
   * nested scroll container — so this only pins correctly when AppLayout is
   * the actual outermost, page-scroll shell (its documented top-level use).
   * Nest it inside another scrollable region and the sidebar will size to
   * the whole window, not that region, and overflow it.
   */
  sidebarPinned?: boolean;
  /**
   * Move the sidebar out of the flow and into a left-anchored `<Drawer>` while
   * the **viewport** is at or below a width threshold: `'sm'` 480px / `'md'`
   * 640px / `'lg'` 768px. Omit for no responsive behavior (the default) — the
   * sidebar always renders in the flow.
   *
   * Below the threshold the content column claims the full viewport width, and
   * the sidebar is reachable only by opening the drawer. Render your own
   * trigger (a hamburger in the `topBar`) and drive it with `sidebarOpen` +
   * `onSidebarOpenChange` — AppLayout deliberately renders no trigger of its
   * own, since where it belongs in the bar is the consumer's call, which means
   * both props are effectively required together (see `sidebarOpen`'s doc).
   * Use the exported `useBelowBreakpoint` hook to show that trigger only while
   * the overlay mode is active.
   *
   * `sidebarPinned` is ignored below the threshold: the drawer owns the
   * sidebar's box there, and a `sticky; height: 100dvh` wrapper inside it would
   * size the rail to the window instead of the drawer.
   *
   * Measures the viewport (`matchMedia`), not a container — the sidebar's
   * presence in the row is exactly what the threshold changes, so a container
   * query would be circular. Same scale and same basis as `<Rail collapseBelow>`.
   */
  sidebarOverlayBelow?: CollapseBreakpoint;
  /**
   * Open state of the overlay sidebar. Technically optional, but effectively
   * required together with `onSidebarOpenChange` whenever `sidebarOverlayBelow`
   * is set — AppLayout renders no trigger of its own (see `sidebarOverlayBelow`),
   * so with both omitted nothing can ever open the drawer; Esc/backdrop close it,
   * but there's no way in. Has no effect unless `sidebarOverlayBelow` is set and
   * the viewport is below it.
   */
  sidebarOpen?: boolean;
  /** Fires whenever the overlay sidebar opens or closes — Esc, backdrop click, swipe, or programmatic. Pair with `sidebarOpen` — see its doc. */
  onSidebarOpenChange?: (open: boolean) => void;
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
 * <AppLayout sidebar={<Rail>{nav}<Rail.Footer>{footer}</Rail.Footer></Rail>} sidebarPinned>
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
 * pages no longer render flush against the rail / top bar). At ≤640px
 * viewport width the default steps down to `var(--space-4)` — `--space-6` on
 * both sides costs a 380px phone 48px of its width. Need a full-bleed main
 * region? Override the token in your scope —
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
 * @remarks Landmarks
 * The content region renders a plain `div`, not a `<main>` — `AppLayout`
 * deliberately does not claim the `main` landmark, because it can legitimately
 * be nested (e.g. the `/components/app-layout` demo mounts several instances
 * inside the app's own shell; nested `<main>`s are invalid HTML and an axe
 * violation). The consuming app wraps its routed content in its own `<main>`
 * once, at its top-level shell — see the playground's `AppShell` for the
 * worked example.
 *
 * @remarks When NOT to use
 * - ❌ For in-page content layout — use `<Stack>` / `<Cluster>` / `<Grid>`.
 * - ❌ For a chromeless full-bleed page (sign-in / 404 / error) — use `<Screen>`.
 * - ❌ Don't nest AppLayout inside another AppLayout, `<Page>`, or `<Screen>`.
 *   It's the top-level shell, mounted once at the app root.
 *
 * @remarks Scrolling
 * This is a **page-scroll** shell: `min-height: 100vh` lets it grow with tall
 * content, so the whole window scrolls. The `topBar` is always pinned
 * (`position: sticky`) and never scrolls away, regardless of `sidebarPinned`.
 * The `sidebar` scrolls away with the page unless `sidebarPinned` is set, in
 * which case it pins too. Only the main content region ever scrolls with the
 * page. For the common "fixed chrome + independently-scrolling content"
 * layout, override the root to a fixed `height: 100vh` (or `100dvh`) via
 * `className` — then `<Rail>` / the main region manage their own overflow.
 *
 * A `<Sticky>` placed inside the main region must clear the pinned `topBar`:
 * `<Sticky>`'s `top` steps top out at `--sticky-top-xl` (24px), shorter than
 * the top bar, so by default it pins BEHIND the bar. Raise the relevant
 * `--sticky-top-*` token above `--topbar-height` in your scope to clear it.
 *
 * @remarks Responsive sidebar
 * `sidebarOverlayBelow` moves the sidebar into a left `<Drawer>` below a
 * viewport threshold, freeing the content column to claim the full width. It
 * measures the **viewport** (`matchMedia`), matching `<Rail collapseBelow>` and
 * unlike `<Grid collapseBelow>`'s container query — the sidebar's presence in
 * the row is what the threshold changes, so a container query would be
 * circular. AppLayout renders **no trigger**: put a hamburger in your `topBar`
 * and gate it on the exported `useBelowBreakpoint` hook, so it appears only
 * while the overlay is active. `sidebarPinned` is ignored below the threshold.
 *
 * The `sidebar` slot renders as a direct child of the overlay `<Drawer>`, NOT
 * wrapped in `<Drawer.Body>` — so it does not inherit the body's
 * `overflow-y: auto`. `Drawer`'s `.content` sets no vertical overflow of its
 * own (`contain: layout paint` only), so a sidebar taller than the drawer
 * clips with no way to reach the rest. `<Rail>` is safe — its own body scrolls
 * internally regardless of the parent. A custom non-`Rail` sidebar passed here
 * needs its own scroll container, especially on short viewports like phone
 * landscape (~380px tall).
 *
 * @remarks Anti-patterns
 * - ❌ Setting `sidebarOverlayBelow` without rendering a trigger. The sidebar
 *   becomes unreachable below the threshold — there is no built-in way to open it.
 * - ❌ Duplicating the threshold as a raw media query in consumer CSS to hide
 *   the trigger. Use `useBelowBreakpoint(bp)` with the same token so the two
 *   can't drift.
 * - ❌ Reaching for `<Rail collapseBelow>` and `sidebarOverlayBelow` together
 *   at the same breakpoint. The rail would render icon-only inside a drawer
 *   that already has room for labels. Pick one behavior per width.
 */
export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout(
  {
    topBar,
    sidebar,
    sidebarPinned,
    sidebarOverlayBelow,
    sidebarOpen,
    onSidebarOpenChange,
    children,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const overlay = useBelowBreakpoint(sidebarOverlayBelow) && sidebar != null;
  // Whether the Drawer should exist AT ALL, independent of the live viewport
  // threshold. Kept mounted across the crossing (see below) rather than
  // gated on `overlay` — that's what lets a still-mounted DrawerRoot receive
  // a real open:true→false PROP transition on the up-crossing instead of
  // being yanked from the tree mid-open.
  const overlayConfigured = sidebarOverlayBelow != null && sidebar != null;

  // Uncontrolled fallback so Esc / backdrop still close the drawer when the
  // consumer passes `sidebarOverlayBelow` without wiring open state.
  const [open, setOpen] = useControllableState<boolean>({
    value: sidebarOpen,
    defaultValue: false,
    onChange: onSidebarOpenChange,
  });

  // Crossing back above the threshold must CLOSE the drawer via a real prop
  // transition, not unmount it out from under an open dialog — DrawerRoot's
  // own focus-restore effect only fires on open:true→false while mounted, so
  // Drawer stays mounted (above) and gets `open={overlay && open}`, which
  // flips synchronously in the same render as the crossing. That alone still
  // leaves `open` state remembering `true`, so re-entering overlay mode later
  // would reopen it unprompted — this effect resets the state on the
  // overlay:true→false EDGE only (a ref, not `!overlay`), so it never fights
  // a controlled consumer legitimately setting `sidebarOpen` while already
  // above the threshold.
  const wasOverlay = useRef(overlay);
  useEffect(() => {
    // `&& open` — otherwise every up-crossing fires onSidebarOpenChange(false)
    // even when the drawer was never opened (setOpen is a no-op value-wise,
    // but the callback still fires on a resize the consumer didn't ask about).
    if (wasOverlay.current && !overlay && open) setOpen(false);
    wasOverlay.current = overlay;
  }, [overlay, open, setOpen]);

  // Pattern A — props last: AppLayout is a consumer-overridable layout
  // primitive (like Stack/Card), so {...props} wins over our defaults.
  // Topology: a row of [full-height sidebar | a column of (topBar, main)] — so
  // the sidebar spans the whole height and the top bar sits only over the
  // content column, matching the CRM shell (see playground AppShell).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {sidebar != null && !overlay && (
        <div className={clsx(styles.sidebar, sidebarPinned && styles.sidebarPinned)}>{sidebar}</div>
      )}
      <div className={styles.body}>
        {topBar != null && <div className={styles.topBar}>{topBar}</div>}
        <div className={styles.main}>{children}</div>
      </div>
      {overlayConfigured && (
        <Drawer
          open={overlay && open}
          onOpenChange={setOpen}
          side="left"
          size="sm"
          className={styles.overlaySidebar}
          aria-label={t('appLayout.sidebar')}
        >
          {sidebar}
        </Drawer>
      )}
    </div>
  );
});
