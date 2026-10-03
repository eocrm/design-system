# `<Breadcrumb>` — navigation trail

Compound (Breadcrumb.Item) navigation breadcrumb. Last child is auto-marked as the current page (`<span aria-current="page">`); non-last items are muted Links. Default separator is a ChevronRight icon.

```tsx
import { Breadcrumb, Link } from '@eocrm/design-system';
import { Link as RouterLink } from 'react-router-dom';

<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>      {/* auto-current */}
</Breadcrumb>

// Custom separator
<Breadcrumb separator={<Slash size={12} />}>
  <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
  <Breadcrumb.Item>B</Breadcrumb.Item>
</Breadcrumb>

// External crumb (default <a>)
<Breadcrumb>
  <Breadcrumb.Item href="https://docs.example.com">Docs</Breadcrumb.Item>
  <Breadcrumb.Item>This page</Breadcrumb.Item>
</Breadcrumb>
```

<!-- props:start -->

## Props

### `BreadcrumbProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | One or more `<Breadcrumb.Item>` children. The component injects the separator between items and auto-marks the last child as current (renders as `<span aria-current="page">` instead of a link). |
| `separator` | `ReactNode` | no | — | Custom separator between items. Defaults to a small `<ChevronRight>` lucide icon. The separator renders inside a `<span aria-hidden="true">` wrapper automatically. |
| `ariaLabel` | `string` | no | — | Visible label for the `<nav>` element. Defaults to the i18n value at `breadcrumb.ariaLabel` (`'Breadcrumb'` in English) when omitted OR empty — an empty string is not an explicit name, so it takes the default too. Override when multiple breadcrumb instances coexist on the same page. |
| `className` | `string` | no | — | Pass-through className applied to the `<nav>` wrapper. |

### `BreadcrumbItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `as` | `ElementType` | no | — |  |
| `current` | `boolean` | no | — | Mark this item as the current page. Forced to `true` automatically for the last child of `<Breadcrumb>` (auto-current). When `true`, the item renders as `<span aria-current="page">` and ignores all link-related props (`as`, `to`, `href`, etc.). |
| `children` | `ReactNode` | no | — |  |
| `className` | `string` | no | — |  |
| …native | | | | plus native attributes of the `as` element (default `<a>`) |

<!-- props:end -->

- **Compound API** — wrap each crumb in `<Breadcrumb.Item>`.
- **Auto-current** — last child gets `aria-current="page"` and renders as `<span>`. Override with explicit `current` prop.
- **Item is polymorphic** — same `as` pattern as Link. It is not `forwardRef`-wrapped because the return shape varies (`<span>` for current, `<Link>` for non-current); for a ref to a specific crumb, render the underlying link manually inside an Item, or use Link directly.
- Separated by a customizable icon in an `<ol>` inside the `<nav>`.
- **Default separator** is `<ChevronRight size={14} />`. Override via the `separator` prop.
- **`<nav aria-label="Breadcrumb">` wrapper** — semantic landmark, AT-friendly.

#### When NOT to use

- ❌ Horizontal nav of equal-importance siblings → `<Tabs>` or `<ButtonGroup>`.
- ❌ Step-by-step progress → a dedicated Stepper (not shipped).
- ❌ Single-page apps with no parent hierarchy — omit Breadcrumb entirely.

#### Anti-patterns

- ❌ Making the current page clickable. Current items are non-link by design.
- ❌ Long trails (5+ levels) — wrap and become illegible.
- ❌ Building your own `<nav>` + chevron pattern. Use Breadcrumb.
