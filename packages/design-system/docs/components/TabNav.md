# `TabNav` — tab-styled page sub-navigation

**TL;DR:** A `<nav>` of links that looks exactly like horizontal `Tabs`: same type, sizes, sliding underline and overflow scroll. Each item is a real link to its own page; the current one carries `aria-current="page"`. Use it for route-level sub-navigation (Pet Control: Today / Trends / Calendar / Manage; a record: Overview / Activity / Files).

```tsx
import { TabNav } from '@eocrm/design-system';
import { NavLink } from 'react-router-dom';

// Router links: NavLink sets aria-current="page" itself — no `current` needed.
<TabNav aria-label="Pet Control">
  <TabNav.Link as={NavLink} to="/pets/today">Today</TabNav.Link>
  <TabNav.Link as={NavLink} to="/pets/trends">Trends</TabNav.Link>
  <TabNav.Link as={NavLink} to="/pets/calendar">Calendar</TabNav.Link>
  <TabNav.Link as={NavLink} to="/pets/manage" trailing={<Badge tone="danger">2</Badge>}>
    Manage
  </TabNav.Link>
</TabNav>

// Plain anchors: mark the current page yourself.
<TabNav aria-label="Record sections">
  <TabNav.Link href="/deals/42">Overview</TabNav.Link>
  <TabNav.Link href="/deals/42/activity" current>Activity</TabNav.Link>
</TabNav>
```

- **Semantics:** `<nav aria-label>` → `<ul role="list">` → `<li>` → link. No `tab`/`tablist`/`tabpanel` roles and no roving tabindex: every link is an ordinary `Tab` stop, `Enter` follows it.
- **Name the landmark.** Pass `aria-label` (or `aria-labelledby`); a dev warning fires without one.
- **Current page:** `current` sets `aria-current="page"`. Styling and the underline key off the DOM attribute, so a `NavLink` (or any link) that sets `aria-current` itself works without `current`, also when the route changes while the strip stays mounted.
- **`TabNav.Link` is polymorphic** (`as`, default `a`, like `Link`); its props and `ref` go to the link element. `leading` / `trailing` render inside the link next to the label (an icon, a count `Badge`); they are not `aria-hidden`.
- **Overflow:** narrow screens scroll the strip horizontally (scrollbar only on real overflow); the current link is scrolled into view when it is clipped.
- **Touch:** links are at least `--size-touch` tall on coarse pointers.
- **Theming:** `--tab-nav-*` tokens alias the `--tabs-*` tokens, so theming `Tabs` themes `TabNav`.

**When NOT to use**

- Views inside one page that share a URL (switching panels, no navigation): use `Tabs`.
- App-level primary navigation: use the sidebar / `Rail`.
- A trail of ancestors: use `Breadcrumb`.
- More links than fit comfortably even with scrolling: rethink the IA; there is no overflow dropdown.

<!-- props:start -->

## Props

### `TabNavProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `aria-label` | `string` | no | Accessible name of the `<nav>` landmark (e.g. `"Pet Control"`, `"Record sections"`). Required in practice — pass this or `aria-labelledby`; a dev warning fires when neither is set. |
| `children` | `ReactNode` | no | `TabNav.Link` children, in display order. |
| …native | | | plus native HTML attributes |

### `TabNavLinkProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `as` | `ElementType` | no | Element or component to render the link as (e.g. a router `NavLink`); its props are typed and forwarded. Default `'a'`. |
| `current` | `boolean` | no | Marks this link as the current page: sets `aria-current="page"`, which draws the active colour and moves the underline here. Leave unset when the `as` component sets `aria-current` itself (react-router's `NavLink` does); TabNav picks that up from the DOM. Default `false`. |
| `leading` | `ReactNode` | no | Adornment before the label (an icon, a status dot). Rendered as-is, NOT `aria-hidden`: mark decorative nodes `aria-hidden` yourself; meaningful ones join the link's accessible name. |
| `trailing` | `ReactNode` | no | Adornment after the label (a count `Badge`). Rendered as-is — same a11y note as `leading`. |
| `children` | `ReactNode` | no | The link label. |
| `className` | `string` | no | Extra class on the link — a string only (a router `NavLink`'s function form is not supported); style the active link through `[aria-current='page']` instead. |
| …native | | | plus native attributes of the `as` element (default `<a>`) |

<!-- props:end -->
