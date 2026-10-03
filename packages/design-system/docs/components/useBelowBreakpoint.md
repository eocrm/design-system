# `useBelowBreakpoint` — viewport breakpoint hook

```tsx
import { useBelowBreakpoint } from '@eocrm/design-system';

const isOverlay = useBelowBreakpoint('lg'); // true at ≤768px viewport width
```

- Lives in `src/hooks/`, imported straight from the package root. `useBelowBreakpoint(breakpoint?: 'sm' | 'md' | 'lg'): boolean` — subscribes to `(max-width: …px)` on the **viewport** (`matchMedia`: `sm` 480 / `md` 640 / `lg` 768) and returns whether it currently matches. `breakpoint` is optional — omit it (or pass `undefined`) and the hook always returns `false`.
- Returns `false` on the server, and stays `false` until hydration corrects it — only relevant if you server-render this. In a client-only render (no SSR — the CRM's case) the value is correct from the first render.
- Viewport, not container — use it only where a container query would be circular, i.e. where the thing being measured is what the collapse changes: `<Rail>`'s own width (internal use) and `<AppLayout>`'s overlay-sidebar trigger (`sidebarOverlayBelow` — gate your `topBar` hamburger on this so it shows only while the overlay is active). For content that re-templates inside a box of stable width, use a `collapseBelow` prop (`<Grid>` / `<Split>` / `<Sortable>` / `<DashboardCanvas>` / `<DataTable>`) instead — those use container queries in CSS and need no hook.
