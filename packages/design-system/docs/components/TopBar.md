# `<TopBar>` — sticky application top bar

Horizontal app-chrome bar pinned to the top of the viewport. Compound API: `<TopBar.Start>` + `<TopBar.End>` for the two horizontal clusters, plus `<TopBar.Search>` (styled `<input type="search">` with a leading icon and an optional `<kbd>` hotkey hint) and `<TopBar.IconButton>` (icon-only ghost button with an optional notification-dot indicator).

```tsx
import { Avatar, TopBar } from '@eocrm/design-system';
import { Bell, Plus } from 'lucide-react';

<TopBar>
  <TopBar.Start>
    <TopBar.Search placeholder="Search contacts, deals…" hotkey="⌘K" />
  </TopBar.Start>
  <TopBar.End>
    <TopBar.IconButton aria-label="Create new">
      <Plus size={16} />
    </TopBar.IconButton>
    <TopBar.IconButton aria-label="Notifications, 3 unread" indicator>
      <Bell size={16} />
    </TopBar.IconButton>
    <Avatar name="Alex Rivera" size="sm" />
  </TopBar.End>
</TopBar>;
```

<!-- props:start -->

## Props

### `TopBarProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `as` | `'header' \| 'div'` | no | Element to render. Defaults to `'header'`. Pick `'div'` when the bar is nested inside another content area where a second `<header>` landmark would conflict with page semantics. |
| `aria-label` | `string` | no | Accessible label for the bar's landmark. Defaults to `t('topBar.label')` when omitted OR empty — an empty string is not an explicit name — so screen readers always announce a name for the region. Override when a page has multiple bars to disambiguate them. |
| `children` | `ReactNode` | no | Children of the bar — typically `<TopBar.Start>` + `<TopBar.End>`. The children area is open so consumers can render a single cluster, a single trailing element, or any other arrangement they need. |
| …native | | | plus native HTML attributes |

### `TopBarEndProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| …native | | | plus native `<div>` attributes |

### `TopBarIconButtonProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | Icon to render inside the button. Typically a single lucide icon (e.g. `<Bell size={16} />`). The wrapping button supplies the accessible name via `aria-label` — the icon itself is decorative. |
| `indicator` | `boolean` | no | Show a small dot in the upper-right corner of the button. Useful for "unread notifications", "pending updates", etc. The dot is purely visual (`aria-hidden`); the consumer is responsible for surfacing count / status text to assistive tech, typically via the button's `aria-label` or a hidden span. |
| `indicatorTone` | `'danger' \| 'warning' \| 'info' \| 'accent'` | no | Dot color. Defaults to `'danger'` (red). See `TopBarIndicatorTone` for the full option set. |
| `aria-label` | `string` | yes | **Required.** Accessible name for the icon-only button — without it, screen readers announce nothing. Phrase as an action (`'Notifications'`, `'Create new'`). Include count info here when the indicator is on (e.g. `'Notifications, 3 unread'`). |
| …native | | | plus native `<button>` attributes |

### `TopBarSearchProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `hotkey` | `string \| string[]` | no | Optional hotkey hint shown after the input. Rendered internally via `<Kbd size="sm">`. Pass an **array** of key labels for a multi-key combo (`['⌘', 'K']` → two chips joined with `+`) or a single string for a one-chip hint (`'Esc'` → one chip). Note: `'⌘K'` is treated as a single chip — use the array form for multi-key combos. The hint is **visual only**; the library does not bind any keyboard shortcut to it. Omit for no hint. |
| `className` | `string` | no | `className` for the wrapping `<div>` (the search surface itself). The input's own className lives on the underlying `<input>` via the spread input-props (use the standard `inputClassName` pattern if you need to target the inner element specifically — not exposed in v1). |
| `results` | `TopBarSearchGroup[]` | no | Turns on combobox mode: the input gets `role="combobox"` and a results panel opens under it. Presence switches the mode — pass `[]` (not `undefined`) while there are no results yet. You filter or fetch; the library owns keyboard, focus, dismissal, positioning and announcements. The first row is highlighted whenever the set of ids changes, so Enter opens the top hit. |
| `open` | `boolean` | no | Controlled panel visibility. Omit for uncontrolled. |
| `defaultOpen` | `boolean` | no | Uncontrolled initial visibility. Default `false`. |
| `onOpenChange` | `((open: boolean) => void)` | no | Called when the panel wants to open (focus, typing, ↓) or close (Esc, blur, selection). |
| `onSelect` | `((item: TopBarSearchItem, groupIndex: number) => void)` | no | Called on Enter or click on a result. The input text is left as is — clear it here if wanted. |
| `loading` | `boolean` | no | Shows a loading row and sets `aria-busy`; existing results stay visible. |
| `emptyMessage` | `ReactNode` | no | Row shown for a non-empty query with no results. Default `t('topBar.searchEmpty')` (also used when this is an empty string). A non-string node is rendered but the live region still announces the default text — pass a string to have it announced. |
| `footerAction` | `TopBarSearchFooterAction` | no | Trailing row in the ↑/↓ cycle (e.g. "View all results"). Shown only alongside other panel content. |
| …native | | | plus native `<input>` attributes |

### `TopBarStartProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Compound API** — `TopBar.Start` / `TopBar.End` / `TopBar.Search` / `TopBar.IconButton`.
- **Layout-owning primitive (Hard rule 4 exception)** — like `<Modal>`, `<Drawer>`, `<Page>`, `<Rail>`, the bar owns its own height (56px), sticky positioning, padding, background, and bottom border because that IS its job as a top-bar chrome.
- **`<TopBar.Start>`** — flex-grows (`flex: 1`) so a sibling `<TopBar.End>` is pushed to the right edge with no spacer needed.
- **`<TopBar.End>`** — shrinks to its content. Use for trailing actions + avatar.
- **`<TopBar.Search>`** — a real `<input type="search">` (browsers expose `role="searchbox"`). `placeholder` is consumer-controlled. `aria-label` defaults to the placeholder, then to `t('topBar.search')`. The `hotkey` prop renders a trailing `<kbd>` hint — purely **visual**; binding ⌘K to focus is the consumer's responsibility. Spread `value` / `onChange` through normally — they reach the underlying input. The component sets `autoComplete="off"` plus `data-1p-ignore` / `data-lpignore` / `data-form-type="other"` so password managers and browser autofill skip it.
- **i18n**: `topBar.label` (default `<header>` aria-label), `topBar.search` (default `<input>` aria-label fallback), `topBar.searchEmpty` (default empty-results row), `topBar.searchLoading` (loading row + announcement), `topBar.searchResults` (result-count announcement).
- **Type note**: `TopBarSearchProps` omits the native `onSelect` (text-selection event) and the legacy `results` input attribute in favour of the combobox props below.

### Combobox mode (`results`)

Passing `results` (even `[]`) turns the pill into an ARIA combobox with a results panel. You filter or fetch; the library owns keyboard, focus, dismissal, positioning and announcements.

```tsx
const [q, setQ] = useState('');
const { data, isFetching } = useSearch(q); // your fetch; returns TopBarSearchGroup[]

<TopBar.Search
  placeholder="Search contacts, deals…"
  hotkey={['⌘', 'K']}
  value={q}
  onChange={(e) => setQ(e.target.value)}
  results={data ?? []}
  loading={isFetching}
  onSelect={(item) => navigate(item.href ?? `/records/${item.id}`)}
  footerAction={{
    label: `View all results for “${q}”`,
    onSelect: () => navigate(`/search?q=${q}`),
  }}
/>;
// data: [{ label: 'Contacts', items: [{ id: 'c1', label: 'Ada Lovelace', meta: 'Contact', href: '/contacts/c1' }] }]
```

- The first row is highlighted every time the set of ids changes (so Enter opens the top hit); rebuilding `results` inline with the same ids keeps the highlight.
- ↑ / ↓ move the highlight and wrap, including the `footerAction` row.
- Enter or click calls `onSelect(item, groupIndex)`, closes the panel and keeps the input text (clear it in `onSelect` if wanted). A `footerAction` row calls its own `onSelect`.
- Esc closes the panel (innermost overlay first) and does not clear the input; blur closes it.
- Rows with `href` render as links: Cmd/Ctrl/Shift/middle-click and "copy link" work natively; a plain click or Enter still calls `onSelect` (the library prevents the default navigation).
- The panel is at least as wide as the pill, height-capped, and scrolls itself — do not wrap results in `<ScrollArea>`.
- The panel shows only for a non-empty query, a loading state, or when there are results. `loading` keeps existing results visible and sets `aria-busy`.
- Result count, loading and empty states are announced via a live region. If `emptyMessage` is a non-string node, the live region announces the default `topBar.searchEmpty` instead — pass a string to have it announced. An empty-string `emptyMessage` falls back to the default.
- Groups with no items are not rendered, so you may pass them as-is.
- `open` / `defaultOpen` / `onOpenChange` control visibility if you need to; omit for uncontrolled.

#### When NOT to use

- ❌ Picking a form value from a list — use `<Select>`.
- ❌ Filter chips / multi-select facets — use `<OptionsPicker>`.
- ❌ A command palette in a modal — not covered by combobox mode.
- ❌ Left-side navigation column — use `<Rail>`.
- ❌ Page-local heading + actions — use `<PageHeader>`, not a TopBar.
- ❌ Action toolbar attached to a specific section — use a `<Cluster>` inside that section; TopBar is for the application's top chrome.
- ❌ Wrapping `<TopBar.Search>` in `<Popover>` to show results — use combobox mode (`results`).

#### Anti-patterns

- ❌ Wrapping the bar in another `position: sticky` container — the bar already sticks. Layered sticky parents stack at the wrong offset.
- ❌ Reaching for `<TopBar.IconButton>` outside the bar — it's a topbar-scoped size + indicator pattern. Use `<Button iconOnly variant="ghost">` for general icon buttons.
- ❌ Putting a `<Button variant="primary">` inside the bar — primary actions belong in the page body where they're discoverable; the topbar is for navigation, search, and global ambient actions only.
- ❌ Keying or remounting `<TopBar.Search>` as results arrive — toggling `results` between `undefined` and an array is fine, but remounting loses focus and open state.
- ❌ Duplicate `id`s across groups — ids must be unique across ALL groups (React keys, highlight tracking).
- ❌ Clearing the input inside `onChange` — it fights typing; clear in `onSelect` if you want that.
- ❌ Navigating in both `onSelect` and via the `<a>` default — the library already prevents the default on plain clicks; route only in `onSelect`.
- ❌ Relying on the indicator dot to communicate count to assistive tech — the dot is decorative (`aria-hidden`); put the count in the `aria-label` instead.

```tsx
// Right-aligned actions only — Start can be omitted; End still sits right.
<TopBar>
  <TopBar.End>
    <TopBar.IconButton aria-label="Settings"><Settings size={16} /></TopBar.IconButton>
  </TopBar.End>
</TopBar>

// Nested secondary toolbar — as="div" avoids stacking two <header> landmarks:
<TopBar as="div" aria-label="Filters">
  <TopBar.Start>…</TopBar.Start>
</TopBar>

// Search hotkey hint — array form renders one chip per key; string form one chip:
<TopBar.Search placeholder="Search contacts, deals…" hotkey={['⌘', 'K']} />
<TopBar.Search placeholder="Filter…" hotkey="/" />

// Soft-cue indicator tone:
<TopBar.IconButton aria-label="Maintenance scheduled" indicator indicatorTone="warning">
  <Wrench size={16} />
</TopBar.IconButton>
```

- `<TopBar.Start>` typically holds a brand mark, workspace switcher and/or `<TopBar.Search>`; `<TopBar.End>` trailing `<TopBar.IconButton>`s and the user `<Avatar>`.
- `<TopBar.Search>` is a 32px pill with a leading search icon; the native `type="search"` gives `role="searchbox"` and the browser's clear button. It has no keyboard-shortcut behaviour of its own.
- `<TopBar.IconButton>` is icon-only (the 32×32 size and `indicator` dot are bar-specific); for a labelled action use a regular `<Button>`.
- ❌ A submit button inside the search wrapper: read the value from `onKeyDown` / `onChange` on Enter.
- ❌ `placeholder` and `aria-label` set to different strings: the default aria-label IS the placeholder; override only when the placeholder is too terse alone.
- ❌ A search field in a form: use `<Input>`; the pill styling is specific to the bar.
