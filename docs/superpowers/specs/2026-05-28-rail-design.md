# `<Rail>` — collapsible left-side navigation primitive

## Goal

A vertical navigation rail anchored to one side of the page that switches between a wide labelled mode and a narrow icon-only mode. Built to feel like Jira's sidebar: sections of items, parent groups with nested subitems, a smooth collapse, and — when collapsed — hover-revealed flyouts for groups so deep navigation is still reachable.

This is a new library primitive. The playground's current `AppShell` aside (`packages/playground/src/layout/AppShell/AppShell.tsx`) is the in-house consumer that will adopt it.

## Locked-in design decisions

(From the brainstorm with the user.)

1. **Collapsed-subitem behavior:** hover popover (Jira). When the rail is collapsed, hovering a group's icon opens a small floating panel to the right with the group's subitems. Built on the existing Floating UI + Popover stack.
2. **Collapse state:** both controlled and uncontrolled. `defaultCollapsed` for the simple case; `collapsed` + `onCollapsedChange` for sync-with-URL / sync-with-localStorage. Matches Tabs / DropdownMenu pattern.
3. **Active item:** polymorphic via `as` + the routing lib's active matcher. `<Rail.Item as={NavLink} to="/">` — react-router (or any nav lib) sets `aria-current="page"`. Rail applies its active styling via the CSS `[aria-current="page"]` selector. No routing dependency in the library.

## Architecture

Compound API. Each subcomponent is a separately-imported child of `Rail`:

```tsx
import { Rail } from '@eocrm/design-system';

<Rail
  defaultCollapsed={false}
  onCollapsedChange={persistToLocalStorage}
  aria-label="Main navigation"
>
  <Rail.Header>
    <BrandLogo />
  </Rail.Header>

  <Rail.Section title="Main">
    <Rail.Item icon={<Home />} as={NavLink} to="/">Dashboard</Rail.Item>
    <Rail.Item icon={<Building />} as={NavLink} to="/tenants" badge="12">
      Tenants
    </Rail.Item>
  </Rail.Section>

  <Rail.Section title="Operations">
    <Rail.Group icon={<Settings />} label="Settings" defaultOpen>
      <Rail.Item as={NavLink} to="/settings/general">General</Rail.Item>
      <Rail.Item as={NavLink} to="/settings/security">Security</Rail.Item>
      <Rail.Item as={NavLink} to="/settings/billing">Billing</Rail.Item>
    </Rail.Group>
  </Rail.Section>

  <Rail.Spacer />

  <Rail.Footer>
    <Rail.CollapseToggle />
    <UserChip />
  </Rail.Footer>
</Rail>
```

## Files

```
packages/design-system/src/components/Rail/
  Rail.tsx                 ← root; context + collapsed state
  RailHeader.tsx           ← top area (logo / title)
  RailSection.tsx          ← title + items container
  RailItem.tsx             ← polymorphic via `as`; icon + label + badge + tooltip when collapsed
  RailGroup.tsx            ← parent with subitems; inline expand when expanded, hover-popover when collapsed
  RailFooter.tsx
  RailCollapseToggle.tsx
  RailSpacer.tsx           ← flex-grow to push Footer to bottom
  Rail.module.scss
  Rail.tokens.scss
  Rail.test.tsx
  index.ts
```

## Subcomponent specs

### `<Rail>` (root)

Props:
- `collapsed?: boolean` (controlled)
- `defaultCollapsed?: boolean` (uncontrolled; default `false`)
- `onCollapsedChange?: (collapsed: boolean) => void`
- `aria-label?: string` — for the `<nav>` element wrapping the children. Defaults via i18n.
- `className?: string`
- Children: any combination of `Rail.Header`, `Rail.Section`, `Rail.Group`, `Rail.Item`, `Rail.Spacer`, `Rail.Footer`.

Renders a `<nav>` whose width animates between `--rail-width-expanded` and `--rail-width-collapsed`. Provides a `RailContext` with `{ collapsed, setCollapsed }` to all children.

### `<Rail.Header>`

A slot at the top of the rail. Consumer renders a logo, brand, or workspace switcher. When collapsed, the content has `overflow: hidden` so anything wider than 56px clips — typically the consumer renders a smaller version (e.g., just the logo mark, no wordmark). Library doesn't enforce this; we just clip overflow.

### `<Rail.Section>`

Props:
- `title?: string` — section heading. Hidden when collapsed.
- `children`: items / groups.

Renders the title in small-caps muted style when expanded; hides it when collapsed (a small visual gap remains between sections via padding). Section is a `<div role="group">` for screen readers, with `aria-label={title}` so the grouping is announced.

### `<Rail.Item>`

Props (extends `HTMLAttributes` of the rendered element):
- `as?: ElementType` — default `'a'`. Most consumers pass a router's `NavLink` here.
- `icon?: ReactNode` — required for top-level items; optional for items nested inside a `<Rail.Group>` (Jira shows subitems without icons).
- `badge?: ReactNode` — optional. Right-aligned when expanded; small dot at the icon's top-right when collapsed.
- `children`: the label text.

Behavior:
- Expanded: renders icon + label, with badge at the right.
- Collapsed (top-level): renders icon only, wrapped in `<Tooltip content={children}>` so hover reveals the label as a tooltip.
- Active styling: applied via CSS `[aria-current="page"]` selector. NavLink sets this automatically; consumers using a different routing lib can pass `aria-current` themselves.
- Renders as the polymorphic `as` element (default `<a>`). Default `type="button"` only applies when `as="button"`.

### `<Rail.Group>`

Props:
- `icon: ReactNode` — required (groups always have a leading icon).
- `label: string` — visible when expanded; used as the popover header when collapsed.
- `open?: boolean` (controlled)
- `defaultOpen?: boolean` (uncontrolled; default `false`)
- `onOpenChange?: (open: boolean) => void`
- `children`: `<Rail.Item>` children only (subitems).

Behavior when expanded:
- Renders icon + label + chevron. Clicking toggles open/closed.
- When open, subitems render inline below, with extra left-padding indicating nesting.

Behavior when collapsed:
- Renders icon only.
- Hovering the icon opens a popover anchored to the right of the rail. The popover contains the `label` as a header + the subitems as a vertical list. Built on Floating UI (existing infrastructure).
- The popover stays open while the cursor is within the icon's bounding box OR within the popover itself, with a small grace period (~100ms) when transitioning between them.
- If any subitem is active (`aria-current="page"` inside the popover), the group's icon shows the same active styling that a `Rail.Item` would.

A group is parent-active when any of its descendants is active. Detected via CSS `:has([aria-current="page"])` — the group's button itself shows the active accent.

### `<Rail.Footer>`

A slot at the bottom of the rail. Pushed to the bottom by a sibling `<Rail.Spacer>` (or, if no spacer, sits at the natural flow position).

### `<Rail.CollapseToggle>`

A button that calls `setCollapsed(prev => !prev)`. Renders a chevron icon that rotates depending on state. aria-label is `t('rail.collapse')` or `t('rail.expand')` depending on current state.

### `<Rail.Spacer>`

`flex-grow: 1` — pushes everything after it to the bottom. Used to anchor `Rail.Footer` to the bottom of the rail.

## Tokens

```scss
:root {
  --rail-width-expanded: 240px;
  --rail-width-collapsed: 56px;
  --rail-padding-y: var(--space-2);
  --rail-padding-x: var(--space-2);
  --rail-bg: var(--color-bg);
  --rail-border-color: var(--color-border);
  --rail-border-width: var(--border-width);

  --rail-section-gap: var(--space-3);
  --rail-section-title-fg: var(--color-fg-muted);
  --rail-section-title-font-size: var(--font-size-xs);
  --rail-section-title-font-weight: var(--font-weight-semibold);
  --rail-section-title-letter-spacing: var(--letter-spacing-caps);
  --rail-section-title-padding: var(--space-2) var(--space-3);

  --rail-item-padding-x: var(--space-3);
  --rail-item-padding-y: var(--space-2);
  --rail-item-gap: var(--space-2);
  --rail-item-radius: var(--radius-sm);
  --rail-item-bg-hover: var(--color-bg-muted);
  --rail-item-fg: var(--color-fg);
  --rail-item-bg-active: var(--color-accent-subtle-bg);
  --rail-item-fg-active: var(--color-accent);
  --rail-item-icon-size: 18px;

  --rail-subitem-padding-left: var(--space-7); // indent under group icon

  --rail-collapse-transition: width var(--transition-base);
  --rail-label-transition: opacity var(--transition-fast);
}
```

## i18n keys

Added to `Messages`:

```ts
rail: {
  expand: string;       // "Expand navigation"
  collapse: string;     // "Collapse navigation"
  navigation: string;   // default aria-label for the <nav>
};
```

Mapping:

| Key | en | ru |
| --- | --- | --- |
| `rail.expand` | `Expand navigation` | `Развернуть навигацию` |
| `rail.collapse` | `Collapse navigation` | `Свернуть навигацию` |
| `rail.navigation` | `Main navigation` | `Главная навигация` |

## Behavior details

### Collapsed state animation

CSS transition on `width`. The label spans have `opacity: 0` + `pointer-events: none` + `visibility: hidden` (after transition end) when collapsed; `opacity: 1` when expanded. Section titles and badges follow the same fade-out rule.

The text shouldn't reflow during the transition — we use `white-space: nowrap` + `overflow: hidden` on the item containers so labels are clipped, not wrapped.

### Polymorphic `as` + active matching

`Rail.Item` renders an `<a>` by default. When the consumer passes `as={NavLink}` (react-router) or any equivalent, that element renders. The active treatment is purely CSS:

```scss
.item[aria-current='page'],
.item:has([aria-current='page']) {
  background: var(--rail-item-bg-active);
  color: var(--rail-item-fg-active);
}
```

`:has()` covers the case where the polymorphic-rendered child element (NavLink) carries the `aria-current` rather than the wrapping `.item` div.

### Group open-state default

When the rail is uncontrolled (`defaultCollapsed` mode), `Rail.Group`'s open state is uncontrolled and follows `defaultOpen`. When the rail collapses, the group's "open" state is preserved in memory; reopening the rail restores the previous state. This avoids a flash of "all groups closed" on every collapse cycle.

### Group-with-active-descendant auto-open

If a subitem is active when the rail expands, the parent group auto-opens (one-time, on mount or on transition to expanded). The consumer doesn't have to wire URL → group state manually. Implementation: each `Rail.Group` reads its subtree for `[aria-current="page"]` via a ref + `MutationObserver` (or via a tracked context).

For simplicity in v1, this auto-open is enforced on initial mount only — subsequent route changes don't force the group open. The consumer can pass a controlled `open` prop if they want exact sync.

### Popover-on-hover (collapsed groups)

When the rail is collapsed, `Rail.Group`'s icon button has:
- `onMouseEnter` → open the popover (with 80ms delay to prevent accidental triggering during cursor traversal)
- `onMouseLeave` → close the popover (with 200ms grace period so the user can move into the popover)
- The popover itself also tracks mouse-enter/leave with the same grace

Built on `<Popover>` (existing primitive) with `placement="right-start"` and `offset={8}`.

The popover's content area:
- Header: the group's `label` (always visible)
- Body: the group's subitems rendered as `<Rail.Item>` lookalikes (they ARE Rail.Item children, just rendered in the popover context)

When the popover is open AND the user clicks a subitem, the popover closes immediately (any navigation should dismiss the floater).

## Accessibility

- Rail itself: `role="navigation"` with `aria-label={t('rail.navigation')}` (overridable via prop).
- Section: `role="group"` with `aria-label={title}` when title is set.
- Section title: rendered as a `<div>` with no role; visually small-caps muted.
- Item: the polymorphic element carries the native role (link `<a>` has `role="link"`; `<button>` has `role="button"`).
- Item icon: `aria-hidden="true"`.
- Item label: visible text.
- Item badge: `<span>` with screen-reader-accessible text; if numeric, `aria-label={\`${badge} unread\`}` etc. — consumer-controlled.
- Group's clickable area: `<button aria-expanded={open} aria-controls={subitemsId}>`. When collapsed, the button instead has `aria-haspopup="menu"` semantics (since the popover is shown on hover).
- CollapseToggle: `aria-label={t('rail.collapse'|'rail.expand')}`.

### Keyboard

- `Tab` moves through focusable items in DOM order.
- Inside a group's subitems (expanded inline): standard tab order.
- `Esc` while the collapsed-popover is open: closes the popover and returns focus to the group icon.

Arrow-key navigation between items is NOT implemented in v1 — relying on native tab order keeps complexity down and matches the Jira behavior (Jira uses Tab, not arrow keys). Item lists are linear so Tab is sufficient.

## Tests

Per Hard rule 1, `Rail.test.tsx` covers:
- Renders all subcomponents without crashing.
- `defaultCollapsed` initial state; collapsed class applied to root.
- `collapsed` (controlled) overrides default; `onCollapsedChange` fires on toggle.
- Section title hidden when collapsed.
- Item with `aria-current="page"` (simulated) gets active-styling class.
- Group with active subitem gets parent-active styling.
- `<Rail.CollapseToggle>` toggles state.
- `<Rail.Group>` with `defaultOpen={false}` renders subitems hidden (or not in DOM); `defaultOpen={true}` renders them visible.
- Polymorphic `as`: passing `as="button"` renders a `<button>`.
- i18n: aria-label uses `t('rail.navigation')` by default; consumer can override via `aria-label` prop.
- Refs forward to the underlying `<nav>` element.

(The hover-popover behavior is hard to test in jsdom without flakiness; we test that the popover ELEMENT is rendered in the DOM tree when the group is "hovered" via a synthetic mouseEnter event, but actual timing/grace logic is asserted indirectly.)

## Demo + playground

- Add `RailDemo.tsx` in `packages/playground/src/pages/components/`.
- Demo sections:
  1. Default — uncontrolled, with sections, items, and one group with subitems.
  2. Collapsed by default.
  3. Controlled — consumer wires `collapsed` to local state, with a toggle button.
  4. With routing — uses `as={RouterLink}` for items, demonstrating active styling on the current route.
- The existing `AppShell` aside in the playground stays as-is in this PR (a future PR can migrate it).

## Out of scope (deliberate)

- Drag-to-reorder items
- Pinned / favorites
- Per-item context menu
- Search-nav input inside the rail
- Per-section collapse (separate from item-level)
- Multi-level nesting (groups inside groups). v1 supports one level of nesting only.
- Animation springs / Framer Motion — pure CSS transitions
- Sticky positioning helpers — consumer handles the parent layout (Rail just owns its own width and height behavior)

## File layout invariants

- `Rail.tokens.scss` — all the visual tokens above.
- Per CLAUDE.md Rule 3, no raw values in module.scss outside tokens.
- Per Rule 4, the Rail owns its OWN width and height (it's a layout container by design — this is the exception where the component owns layout, justified the same way `<Page>` and `<Modal>` are). Internal `position: sticky` / fixed positioning is decided by the consumer; the rail doesn't impose it.
- Per Rule 5, every public type is re-exported from `src/index.ts`.
- Per Rule 6, root + each subcomponent uses `forwardRef`.
- Per Rule 7, full JSDoc.
- Per Rule 9, every user-facing string flows through `useTranslation()`.
