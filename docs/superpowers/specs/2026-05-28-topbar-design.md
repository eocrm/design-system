# `<TopBar>` — sticky application top bar primitive

## Goal

Take the styled topbar that lives in the playground's `AppShell` today and lift it into the library as a reusable primitive. Visual fidelity must match the playground exactly (the user said "use the same design we currently have"). Consumers should be able to drop a TopBar into any layout — most often paired with a `<Rail>` sidebar in a CSS-grid app shell — and get the same chrome without re-implementing it.

The current playground topbar:

- Sticky to the top of the viewport (`position: sticky; top: 0`).
- 56px tall, light background, subtle bottom border, padded inline.
- Two visual clusters: a left side (currently just a styled search input with leading icon + `⌘K` kbd hint), and a right side (icon buttons for "create" / "notifications" + a small avatar).
- One of the icon buttons has a tiny accent-colored dot in the upper-right to indicate unread notifications.

## Locked-in design decisions (brainstorm)

1. **Scope:** the bar's chrome + a `Search` subcomponent + an `IconButton` subcomponent. Avatar stays a separate primitive (already exists).
2. **Positioning:** sticky-top within a CSS grid. Same as the AppShell.
3. **Search:** minimal — a real `<input>` with leading icon and an optional kbd hint. Consumer wires `value`/`onChange`/etc. through prop spread. No command-palette behavior in v1.

## Architecture

Compound API. Three subcomponents under the root:

```tsx
<TopBar aria-label="Application top bar">
  <TopBar.Start>
    <TopBar.Search placeholder="Search contacts, deals…" hotkey="⌘K" />
  </TopBar.Start>
  <TopBar.End>
    <TopBar.IconButton aria-label="Create new">
      <Plus size={16} />
    </TopBar.IconButton>
    <TopBar.IconButton aria-label="Notifications" indicator>
      <Bell size={16} />
    </TopBar.IconButton>
    <Avatar name="Alex Rivera" size="sm" />
  </TopBar.End>
</TopBar>
```

The root renders a `<header>` (implicit `banner` role when a direct child of `body`, override-able via `as`). Inside the header is a flex row with `Start` on the left and `End` pushed to the right (`Start` has `flex: 1` to take the remaining space; `End` shrinks to its content).

## Subcomponent specs

### `<TopBar>`

Props:

- `aria-label?: string` — accessible name for the bar. Defaults via i18n (`t('topBar.label')`).
- `className?: string`
- Children: typically `<TopBar.Start>` + `<TopBar.End>`, but the children area is open — a consumer who wants a single-cluster bar (just on the right, say) can pass only one slot or arbitrary children.
- `as?: 'header' | 'div'` — default `'header'`. `'div'` for the rare nested-bar case.

Renders an inline-padded, sticky-top horizontal bar with a bottom border. Owns its own `height`, `padding-x`, `background`, `border-bottom` — Hard rule 4 exception, justified inline (same as `<Modal>`, `<Drawer>`, `<Rail>`, `<Page>`).

### `<TopBar.Start>` and `<TopBar.End>`

Both render a flex row of children with `Cluster`-like gap. `Start` has `flex: 1` so it expands; `End` shrinks. The bar's children space stays between them.

Props (both): `className?`, `children`, plus HTMLAttributes.

### `<TopBar.Search>`

Props:

- `placeholder?: string` — visible placeholder text. No default (consumer-controlled — varies by app context).
- `hotkey?: ReactNode` — content of the trailing `<kbd>` hint. Pass `'⌘K'`, `'Ctrl+K'`, or any node. Omit for no hint.
- `value?: string`, `defaultValue?: string`, `onChange?` — standard text-input controls. Spread through to the underlying `<input>`.
- `aria-label?: string` — defaults to placeholder or to `t('topBar.search')` if both are unset.
- All other props (HTMLAttributes minus `type`) pass through to the input.

Renders a 32px-tall pill-shaped surface with:

- Leading `Search` icon from lucide-react at `--topbar-search-icon-fg`.
- The `<input type="search">` (transparent bg, no border — the surface chrome is on the wrapper).
- Optional trailing `<kbd>` with the hotkey copy, styled muted with a faint background.

The input does NOT implement keyboard-shortcut focus behavior (e.g. ⌘K → focus the input). That's a consumer concern — the library doesn't dictate which shortcuts bind to which UI. The `hotkey` prop is purely a visual hint.

### `<TopBar.IconButton>`

A thin wrapper over the existing `<Button iconOnly variant="ghost" size="sm">` with one addition: an `indicator?: boolean` prop that overlays a small dot in the button's upper-right corner (for "new notifications", "updates available", etc.).

Props:

- `children: ReactNode` — typically a lucide icon.
- `indicator?: boolean` — show the dot.
- `indicatorTone?: 'danger' | 'warning' | 'info' | 'accent'` — default `'danger'`. The notification color.
- `aria-label: string` — REQUIRED (icon-only button).
- Plus `ButtonHTMLAttributes` via spread.

Renders the Button with `position: relative` so the dot can absolute-position to top-right.

## Files

| File                                                                      | Role                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/design-system/src/components/TopBar/TopBar.tsx` (NEW)           | Root + context (likely no context needed — pure layout) + compose subcomponents |
| `packages/design-system/src/components/TopBar/TopBarStart.tsx` (NEW)      | `<div className="start">` flex region                                           |
| `packages/design-system/src/components/TopBar/TopBarEnd.tsx` (NEW)        | `<div className="end">` flex region                                             |
| `packages/design-system/src/components/TopBar/TopBarSearch.tsx` (NEW)     | Styled search input                                                             |
| `packages/design-system/src/components/TopBar/TopBarIconButton.tsx` (NEW) | Icon button + optional indicator dot                                            |
| `packages/design-system/src/components/TopBar/TopBar.module.scss` (NEW)   | All visual styles                                                               |
| `packages/design-system/src/components/TopBar/TopBar.tokens.scss` (NEW)   | Component tokens                                                                |
| `packages/design-system/src/components/TopBar/TopBar.test.tsx` (NEW)      | Unit tests                                                                      |
| `packages/design-system/src/components/TopBar/index.ts` (NEW)             | Public exports                                                                  |
| `packages/design-system/src/i18n/messages.ts` (MODIFY)                    | Add `topBar.label`, `topBar.search` keys                                        |
| `packages/design-system/src/i18n/en.ts` (MODIFY)                          | en values                                                                       |
| `packages/design-system/src/i18n/ru.ts` (MODIFY)                          | ru values                                                                       |
| `packages/design-system/src/index.ts` (MODIFY)                            | Re-export                                                                       |
| `packages/design-system/AGENTS.md` (MODIFY)                               | TopBar catalog entry                                                            |
| `packages/playground/src/pages/components/TopBarDemo.tsx` (NEW)           | Demo page                                                                       |
| `packages/playground/src/App.tsx` (MODIFY)                                | Route                                                                           |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY)           | Adopt the new TopBar; remove hand-rolled markup                                 |
| `packages/playground/src/layout/AppShell/AppShell.module.scss` (MODIFY)   | Remove now-dead `.topbar`/`.searchWrap`/`.iconBtn` etc. styles                  |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY)              | Add `TopBar` to the ComponentName union                                         |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` (MODIFY)   | Add card                                                                        |
| `packages/design-system/src/components.manifest.json` (regen via script)  | New component metadata                                                          |

## Tokens

```scss
:root {
  // Bar chrome
  --topbar-height: 56px;
  --topbar-bg: var(--color-bg);
  --topbar-border-color: var(--color-border);
  --topbar-border-width: var(--border-width);
  --topbar-padding-x: var(--space-4);
  --topbar-gap: var(--space-md, var(--space-3));
  --topbar-z-index: 5;

  // Search
  --topbar-search-min-width: 280px;
  --topbar-search-max-width: 420px;
  --topbar-search-height: 32px;
  --topbar-search-bg: var(--color-bg-subtle);
  --topbar-search-fg: var(--color-fg);
  --topbar-search-placeholder-fg: var(--color-fg-muted);
  --topbar-search-radius: var(--radius-md);
  --topbar-search-padding-x: var(--space-3);
  --topbar-search-gap: var(--space-2);
  --topbar-search-icon-fg: var(--color-fg-muted);
  --topbar-search-icon-size: 14px;
  --topbar-search-kbd-bg: var(--color-bg-muted);
  --topbar-search-kbd-fg: var(--color-fg-muted);
  --topbar-search-kbd-radius: var(--radius-sm);
  --topbar-search-kbd-padding-x: var(--space-1);
  --topbar-search-kbd-font-size: var(--font-size-xs);
  --topbar-search-ring-focus: var(--ring-accent);

  // Icon button
  --topbar-icon-button-size: 32px;
  --topbar-icon-button-radius: var(--radius-md);

  // Notification dot
  --topbar-indicator-size: 8px;
  --topbar-indicator-offset-top: 6px;
  --topbar-indicator-offset-right: 6px;
  --topbar-indicator-bg-danger: var(--color-danger);
  --topbar-indicator-bg-warning: var(--color-warning);
  --topbar-indicator-bg-info: var(--color-info);
  --topbar-indicator-bg-accent: var(--color-accent);
  --topbar-indicator-border-color: var(
    --topbar-bg
  ); // same as bar bg so the ring around the dot reads as a tiny halo
  --topbar-indicator-border-width: 1.5px;
}
```

## i18n keys

```ts
topBar: {
  label: string; // default aria-label for the bar
  search: string; // default aria-label for the search input
}
```

| Key             | en                    | ru                          |
| --------------- | --------------------- | --------------------------- |
| `topBar.label`  | `Application top bar` | `Верхняя панель приложения` |
| `topBar.search` | `Search`              | `Поиск`                     |

## Accessibility

- `<header>` element. When the consumer renders it inside the page body, the implicit `banner` role applies. Override with `as="div"` for nested bars (a secondary toolbar inside a main page area where `<header>` isn't appropriate).
- `<TopBar.Search>` is a real `<input type="search">`. Browsers expose `role="searchbox"` automatically. The leading icon is `aria-hidden`. The trailing kbd hint is `aria-hidden` (it's a visual reminder, not announced).
- `<TopBar.IconButton>` requires `aria-label` (extends `<Button iconOnly>`). The indicator dot has no role — it's a visual cue. Consumer is responsible for an additional accessible note ("3 unread notifications") via either the `aria-label` text or a hidden span.

## Tests

Per Rule 1, `TopBar.test.tsx` covers:

- Root renders as `<header>` by default; `as="div"` renders a `<div>`.
- aria-label defaults to `t('topBar.label')`; consumer override wins.
- Start/End slot positions: Start has `flex: 1`, End shrinks. (Assert via class application — actual flex math is jsdom-untestable.)
- TopBar.Search renders icon, input, and (when provided) kbd hint.
- TopBar.Search input forwards arbitrary HTML props (`onChange`, `value`, etc.).
- TopBar.IconButton renders without indicator by default; `indicator` prop adds the dot element.
- All subcomponents `forwardRef` (Rule 6).

## Demo + playground

A new `RailDemo`-shaped demo page at `/components/topbar` with examples:

1. Default — Start has Search, End has IconButtons + Avatar (matches the existing playground topbar).
2. No search — End-only with brand on the Start side.
3. Custom indicator tone — show `indicatorTone="warning"` for a maintenance-banner kind of cue.
4. Inside a layout — wrap a `<TopBar>` in a small mock app shell to show the sticky behavior.

After the primitive ships, adopt it inside the playground's `AppShell.tsx` to remove the hand-rolled markup (search input, icon buttons, notification dot, etc.). Drop the now-orphaned classes from `AppShell.module.scss`.

## Out of scope (deliberate)

- Command-palette behavior (typing-to-search, keyboard shortcut to focus the input, result list). The `hotkey` prop is visual only.
- A built-in "user menu" or "create menu" — consumers compose those with existing primitives (`<DropdownMenu>` + `<Avatar>` etc.).
- Theming variants (dark TopBar inside a light app, or transparent over a hero image). The default light-on-light look matches the playground; consumers retheme via the tokens.
- A right-aligned brand or logo slot. The brand lives in `<Rail.Header>` per the AppShell pattern; TopBar is search + actions.

## File layout invariants

- All values in `TopBar.module.scss` via `var(--topbar-*)` tokens declared in `TopBar.tokens.scss`.
- The TopBar owns its height/padding/border-bottom because it IS a layout primitive — same Rule 4 exception as Rail/Modal/Page. Documented inline.
- All public types re-exported from `src/index.ts`.
- `forwardRef` + JSDoc on every exported member.
- Every user-facing string flows through `useTranslation` (Rule 9).
