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
```

- **Compound API** — wrap each crumb in `<Breadcrumb.Item>`.
- **Auto-current** — last child gets `aria-current="page"` and renders as `<span>`. Override with explicit `current` prop.
- **Item is polymorphic** — same `as` pattern as Link.
- **Default separator** is `<ChevronRight size={14} />`. Override via the `separator` prop.
- **`<nav aria-label="Breadcrumb">` wrapper** — semantic landmark, AT-friendly.

#### When NOT to use

- ❌ Horizontal nav of equal-importance siblings → `<Tabs>`.
- ❌ Step-by-step progress → a dedicated Stepper (not shipped).
- ❌ Single-page apps with no parent hierarchy — omit Breadcrumb entirely.

#### Anti-patterns

- ❌ Making the current page clickable. Current items are non-link by design.
- ❌ Long trails (5+ levels) — wrap and become illegible.
- ❌ Building your own `<nav>` + chevron pattern. Use Breadcrumb.
