# Mobile shell — `AppLayout` overlay sidebar

Date: 2026-07-28
Status: approved, ready for planning

## Problem

Every playground mockup route is unusable on a phone. Measured with the dev server at a
380px viewport, all 11 shell routes render at a document width of **720px** — identical
across pages, which is the tell that the breakage is structural rather than per-page.

Bisected by injecting overrides at runtime:

| State                                        | Document scroll width @ 380px viewport |
| -------------------------------------------- | -------------------------------------- |
| As shipped                                   | 720px                                  |
| `+ min-width: 0` on the shell content column | 548px                                  |
| `+ sidebar removed from the flow`            | **380px — no overflow**                |

So the content itself is not intrinsically too wide. Two structural causes:

1. **`packages/playground/src/layout/AppShell/AppShell.module.scss:16`** —
   `grid-template-columns: var(--sidebar-width) 1fr`. The rail holds 240px
   unconditionally, and the `1fr` track lacks `min-width: 0`, so wide content pushes
   the whole document instead of scrolling inside its own column.
2. **Fixed-column grids at mockup call-sites** — `Grid columns={3}` / `columns={2}`.
   These do not overflow (they shrink), but three cards in ~330px is unreadable.

A third, independent bug: `Login.tsx:94` uses `Constrain width="md"`, which sets a fixed
`width`. Login renders outside the shell entirely and still overflows to 472px.

## What already exists

This is mostly a wiring problem, not a build problem.

- `AppLayout.module.scss:47` already carries `min-width: 0` on its body column. The
  library shell is already correct on the exact point the playground's hand-rolled copy
  gets wrong.
- `Grid` already supports `collapseBelow`, including a graduated
  breakpoint→columns map, via container queries.
- `Drawer` already ships focus trap, Esc-to-close, backdrop click, scroll lock,
  drag-to-close, and the slide animation.
- `Rail.tsx:64` already contains a `useBelowBreakpoint(bp)` hook built on `matchMedia`
  and `useSyncExternalStore`. It is private to that file.
- `Table`, `Tabs`, `Kanban`, and `DataTable` each already own an `overflow-x: auto`
  scroll context.
- `Modal` and `PageHeader` already have 640px breakpoints.
- `TopBar.Start` accepts arbitrary children, and `TopBar.IconButton` exists.

Nothing here needs a new overlay implementation, a new responsive primitive, or a new
breakpoint scale.

## Constraint that shapes the solution

Playground Hard rule 6 forbids `*.module.scss`, raw HTML, and inline `style` inside
`packages/playground/src/pages/mockups/**`. Mockups can therefore only be fixed by
passing props to library components. That constraint is working as intended here: it
correctly identifies this as a library gap rather than a mockup gap.

`packages/playground/src/layout/AppShell/**` is playground tooling, not a mockup, so it
may carry its own SCSS.

## Breakpoint

**`lg` (768px)** for the overlay threshold.

- The rail carries 14+ nav items. `Rail`'s existing 56px icon-only mode is poor
  wayfinding at that count, so there is no useful intermediate state worth preserving
  for tablet-portrait widths. One threshold, one behavior.
- `Modal` and `PageHeader` already reflow at 640px. Putting the shell transition at
  768px keeps it clear of the component-level ones instead of stacking three reflows at
  a single width.

## Design

### Part 1 — Library: `AppLayout` overlay-sidebar mode

Three new props on `AppLayout`:

```ts
/** Below this VIEWPORT width the sidebar leaves the flow and renders in a Drawer. */
sidebarOverlayBelow?: CollapseBreakpoint;   // 'sm' 480 | 'md' 640 | 'lg' 768
/** Controlled open state of the overlay sidebar. Ignored above the threshold. */
sidebarOpen?: boolean;
onSidebarOpenChange?: (open: boolean) => void;
```

Behavior: above the threshold, unchanged — the sidebar renders in the flex row exactly
as today. Below it, the `sidebar` slot renders inside `<Drawer side="left">` driven by
`sidebarOpen`, and the flex row collapses to the body column alone, which claims the
full viewport width.

This is a render branch over the existing `Drawer`, not a new overlay. Focus management,
Esc, backdrop, scroll lock, and animation all come from `Drawer` unchanged.

Measurement basis is the **viewport** (`matchMedia`), matching `Rail`'s `collapseBelow`
rather than `Grid`'s container query — for the same reason documented in
`_internal/collapse.ts`: the sidebar's presence is what the collapse changes, so a
container query would be circular. Same `CollapseBreakpoint` scale, no new constants.

The consumer owns the hamburger. `AppLayout` does not render one — it has no opinion
about where in the top bar it belongs, and `TopBar` already composes freely.

### Part 2 — Library: extract and export `useBelowBreakpoint`

Move `useBelowBreakpoint` out of `Rail.tsx` into `_internal/collapse`, and export it
from the package root. `Rail` and `AppLayout` both import the extracted version — one
implementation, no duplicate `matchMedia` subscription logic.

This is what lets a DS-only consumer (the CRM, and the playground's `AppShell`)
conditionally render a hamburger without hand-writing a media query that duplicates the
breakpoint scale.

The existing implementation already handles the cases that matter: SSR (`false` server
snapshot, corrected on hydration) and Safari <13.1's missing
`MediaQueryList.addEventListener`. Extract as-is; do not rewrite.

### Part 3 — Library: narrow-viewport content gutter

`--app-layout-content-padding` defaults to `--space-6` (24px), costing a 380px phone
48px of its width to gutters. Drop it to `--space-4` below the threshold in
`AppLayout.tokens.scss`. Consumers overriding the token in their own scope still win.

### Part 4 — Playground: `AppShell` consumes `AppLayout`

Replace the hand-rolled CSS grid:

```tsx
<AppLayout
  topBar={<TopBar>…</TopBar>}
  sidebar={<Rail …>…</Rail>}
  sidebarPinned
  sidebarOverlayBelow="lg"
  sidebarOpen={navOpen}
  onSidebarOpenChange={setNavOpen}
>
  {children}
</AppLayout>
```

Plus:

- A hamburger `TopBar.IconButton` in `TopBar.Start`, rendered only when
  `useBelowBreakpoint('lg')` is true.
- A `useEffect` on `pathname` that closes the drawer after navigation.

`sidebarPinned` reproduces the current `.sidebarWrap` behavior (`sticky; top: 0;
height: 100dvh`). The `transition` on `grid-template-columns` is dropped and not
replaced — `AppLayout`'s sidebar is `flex: none` at intrinsic width, so it already
tracks the `Rail`'s own width animation instead of duplicating it.

Deletions from `AppShell.module.scss`: `.shell`, `.sidebarWrap`, `.topbarWrap`,
`.content`, and the `:root` sidebar-width block — plus eight classes that are **already
dead** today (`.nav`, `.navSection`, `.navGroup`, `.navItem`, `.navItemActive`,
`.navFooter`, `.switchLink`, `.switchArrow`; verified zero `styles.*` references in any
`.tsx`, leftovers from before the shell moved to `Rail.*`). The file drops from ~200
lines to roughly 10 — only `.brand` survives.

### Part 5 — Mockups: prop changes only

| File                        | Change                                                                  |
| --------------------------- | ----------------------------------------------------------------------- |
| `Dashboard.tsx:81`          | add `collapseBelow={{ md: 2, sm: 1 }}`                                  |
| `Dashboard.tsx:102`         | add `collapseBelow="md"`                                                |
| `ContactDetail.tsx:94`      | add `collapseBelow="md"`                                                |
| `MemberProfile.tsx:266,297` | drop `columns={2}` — `FormRow`'s default is already responsive auto-fit |
| `Login.tsx:94`              | `Constrain width="md"` → `maxWidth="md"`                                |

No `*.module.scss`, no inline styles, no raw HTML, so no `TODO.md` entry is required.
`MockupsIndex.tsx` and `TenantDetail.tsx:89` already use `minColumnWidth` (auto-fit) and
need no change.

### Part 6 — Visual sweep

After Parts 1–5, walk all 15 mockup routes at 390px and fix what static analysis cannot
predict: `PageHeader` action clusters, `Kanban` column height, `DataTable` toolbar
wrapping, `Cluster` wrap behavior. This pass cannot be specified in advance — today
every page renders at 720px, so nothing reflows honestly enough to inspect.

Sweep runs against the dev server on port 8091 (not the default port).

## Explicit non-goals

- **No card-stack mode for wide tables.** `Tenants` has 10 columns and will scroll
  horizontally on a phone. That matches what `DataTable` already does and is honest
  about the data. A responsive stacked-card table is a real library feature and needs
  its own spec.
- **No bottom tab bar.** Considered and rejected: it is a new primitive, and the
  14-item nav does not reduce to 4–5 primary destinations cleanly.
- **No forced icon-only rail at mobile width.** 56px is 15% of a 380px screen, and
  icon-only wayfinding across 14 items is worse than a drawer.
- **No changes to component demo pages** (`src/pages/components/**`). Out of scope; the
  request was mockups.

## Risks

- **z-index.** The current shell sets `--z-sidebar: 100` / `--z-topbar: 200`;
  `AppLayout` sets no z-index and `TopBar` is `position: sticky` on its own. Stacking of
  the pinned rail against the sticky top bar must be verified once wired, and may need a
  `className` on `AppLayout` or a token. Cheap to fix, but it will not be caught by
  typecheck or unit tests.
- **`sidebarPinned` + `Drawer` interaction.** `sidebarPinned` applies
  `sticky/100dvh/overflow-y: auto` to the in-flow wrapper. In overlay mode that wrapper
  must not be applied to the drawer-hosted rail, or the rail will size to the window
  rather than the drawer.
- **Grid container-query context.** `collapseBelow` makes the grid a size container,
  which zeroes its intrinsic-width contribution. All five call-sites sit directly under
  `Page` (a block context), so this is safe — but it must not be pattern-copied into a
  `Cluster` or an `auto` `Split` track.

## Testing

- Unit: `AppLayout` renders the sidebar in-flow above the threshold and inside the
  drawer below it; `onSidebarOpenChange` fires on backdrop/Esc; `useBelowBreakpoint`
  keeps its existing `Rail` test coverage after extraction.
- Typecheck + stylelint + prettier via the pre-push hook.
- Manual: the 380px sweep in Part 6, plus a desktop regression pass confirming the shell
  is visually unchanged above 768px.

## Delivery

Library changes trigger the full ceremony: branch → PR → `Quality / check` → Hard rule 8
pre-push review loop (design-system) and Hard rule 7 (mockups) → merge → auto-release +
version bump.

The playground consumes the library through the workspace symlink, so Part 4 does **not**
wait on a published Part 1 — there is no technical gate between them. The split below is
a reviewability choice, and Parts 1–4 may be collapsed into one PR if the diff stays
readable:

1. Library — Parts 1, 2, 3 (+ `AppLayout` JSDoc `@remarks`, `AGENTS.md` TL;DR,
   `AppLayoutDemo` coverage of the new mode).
2. Playground shell — Part 4.
3. Mockups + sweep — Parts 5, 6.
