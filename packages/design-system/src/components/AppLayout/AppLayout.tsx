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
   * System-wide banner slot — full WINDOW width, above the sidebar + content
   * row. For messages that apply wherever the user is: maintenance, billing
   * overdue, impersonation. Pass a `<Banner>` (or several, most severe first).
   * Not sticky: it scrolls away with the page while the `topBar` stays pinned.
   * Omit (or pass `null` / `false`) for no wrapper.
   *
   * With `sidebarPinned`, the pinned sidebar starts below this banner, so at
   * scroll position 0 its bottom (a `Rail.Footer`) sits up to one banner height
   * below the fold until the page scrolls past the banner. This is accepted —
   * banners are temporary.
   */
  banner?: ReactNode;
  /**
   * Context banner slot — inside the content column, between the `topBar` and
   * the padded content region, full-bleed within the column. For messages
   * scoped to a module or route ("Email sending suspended" on the Email
   * pages); the app decides which routes render it. Pass a `<Banner>`. Not
   * sticky. Page-level messages belong in the content as `<Alert>` instead.
   */
  contextBanner?: ReactNode;
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
  /** Fires whenever the overlay sidebar opens or closes — close button, Esc, backdrop click, swipe, or programmatic. Pair with `sidebarOpen` — see its doc. */
  onSidebarOpenChange?: (open: boolean) => void;
  /** Main content slot — fills the remaining space below the top bar. */
  children: ReactNode;
}

/**
 * Viewport-filling application shell layout: full-height `sidebar`, optional `topBar` over the content column, main `children` below.
 * @see docs/components/AppLayout.md
 */
export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout(
  {
    banner,
    contextBanner,
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
  // Topology: banner above a row of [full-height sidebar | column of (topBar,
  // contextBanner, main)] — so
  // the sidebar spans the whole height and the top bar sits only over the
  // content column, matching the CRM shell (see playground AppShell).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {banner != null && banner !== false && <div className={styles.banner}>{banner}</div>}
      <div className={styles.row}>
        {sidebar != null && !overlay && (
          <div className={clsx(styles.sidebar, sidebarPinned && styles.sidebarPinned)}>
            {sidebar}
          </div>
        )}
        <div className={styles.body}>
          {topBar != null && <div className={styles.topBar}>{topBar}</div>}
          {contextBanner != null && contextBanner !== false && (
            <div className={styles.contextBanner}>{contextBanner}</div>
          )}
          <div className={styles.main}>{children}</div>
        </div>
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
          <Drawer.Header>{t('appLayout.sidebar')}</Drawer.Header>
          <div className={styles.overlaySidebarContent}>{sidebar}</div>
        </Drawer>
      )}
    </div>
  );
});
