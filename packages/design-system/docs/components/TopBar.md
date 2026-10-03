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
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `as` | `'header' \| 'div'` | no | — | Element to render. Defaults to `'header'`. Pick `'div'` when the bar is nested inside another content area where a second `<header>` landmark would conflict with page semantics. |
| `aria-label` | `string` | no | — | Accessible label for the bar's landmark. Defaults to `t('topBar.label')` when omitted OR empty — an empty string is not an explicit name — so screen readers always announce a name for the region. Override when a page has multiple bars to disambiguate them. |
| `children` | `ReactNode` | no | — | Children of the bar — typically `<TopBar.Start>` + `<TopBar.End>`. The children area is open so consumers can render a single cluster, a single trailing element, or any other arrangement they need. |
| …native | | | | plus native HTML attributes |

### `TopBarEndProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| …native | | | | plus native `<div>` attributes |

### `TopBarIconButtonProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | Icon to render inside the button. Typically a single lucide icon (e.g. `<Bell size={16} />`). The wrapping button supplies the accessible name via `aria-label` — the icon itself is decorative. |
| `indicator` | `boolean` | no | — | Show a small dot in the upper-right corner of the button. Useful for "unread notifications", "pending updates", etc. The dot is purely visual (`aria-hidden`); the consumer is responsible for surfacing count / status text to assistive tech, typically via the button's `aria-label` or a hidden span. |
| `indicatorTone` | `'danger' \| 'warning' \| 'info' \| 'accent'` | no | — | Dot color. Defaults to `'danger'` (red). See `TopBarIndicatorTone` for the full option set. |
| `aria-label` | `string` | yes | — | **Required.** Accessible name for the icon-only button — without it, screen readers announce nothing. Phrase as an action (`'Notifications'`, `'Create new'`). Include count info here when the indicator is on (e.g. `'Notifications, 3 unread'`). |
| …native | | | | plus native `<button>` attributes |

### `TopBarSearchProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `hotkey` | `string \| string[]` | no | — | Optional hotkey hint shown after the input. Rendered internally via `<Kbd size="sm">`. Pass an **array** of key labels for a multi-key combo (`['⌘', 'K']` → two chips joined with `+`) or a single string for a one-chip hint (`'Esc'` → one chip). Note: `'⌘K'` is treated as a single chip — use the array form for multi-key combos. The hint is **visual only**; the library does not bind any keyboard shortcut to it. Omit for no hint. |
| `className` | `string` | no | — | `className` for the wrapping `<div>` (the search surface itself). The input's own className lives on the underlying `<input>` via the spread input-props (use the standard `inputClassName` pattern if you need to target the inner element specifically — not exposed in v1). |
| …native | | | | plus native `<input>` attributes |

### `TopBarStartProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- **Compound API** — `TopBar.Start` / `TopBar.End` / `TopBar.Search` / `TopBar.IconButton`.
- **Layout-owning primitive (Hard rule 4 exception)** — like `<Modal>`, `<Drawer>`, `<Page>`, `<Rail>`, the bar owns its own height (56px), sticky positioning, padding, background, and bottom border because that IS its job as a top-bar chrome.
- **`<TopBar.Start>`** — flex-grows (`flex: 1`) so a sibling `<TopBar.End>` is pushed to the right edge with no spacer needed.
- **`<TopBar.End>`** — shrinks to its content. Use for trailing actions + avatar.
- **`<TopBar.Search>`** — a real `<input type="search">` (browsers expose `role="searchbox"`). `placeholder` is consumer-controlled. `aria-label` defaults to the placeholder, then to `t('topBar.search')`. The `hotkey` prop renders a trailing `<kbd>` hint — purely **visual**; binding ⌘K to focus is the consumer's responsibility. Spread `value` / `onChange` through normally — they reach the underlying input. The component sets `autoComplete="off"` plus `data-1p-ignore` / `data-lpignore` / `data-form-type="other"` so password managers and browser autofill skip it.
- **i18n**: `topBar.label` (default `<header>` aria-label), `topBar.search` (default `<input>` aria-label fallback).

#### When NOT to use

- ❌ Left-side navigation column — use `<Rail>`.
- ❌ Page-local heading + actions — use `<PageHeader>`, not a TopBar.
- ❌ Action toolbar attached to a specific section — use a `<Cluster>` inside that section; TopBar is for the application's top chrome.
- ❌ Command-palette experience — `<TopBar.Search>` is a plain text input. Compose `<Popover>` + `<OptionsPicker>` for typeahead / result lists.

#### Anti-patterns

- ❌ Wrapping the bar in another `position: sticky` container — the bar already sticks. Layered sticky parents stack at the wrong offset.
- ❌ Reaching for `<TopBar.IconButton>` outside the bar — it's a topbar-scoped size + indicator pattern. Use `<Button iconOnly variant="ghost">` for general icon buttons.
- ❌ Putting a `<Button variant="primary">` inside the bar — primary actions belong in the page body where they're discoverable; the topbar is for navigation, search, and global ambient actions only.
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
