# `<AppLayout>` — viewport-filling app shell

```tsx
<AppLayout topBar={<TopBar />} sidebar={<Rail>{nav}</Rail>}>
  <Page>{content}</Page>
</AppLayout>

// No sidebar — top bar + content only
<AppLayout topBar={<TopBar />}>
  <Page>{content}</Page>
</AppLayout>

// Tall pages: pin the sidebar so a Rail's footer/CollapseToggle stays at the viewport bottom
<AppLayout sidebar={<Rail>{nav}<Rail.Footer>{footer}</Rail.Footer></Rail>} sidebarPinned>
  <Page>{content}</Page>
</AppLayout>

// System banner above everything + a module-scoped one under the top bar
<AppLayout
  banner={<Banner tone="info" title="Maintenance Saturday 22:00.">CRM will be read-only.</Banner>}
  contextBanner={suspended && <Banner tone="danger" title="Email sending suspended." />}
  topBar={<TopBar />}
  sidebar={<Rail>{nav}</Rail>}
>
  <Page>{content}</Page>
</AppLayout>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `banner` | `ReactNode` | no | — | System-wide banner slot — full WINDOW width, above the sidebar + content row. For messages that apply wherever the user is: maintenance, billing overdue, impersonation. Pass a `<Banner>` (or several, most severe first). Not sticky: it scrolls away with the page while the `topBar` stays pinned. Omit (or pass `null` / `false`) for no wrapper. With `sidebarPinned`, the pinned sidebar starts below this banner, so at scroll position 0 its bottom (a `Rail.Footer`) sits up to one banner height below the fold until the page scrolls past the banner. This is accepted — banners are temporary. |
| `contextBanner` | `ReactNode` | no | — | Context banner slot — inside the content column, between the `topBar` and the padded content region, full-bleed within the column. For messages scoped to a module or route ("Email sending suspended" on the Email pages); the app decides which routes render it. Pass a `<Banner>`. Not sticky. Page-level messages belong in the content as `<Alert>` instead. |
| `topBar` | `ReactNode` | no | — | Top bar slot — sits above the main content, spanning the content column to the right of the sidebar (not the full window width). Omit for no top bar. |
| `sidebar` | `ReactNode` | no | — | Sidebar slot — runs the full height down the left, alongside both the top bar and the content. Sets its own width (intrinsic). Omit for no sidebar. |
| `sidebarPinned` | `boolean` | no | — | Pin the sidebar to the viewport: `position: sticky; top: 0; height: 100dvh` with internal overflow scrolling. On pages taller than the viewport the sidebar (and a `Rail` inside it — including its `Rail.Footer` / CollapseToggle) spans exactly the SCREEN, keeping the footer glued to the viewport bottom instead of the page bottom. Default `false` (sidebar stretches to the full row/page height — the original behavior). Prefer this over wrapping the sidebar slot in `Sticky` — the rail pins its footer by filling its own `height: 100%` box, which needs a DEFINITE height to resolve against. `Sticky` sets `align-self: start`, which drops the row stretch that made it definite, so the footer stops pinning. `100dvh` is always relative to the real browser viewport, never to a nested scroll container — so this only pins correctly when AppLayout is the actual outermost, page-scroll shell (its documented top-level use). Nest it inside another scrollable region and the sidebar will size to the whole window, not that region, and overflow it. |
| `sidebarOverlayBelow` | `CollapseBreakpoint` | no | — | Move the sidebar out of the flow and into a left-anchored `<Drawer>` while the **viewport** is at or below a width threshold: `'sm'` 480px / `'md'` 640px / `'lg'` 768px. Omit for no responsive behavior (the default) — the sidebar always renders in the flow. Below the threshold the content column claims the full viewport width, and the sidebar is reachable only by opening the drawer. Render your own trigger (a hamburger in the `topBar`) and drive it with `sidebarOpen` + `onSidebarOpenChange` — AppLayout deliberately renders no trigger of its own, since where it belongs in the bar is the consumer's call, which means both props are effectively required together (see `sidebarOpen`'s doc). Use the exported `useBelowBreakpoint` hook to show that trigger only while the overlay mode is active. `sidebarPinned` is ignored below the threshold: the drawer owns the sidebar's box there, and a `sticky; height: 100dvh` wrapper inside it would size the rail to the window instead of the drawer. Measures the viewport (`matchMedia`), not a container — the sidebar's presence in the row is exactly what the threshold changes, so a container query would be circular. Same scale and same basis as `<Rail collapseBelow>`. |
| `sidebarOpen` | `boolean` | no | — | Open state of the overlay sidebar. Technically optional, but effectively required together with `onSidebarOpenChange` whenever `sidebarOverlayBelow` is set — AppLayout renders no trigger of its own (see `sidebarOverlayBelow`), so with both omitted nothing can ever open the drawer; Esc/backdrop close it, but there's no way in. Has no effect unless `sidebarOverlayBelow` is set and the viewport is below it. |
| `onSidebarOpenChange` | `((open: boolean) => void)` | no | — | Fires whenever the overlay sidebar opens or closes — close button, Esc, backdrop click, swipe, or programmatic. Pair with `sidebarOpen` — see its doc. |
| `children` | `ReactNode` | yes | — | Main content slot — fills the remaining space below the top bar. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Top-level shell layout, mounted **once** at the app root. Matches the CRM shell topology: a **full-height `sidebar`** down the left, an optional `topBar` **over the content column** (not full window width), and the main `children` below it. Root is `min-height: 100vh`.
- `topBar`: optional region over the content column (omit for none). `sidebar`: optional full-height left region, intrinsic width (omit for none). `children`: the main content (required).
- Layout-owning primitive (the `<Page>` / `<Screen>` / `<Rail>` exception to "no layout properties"). Its only own-styling is the main region's gutter + subtle canvas (both token-driven, below); the slots bring their own surfaces. Don't nest inside `<Page>` / `<Screen>`, and don't nest inside another `AppLayout` **in product code** — the only sanctioned AppLayout-in-AppLayout nesting is a demo/documentation preview (see the landmark note below); for a chromeless page use `<Screen>`, for in-page layout use `<Stack>` / `<Cluster>`.
- **Content padding (default):** the main region ships the canonical shell gutter (`--app-layout-content-padding`, default `var(--space-6)`, stepping down to `var(--space-4)` at ≤640px viewport width) — routed content is padded with **no prop and no raw CSS**. For a full-bleed main region, override the token (`--app-layout-content-padding: 0`) in your scope; there is no prop. Scope the override to a class or `body`, not another `:root` rule — the narrow-viewport step-down is itself a `:root` rule at the same specificity, so two `:root` rules fight on load order below 640px. _Migration:_ if you previously shimmed this gutter with your own `padding: var(--space-6)` wrapper, remove that shim now or the padding doubles.
- **Content canvas (default):** the main region paints a subtle canvas (`--app-layout-content-background`, default `var(--color-bg-subtle)`) so white `<Card>`s lift off it — matches every mockup, **no prop, no raw CSS**. For a flat content area, override the token (`--app-layout-content-background: transparent`); there is no prop. _Migration:_ if you shimmed your own `background: var(--color-bg-subtle)` on the content region, remove it.
- **Page-scroll shell:** `min-height: 100vh` means tall content scrolls the whole window, but the chrome doesn't scroll away with it — `topBar` is always pinned (`position: sticky`), and `sidebar` pins too when `sidebarPinned` is set. Only the main content region scrolls. For fixed chrome + independently-scrolling content, override the root to a fixed `height: 100vh` / `100dvh` via `className`.
- **`sidebarPinned`** (default `false`): on pages taller than the viewport, pins the sidebar wrapper (`position: sticky; top: 0; height: 100dvh; overflow-y: auto`) so a `Rail`'s footer/`CollapseToggle` stays glued to the viewport bottom instead of scrolling away with the page. Don't reach for wrapping the sidebar slot in `<Sticky>` instead — the Rail pins its footer by filling its own `height: 100%` box, and `Sticky`'s `align-self: start` drops the row stretch that made that height definite, so the footer-pinning doesn't work. `100dvh` is always relative to the real browser viewport, not a nested scroll container — only use it when AppLayout is the outermost, page-scroll shell (its documented top-level use); nested inside another scrollable region, the sidebar sizes to the whole window and overflows it.
- **`sidebarOverlayBelow`** (default: none): below a **viewport** threshold (`'sm'` 480 / `'md'` 640 / `'lg'` 768) the sidebar leaves the flow and renders in a left `<Drawer>`, so the content column gets the full viewport width — the fix for a 240px rail eating a phone screen. **AppLayout renders no trigger** — put a hamburger in your `topBar` and gate it with the `useBelowBreakpoint` hook (see below) so it only shows while the overlay is active. Because there's no built-in trigger, `sidebarOpen` + `onSidebarOpenChange` are technically optional props but **effectively required together**: with both omitted nothing can ever open the drawer. Once open, the drawer has a visible close button and a header that can be swiped left to dismiss, in addition to Esc/backdrop dismissal. `sidebarPinned` is ignored below the threshold (the drawer owns the sidebar's box there).
- The `children` slot renders inside a plain `<div>`, not a `<main>` — `AppLayout` can be nested in a demo or documentation preview (never in product code, see above), so it must not unilaterally claim the page's `main` landmark. The consuming app owns that: wrap your top-level routed content in your own `<main>` once, at your app shell (not per-page), the way the playground's `AppShell` does.
- `banner` / `contextBanner`: slots for `<Banner>`. `banner` spans the full window above the sidebar; `contextBanner` sits under the top bar, outside the content padding. Neither is sticky. With `sidebarPinned`, the footer of a pinned rail sits up to one banner height below the fold until the page scrolls past the banner.

- A `<Sticky>` inside the main region must clear the pinned `topBar`: use `<Sticky top="topbar">`, which resolves to the standard top-bar height plus the normal content gap. Override `--sticky-top-topbar` when your chrome uses a custom height or clearance.
- `sidebarOverlayBelow` measures the **viewport** (`matchMedia`), like `<Rail collapseBelow>` and unlike `<Grid collapseBelow>`'s container query: the sidebar's presence in the row is what the threshold changes, so a container query would be circular. The `sidebar` node moves between the in-flow slot and the `Drawer`, remounting it, so a `Rail`'s internal state (expanded `Rail.Group`s, scroll position) resets each time, by design. A `<Rail>` in the drawer scrolls its own body while its footer stays visible. A custom non-`Rail` sidebar needs its own height-filling scroll container, especially on short viewports (phone landscape, ~380px).

#### When NOT to use

- ❌ In-page content layout: use `<Stack>` / `<Cluster>` / `<Grid>`.
- ❌ A chromeless full-bleed page (sign-in / 404 / error): use `<Screen>`.

#### Anti-patterns

- ❌ Setting `sidebarOverlayBelow` without rendering a trigger: the sidebar becomes unreachable below the threshold.
- ❌ Duplicating the threshold as a raw media query in consumer CSS to hide the trigger. Use `useBelowBreakpoint(bp)` with the same token so the two can't drift.
- ❌ `<Rail collapseBelow>` and `sidebarOverlayBelow` at the same breakpoint: the rail would render icon-only inside a drawer that already has room for labels. Pick one behavior per width.
