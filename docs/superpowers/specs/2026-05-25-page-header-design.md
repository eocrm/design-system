# PageHeader Design Spec

**Status:** approved (brainstorm session 2026-05-25)
**Branch:** `feat/page-header`
**Author:** Claude Opus 4.7 + dpws

---

## Goal

Ship `<PageHeader>` for `@eocrm/design-system` — a compound layout primitive for the top-of-page heading area in CRM pages. Bundles the title, subtitle, breadcrumb, back-navigation, leading element (Avatar / icon), meta row (badges / timestamps), and right-aligned action cluster into a single grid-based container with consistent spacing and an optional bottom border.

## Why now

- Two existing mockups (`ContactDetail`, `Members`) hand-roll page headers with bespoke SCSS that has already drifted between them (different spacing, different alignment, different breakpoints).
- Future pages need this primitive — every detail screen, every settings page, every "list with filters" page repeats the same shape.
- The library has all the underlying primitives (`<Title>`, `<Breadcrumb>`, `<Avatar>`, `<Cluster>`, `<Badge>`) but no opinionated composition of them.

## Non-goals (deferred to v2 / follow-up)

- **Sticky positioning.** The AppShell topbar is already sticky; layering a sticky `<PageHeader>` requires z-index coordination the consumer should own in their layout CSS. v1 is a regular block element.
- **Mockup refactor.** ContactDetail / Members hand-rolled headers won't be migrated to `<PageHeader>` in this PR — that's a separate follow-up to keep the diff focused. Same pattern as Slider / FileUpload / ImageCrop / ColorPicker PRs.
- **Tabs as an inside slot.** Tabs live as a sibling OUTSIDE PageHeader; consumer disables PageHeader's `borderBottom` to avoid the double line.
- **Built-in "page actions overflow" menu.** If Actions overflow on narrow viewports, consumer composes their own `<DropdownMenu>` inside `<PageHeader.Actions>`.
- **`role="banner"` landmark.** PageHeader renders a `<div>`, not a `<header>` — the AppShell already has `<header role="banner">` for the app-level topbar, and only one banner landmark per page is the WCAG recommendation.

## Architecture

### File layout

```
packages/design-system/src/components/PageHeader/
  PageHeader.tsx          ← root + 7 sub-components + Object.assign compound
  PageHeader.module.scss  ← grid layout + slot styling
  PageHeader.test.tsx     ← ~18 cases
  index.ts                ← barrel
```

Single TSX file because each sub-component is thin (most are ~10-line marker-renderers or pass-throughs to existing primitives). Splitting into 8 files would be over-decomposition — matches Card's pattern of co-located sub-components in `Card.tsx`.

### Compound API + marker-component pattern

`<PageHeader>` reads its children via `Children.toArray(children)`, finds each known sub-component by `c.type === <SubComponent>`, and places them into the right grid slot of its own layout. Unrecognized children are silently dropped (no error — keeps the API forgiving).

Unlike `<ColorPicker.Trigger>` which is a `null` marker, **PageHeader's sub-components actively render their own JSX**:

```tsx
// e.g.
function PageHeaderTitle({ order = 1, size, children }: PageHeaderTitleProps) {
  return (
    <Title order={order} size={size} className={styles.title}>
      {children}
    </Title>
  );
}
PageHeaderTitle.displayName = 'PageHeaderTitle';
```

The root's job is to know which sub-component is the Title vs Subtitle vs Actions — not to extract their internals. Each sub-component owns its own rendering.

### Fragment handling

React's `Children.toArray` flattens one level of fragments, but **does NOT recursively unwrap nested fragments**. We use a small `flattenChildren` helper to flatten one level deep — sufficient for the common `<>` JSX-fragment-wrap case. Deeper nesting silently drops the wrapped sub-component (documented as an anti-pattern).

### Layout grid

```scss
.root {
  display: grid;
  grid-template-areas:
    'breadcrumb breadcrumb breadcrumb'
    'aside title actions'
    'aside subtitle actions'
    'aside meta actions';
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2) var(--space-3);
  padding-block: var(--space-4) var(--space-3);
}
```

- `aside` spans rows 2-4 vertically; vertically centered via `align-self: center`.
- Title / Subtitle / Meta stack in the center column.
- Actions occupy the right column spanning all three middle rows; vertically centered.

**Missing slots collapse to zero-height rows.** The grid template includes the row even when its content is absent — but the row collapses to 0 because there's no child filling it. Verified by toggling each slot off in the demo.

### Responsive

Mobile (`max-width: 640px`): Actions wraps below the title block (the right column becomes a full-width row underneath). Aside stays to the left of the title. Implemented via a media query that re-orders `grid-template-areas`.

This is the first library component to use a media query inside its CSS Module — flagged as a `REGRESSION-WATCH` for HR8 review. The alternative (consumer composes responsive layout outside) is more flexible but worse UX, since every consumer would need to reinvent the wheel.

## Public API

```ts
export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Render a 1px bottom border under the header. Default `true`. Set
   * `false` when placing a `<Tabs>` component as a sibling below — Tabs
   * has its own `border-bottom`, and you don't want the double line.
   */
  borderBottom?: boolean;
}

export interface PageHeaderBreadcrumbProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface PageHeaderBackButtonProps {
  /** Renders as `<a href>`. Mutually exclusive with `onClick`. */
  href?: string;
  /** Renders as `<button type="button">`. Mutually exclusive with `href`. */
  onClick?: () => void;
  /** Accessible label. Default `"Go back"`. */
  'aria-label'?: string;
  /** Icon to render. Default `<ChevronLeft size={16}>` from lucide-react. */
  icon?: ReactNode;
}

export interface PageHeaderAsideProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface PageHeaderTitleProps {
  /** Heading semantic level (1-6). Default `1`. Passed to <Title order=>. */
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Visual size override (decouples from semantic level). Pass-through to <Title size=>. */
  size?: TitleSize;
  children: ReactNode;
}

export interface PageHeaderSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export interface PageHeaderMetaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface PageHeaderActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
```

Compound attach (same pattern as Card, ColorPicker):

```ts
export const PageHeader = Object.assign(PageHeaderRoot, {
  Breadcrumb: PageHeaderBreadcrumb,
  BackButton: PageHeaderBackButton,
  Aside: PageHeaderAside,
  Title: PageHeaderTitle,
  Subtitle: PageHeaderSubtitle,
  Meta: PageHeaderMeta,
  Actions: PageHeaderActions,
});
```

## Slot inventory

| Slot                      | Element                         | Purpose                                                      | Grid area                          |
| ------------------------- | ------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| `<PageHeader.Breadcrumb>` | `<div>` wrapping `<Breadcrumb>` | Page-level navigation trail                                  | `breadcrumb` (row 1, full width)   |
| `<PageHeader.BackButton>` | `<a>` or `<button>`             | Back navigation (renders inside the Breadcrumb row, leading) | — (rendered inside `.breadcrumb`)  |
| `<PageHeader.Aside>`      | `<div>`                         | Avatar / icon / image                                        | `aside` (rows 2-4, left column)    |
| `<PageHeader.Title>`      | `<Title order={order}>`         | Main heading (h1 default)                                    | `title` (row 2, center column)     |
| `<PageHeader.Subtitle>`   | `<p>`                           | One-line description                                         | `subtitle` (row 3, center column)  |
| `<PageHeader.Meta>`       | `<div>` (flex row, wraps)       | Badges / timestamps / chips                                  | `meta` (row 4, center column)      |
| `<PageHeader.Actions>`    | `<div>` (flex row)              | Right-aligned button cluster                                 | `actions` (rows 2-4, right column) |

## Interactions / behavior

### `<PageHeader.BackButton>`

- `href` prop → renders `<a href={href}>` with the icon. Standard anchor; consumer's router handles the click.
- `onClick` prop → renders `<button type="button" onClick={onClick}>`.
- Both props → console.warn in dev, button wins (avoids ambiguity).
- Hover: `var(--color-bg-muted)` background.
- Focus: standard focus ring via the `focus-ring` mixin.
- Default `aria-label="Go back"` if not provided (warns once in dev for accessibility).

### `borderBottom={false}`

`.root` drops its `border-bottom`. Consumer typically pairs this with `<Tabs>` sibling below.

### Responsive (`max-width: 640px`)

Grid template re-orders so Actions wraps to a new row below the title block:

```scss
@media (max-width: 640px) {
  .root {
    grid-template-areas:
      'breadcrumb breadcrumb'
      'aside title'
      'aside subtitle'
      'aside meta'
      'actions actions';
    grid-template-columns: auto 1fr;
  }
  .actions {
    justify-content: flex-start;
    margin-top: var(--space-3);
  }
}
```

## Color math / utilities

None — PageHeader is a pure layout primitive with no behavioral state.

## Edge cases

| Case                                                            | Behavior                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `<PageHeader>` with no children at all                          | Renders an empty styled `<div>`. No error.                           |
| `<PageHeader>` with only `<PageHeader.Title>`                   | Renders title; all other grid rows collapse to 0 height.             |
| Non-PageHeader child (e.g., `<div>` directly in `<PageHeader>`) | Silently dropped.                                                    |
| `<PageHeader.Title>` wrapped in `<>...</>` Fragment             | Supported (one level of Fragment unwrapping).                        |
| `<PageHeader.Title>` deeply nested under custom HOC             | Silently dropped. Documented anti-pattern.                           |
| `<PageHeader.BackButton>` with both `href` AND `onClick`        | Renders as `<button>`, warns in dev.                                 |
| `<PageHeader.BackButton>` with neither `href` nor `onClick`     | Renders as a non-interactive `<button disabled>`, warns in dev.      |
| Multiple `<PageHeader.Title>` children                          | First one wins, subsequent ones silently dropped.                    |
| Empty `<PageHeader.Actions>`                                    | Renders an empty `<div>` in the actions column (no negative impact). |

## SCSS sketch (verbatim)

```scss
.root {
  display: grid;
  grid-template-areas:
    'breadcrumb breadcrumb breadcrumb'
    'aside title actions'
    'aside subtitle actions'
    'aside meta actions';
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2) var(--space-3);
  padding-block: var(--space-4) var(--space-3);
}

.rootWithBorder {
  border-bottom: var(--border-width) solid var(--color-border);
}

.breadcrumb {
  grid-area: breadcrumb;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.backButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-fg-muted);
  /* stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword */
  cursor: pointer;
  /* For <a> rendering: kill the default text-decoration */
  text-decoration: none;
}

.backButton:hover {
  background: var(--color-bg-muted);
  color: var(--color-fg);
}

.backButton:focus-visible {
  @include focus-ring;
  outline: none;
}

.aside {
  grid-area: aside;
  align-self: center;
}

.title {
  grid-area: title;
}

.subtitle {
  grid-area: subtitle;
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--color-fg-muted);
  line-height: var(--line-height-snug);
}

.meta {
  grid-area: meta;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  align-self: center;
}

@media (max-width: 640px) {
  .root {
    grid-template-areas:
      'breadcrumb breadcrumb'
      'aside title'
      'aside subtitle'
      'aside meta'
      'actions actions';
    grid-template-columns: auto 1fr;
  }

  .actions {
    justify-content: flex-start;
    /* stylelint-disable-next-line property-disallowed-list -- internal responsive spacing in this layout primitive */
    margin-top: var(--space-3);
  }
}
```

## Testing strategy

### `PageHeader.test.tsx` (~18 cases)

Grouped:

- **Rendering** (4 cases): renders only the slots provided; missing slots collapse without empty rows; `borderBottom={false}` removes the bottom-border class; root element is a `<div>` (not `<header>`) so it doesn't conflict with the AppShell's banner landmark.
- **Sub-component detection** (3 cases): Children that match `c.type === PageHeader.Title` are rendered in the title slot; non-PageHeader children (e.g., a `<div>`) are silently dropped; Fragments wrapping a `<PageHeader.Title>` ARE supported (one level of unwrapping).
- **`<PageHeader.Title>`** (2 cases): default `order={1}` renders `<h1>`; `order={2}` renders `<h2>`; `size` prop overrides visual size without changing semantic level.
- **`<PageHeader.BackButton>`** (3 cases): `href` prop renders an `<a>`; `onClick` prop renders a `<button type="button">`; default `aria-label="Go back"` is set when consumer doesn't provide one; custom `icon` prop replaces the default ChevronLeft.
- **`<PageHeader.Aside>` + `<PageHeader.Actions>`** (2 cases): both render children as-is in their grid slots; Aside is vertically centered with the title block.
- **`<PageHeader.Subtitle>` + `<PageHeader.Meta>`** (1 case): both render in the center column below the title.
- **Layout / a11y / misc** (3 cases): root forwards `ref` to the outermost `<div>`; `className` merges with the base class; `getByRole('heading', { level: 1 })` finds the title.

## Demo additions

`packages/playground/src/pages/components/PageHeaderDemo.tsx` with 5 examples:

1. **Minimal** — just `<PageHeader.Title>`. The "you only need the title" case.
2. **With subtitle + actions** — Members-style header.
3. **Full** — ContactDetail-style: Breadcrumb + BackButton + Aside (Avatar) + Title + Subtitle + Meta (Badge + Text) + Actions.
4. **Inline with sibling Tabs** — Title + Actions, `borderBottom={false}`, with `<Tabs>` rendered as a sibling below. Demonstrates the prop's purpose.
5. **Section header (`order={2}`)** — A sub-page header rendering as `<h2>`. For sub-sections within a page.

## 4-place wiring

- **`App.tsx`** — `<Route path="/components/page-header" element={<PageHeaderDemo />} />` inserted alphabetically.
- **`AppShell.tsx`** — Layout cluster, between `Grid` and `Stack` (P comes after G, before S). Lucide icon: `LayoutPanelTop`.
- **`ComponentsIndex.tsx`** — card with a small inline `<PageHeader>` preview (Title + Subtitle + one Button as Actions), `pointerEvents: 'none'`.
- **`registry.ts`** — extend `ComponentName` union with `'PageHeader'`.

## AGENTS.md addition

Layout cluster, **after `<Divider>`** (last in the current layout block). PageHeader is a higher-level composition than the other layout primitives — placing it last in the cluster signals "this is built ON TOP of Stack/Cluster/Card." Section covers:

- Compound API (7 slots: Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions).
- Marker-detection by `c.type` — one level of Fragment unwrapping.
- `borderBottom` prop pairing with sibling Tabs.
- Hard-rule anti-patterns:
  - ❌ Nesting `<PageHeader>` inside another `<PageHeader>`.
  - ❌ Putting non-PageHeader children inside `<PageHeader>` — they're silently dropped.
  - ❌ Wrapping a `<PageHeader.Title>` in an HOC or deep nesting — breaks `c.type ===` check.
  - ❌ Avatar inside `<PageHeader.Title>` — muddles the `<h1>` text content. Use `<PageHeader.Aside>` instead.
  - ❌ Sticky positioning via `position: sticky` on `<PageHeader>` itself — consumer wraps in their own sticky container if needed.

## Hard Rule 8 — review cycle

Standard cycle. Particular things to flag for the reviewer:

- The marker-detection logic + `flattenChildren` Fragment handling.
- Grid-template-areas collapse behavior when slots are absent — verify visually.
- `<a>` vs `<button>` element selection in BackButton — `aria-label` fallback works for both.
- The responsive media query inside the component (first time we do this) — **REGRESSION-WATCH**.
- Verify the demo's "Inline with sibling Tabs" example actually renders a single border (not double).
- `npm pack --dry-run` includes the PageHeader dir, no test files.

## Follow-up work (out of scope)

- **Mockup refactor** — migrate ContactDetail and Members to use `<PageHeader>` instead of their hand-rolled headers. Separate PR after this one merges.
- **Sticky positioning** — add a `sticky` prop with z-index coordination once we have a clearer story for the AppShell topbar interaction.
- **Tabs as inside slot** — if the borderBottom-prop pattern gets tedious in real usage, revisit whether `<PageHeader.Tabs>` should be a first-class slot.
- **Page actions overflow** — first-class "more actions" overflow menu when there are 4+ buttons.
- **Avatar size discipline** — if multiple consumers put differently-sized avatars in `<PageHeader.Aside>` and complain about inconsistency, lock a default size via the slot's own CSS.
