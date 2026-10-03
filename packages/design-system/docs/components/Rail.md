# `<Rail>` — collapsible left-side navigation

Vertical nav anchored to one side of a page. Switches between a wide labelled mode (240px) and a narrow icon-only mode (56px) via a CSS width transition. Sections of items, parent groups with subitems, and a hover-popover that surfaces a collapsed group's subitems without expanding the rail.

```tsx
import { Rail } from '@eocrm/design-system';
import { NavLink } from 'react-router-dom';
import { Home, Users, Settings } from 'lucide-react';

<Rail defaultCollapsed={false} aria-label="Main navigation">
  <Rail.Header>
    <BrandLogo />
  </Rail.Header>

  <Rail.Section title="Main">
    <Rail.Item icon={<Home />} as={NavLink} to="/" end>
      Dashboard
    </Rail.Item>
    <Rail.Item icon={<Users />} as={NavLink} to="/contacts" badge="12">
      Contacts
    </Rail.Item>
  </Rail.Section>

  <Rail.Section title="Operations">
    <Rail.Group icon={<Settings />} label="Settings">
      <Rail.Item as={NavLink} to="/settings/general">
        General
      </Rail.Item>
      <Rail.Item as={NavLink} to="/settings/security">
        Security
      </Rail.Item>
    </Rail.Group>
  </Rail.Section>

  <Rail.Footer>
    <Rail.CollapseToggle />
  </Rail.Footer>
</Rail>;
```

- **Compound API** — `Rail.Header` / `Rail.Section` / `Rail.Item` / `Rail.Group` / `Rail.Spacer` / `Rail.Footer` / `Rail.CollapseToggle`.
- **`Rail.Header` brand area (default)** — a brand block with a header→nav divider out of the box: `--rail-header-padding` (default `0 var(--rail-item-padding-x, var(--space-3)) var(--space-2)`) + `--rail-header-divider-width` (default `var(--border-width)`, color `--rail-border-color`). Matches the canonical rail brand with **no prop and no raw CSS**. For a bare header, override either token to `0`. The horizontal inset mirrors the nav items' so the brand mark starts on the same x as their icons; there is no top inset because `--rail-padding-y` already supplies one. When the rail is **collapsed** the header centers its content in the 56px track — render a mark-only brand there (read the state with `useRail()`). A brand too wide for the track is clipped; the centering is `safe`, so it aligns to the start edge in that case and you lose the trailing end rather than both sides. Two collapsed-only behaviors to know: the header's **inline padding is zeroed** — not just the default but whatever you set `--rail-header-padding` to (your horizontal value still applies expanded; there is no collapsed-only token), and it **becomes a flex row**, so a header with more than one child stacks expanded and lays out side by side collapsed — branch on `useRail().collapsed` if that matters. _Migration:_ (a) if you previously shimmed your own brand padding/divider on the header, remove it or it doubles; (b) `--rail-header-padding` used to default to `var(--space-4)` — if you were relying on that value rather than setting it yourself, set it explicitly, otherwise the brand moves up 16px and left 4px and the divider rises with it; (c) the header's content box is 8px **wider** than under the old default — 199px inside a 240px rail, up from 191px — because the inline inset drops from 16px to 12px a side, so a wide brand lockup or a full-bleed header child gains a little room rather than losing it. Note the horizontal inset now tracks `--rail-item-padding-x`, so retuning item density moves the brand with it.
- **Layout-owning primitive (Hard rule 4 exception)** — like `<Modal>`, `<Drawer>`, `<Page>`, the rail owns its own width and height because that IS its job. Place the rail inside whatever container shape your page needs (sticky aside, fixed sidebar, in-flow column).
- **Collapse state**: controlled (`collapsed` + `onCollapsedChange`) or uncontrolled (`defaultCollapsed`). The `<Rail.CollapseToggle>` button reads context and flips the state without prop drilling.
- **`collapseBelow`** (`'sm'` 480px / `'md'` 640px / `'lg'` 768px, unset by default) — forces the icon-only mode while the **viewport** is at or below that width. Below the threshold the rail is collapsed regardless of `collapsed` / `defaultCollapsed`; above it, the consumer's value governs again. It is a presentation override, not a user choice: **`onCollapsedChange` does not fire** on a breakpoint cross and no consumer state is written, so a persisted preference survives a narrow window untouched. `<Rail.CollapseToggle>` renders nothing while the override is active (it could not change anything). `useRail()` reports the EFFECTIVE `collapsed` plus `collapsedByViewport` for custom chrome that needs to tell the two apart. Same token scale as `<Grid collapseBelow>` / `<Split collapseBelow>` but a **different measurement basis** — those use container queries; the rail must use the viewport, because collapsing is what changes the rail's own width (a container query would be circular) and because collapsed drives React behavior (tooltips, group flyouts) CSS can't reach.
- ⚠️ **Make your shell's rail track follow the override.** It shrinks the rail but is invisible to the layout around it, so a shell sizing its rail column from its OWN `collapsed` state keeps a 240px track around a 56px rail — a dead gap on every screen. Key the track off the viewport (`@media (max-width: 768px) { .shell { grid-template-columns: 56px 1fr } }`) or off the rail itself (`.shell:has(nav[data-collapsed]) { grid-template-columns: 56px 1fr }`, no breakpoint duplication). Both work only because this basis is the viewport, not a container.
- **`Rail.Item` is polymorphic** — `as={NavLink}` (or any router primitive) sets `aria-current="page"` on the rendered anchor; Rail's CSS applies the active accent via `[aria-current="page"]` and `:has([aria-current="page"])` selectors. No router dependency in the library.
- **`Rail.Group`** — renders inline-expanding subitems when the rail is expanded, and a hover-popover (`right-start` placement, 80ms open delay, 200ms close grace) when collapsed — portaled to `document.body` at `--z-popover` and auto-elevating above Modal/Drawer like other floating surfaces. Auto-opens on mount when the group's own link or any subitem is the active route (one-shot, uncontrolled-only — a manual close sticks).
- **`Rail.Group` can be a link AND a toggle** — pass `as` (same polymorphic contract as `Rail.Item`) and the row splits into two hit-targets: icon + label navigate and carry `aria-current="page"` (so the row highlights like any item), while a separate chevron `<button>` owns `aria-expanded` + `aria-controls` with an `Expand <label>` / `Collapse <label>` accessible name. Keyboard order is link, then chevron. **Omitting `as` is byte-for-byte today's toggle-only shape** (one `<button>` spanning the row) — the feature is purely additive. Note the spread target moves with `as`: without it the remaining props land on the wrapping `<div>` (unchanged); with it they land on the rendered link, since that is what `to` / `end` / `replace` are for — **except `className` and `ref`, which stay on the wrapper `<div>` in both shapes**. Your `onPointerEnter` / `onPointerLeave` / `onFocus` / `onBlur` / `onClick` are _composed_ with the group's own handlers (yours runs first) rather than replacing them: those five open the collapsed-mode flyout, and overriding them would leave the subitems unreachable while the rail is collapsed. Pass **`end`** if you don't want the group counted as current on child routes — `to="/deals"` without it also matches `/deals/01K7…`, so opening one record auto-opens the saved-view list. **Collapsed, a linkable group has no chevron** — the single 56px target navigates on click and opens the flyout on hover/focus, and the flyout's header is a link to the same destination so the parent page stays reachable from inside the panel.

  ```tsx
  <Rail.Group as={NavLink} to="/deals" icon={<Handshake />} label="Deals">
    <Rail.Item as={NavLink} to="/deals?view=open">
      My open USD
    </Rail.Item>
  </Rail.Group>
  ```

- **`Rail.Spacer`** — `flex-grow: 1` filler that pushes trailing _sections_ (Settings, Help) to the bottom of the scrolling body. Not needed to pin the footer.
- **Scrolling** — everything before the first `Rail.Footer` renders in one scroll box; the Footer is extracted out of it and stays pinned on its own, no Spacer required. The box scrolls vertically only — the X axis is clipped, since the rail is fixed-width and labels are meant to clip as it collapses. **Collapsed, the scrollbar is hidden entirely** (`scrollbar-width: none`): a gutter is a quarter of the 56px rail's inner width and shifts every item pill off-center. Wheel/trackpad and scroll-into-view on Tab still scroll it; the bar returns when the rail expands.
- **i18n**: `rail.expand` / `rail.collapse` (toggle aria-label), `rail.navigation` (default `<nav>` aria-label), `rail.expandGroup` / `rail.collapseGroup` (prefix for a linkable group's chevron, interpolated with the group label).

#### When NOT to use

- ❌ Top-bar / horizontal nav — use a `<Cluster>` + `<Link>` row.
- ❌ A value picker (status, country) — use `<Select>`.
- ❌ A focus-locked dialog navigation — use `<Modal>` / `<Drawer>`.

#### Anti-patterns

- ❌ Forking width via inline style — rebind the `--rail-width-*` tokens in a parent stylesheet.
- ❌ Hand-rolling active-state styling. Set `aria-current="page"` on the rendered element (NavLink does this for you) and the CSS handles it.
- ❌ Multi-level group nesting (groups inside groups). v1 supports one level only.
- ❌ Adding a synthetic "All deals" first subitem so the parent list stays reachable — that's what `Rail.Group`'s `as` prop is for. Make the group itself the link.
- ❌ Putting an icon-less top-level item directly inside a section — when the rail collapses there's nothing visible. Items without icons belong inside a `<Rail.Group>`.
