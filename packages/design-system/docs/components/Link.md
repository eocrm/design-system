# `<Link>` — polymorphic styled anchor

Inline navigation link. Polymorphic via `as` — defaults to `<a>`, consumers pass a router's `<Link>` for SPA navigation. Three visual variants cover the inline use cases.

```tsx
import { Link } from '@eocrm/design-system';

// External — defaults to <a>
<Link href="https://docs.example.com">Documentation</Link>

// SPA route — pass router's Link
import { Link as RouterLink } from 'react-router-dom';
<Link as={RouterLink} to="/contacts">Contacts</Link>

// Variants
<Link href="/x">View all</Link>                                  {/* default — accent, hover-underline */}
<Link href="/x" variant="muted">Subdued nav</Link>               {/* breadcrumb-style */}
<Link href="/x" variant="subtle">Contact name</Link>             {/* fg color, hover-accent */}

// underline — independent of variant
<Link href="/x" underline="always">documentation</Link>          {/* running text / body copy — required, see below */}
<Link href="/x" variant="subtle" underline="none">Acme Inc</Link> {/* brand/nav — no hover underline */}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `'default' \| 'muted' \| 'subtle'` | no | Visual variant. See `LinkVariant` for descriptions. |
| `underline` | `'hover' \| 'always' \| 'none'` | no | Underline behavior. See `LinkUnderline` for descriptions. Default: `'hover'`. |
| `children` | `ReactNode` | no |  |
| `as` | `ElementType` | no |  |
| …native | | | plus native attributes of the `as` element (default `<a>`) |

<!-- props:end -->

- **Polymorphic**: `as={Component}` forwards all of Component's props with full TypeScript inference.
- **Library has no router dependency** — the `as` mechanism is consumer-driven.
- **Three variants**:
  - `default`: accent color, hover-underline. Inline CTA ("View all →").
  - `muted`: muted color, hover-accent. Low-emphasis nav (breadcrumb-style).
  - `subtle`: foreground color, hover-accent + underline. Dense-surface name links. **Not deprecated** — this is `Link`'s own variant and is unrelated to `Text`/`Title`'s `tone="subtle"`, which WAS deprecated. Same word, opposite status: a grep for "subtle deprecated" will land on the tone, and `PersonDisplay.Name` uses this variant deliberately.
- **`underline` prop** (`'hover'` | `'always'` | `'none'`, default `'hover'`) — orthogonal to `variant`:
  - `'hover'` (default, same as omitting it): each variant's existing look — `default`/`subtle` underline on hover only, `muted` never underlines.
  - `'always'`: underlined at rest and on hover, on every variant.
  - `'none'`: never underlined, not even on hover, on every variant.
  - **Links inside running text/body copy MUST use `underline="always"`.** The default accent-on-body contrast falls short of WCAG 1.4.1's 3:1 non-text threshold, so color alone isn't a sufficient cue — a link needs an underline to be told apart from surrounding words. `underline="none"` is for brand/nav links that want a variant's subtle color without the hover underline (the opposite end of the same axis).
- **No `disabled` state** — render `<span>` directly for non-clickable labels.

#### When NOT to use

- ❌ Action triggers (submit, open modal) → use `<Button>`.
- ❌ Mutually-exclusive switchers → use `<Tabs>` or `<ButtonGroup>`.
- ❌ "Link styled as button" → use `<Button variant="ghost">`.

#### Anti-patterns

- ❌ `<Link href="#" onClick={...}>` — fake hrefs break right-click "open in new tab".
- ❌ Forgetting `rel="noopener noreferrer"` on `target="_blank"` links.
- ❌ Using `variant="default"` for low-emphasis nav like breadcrumbs.
- ❌ A Link inside running text/body copy without `underline="always"` — color alone isn't a sufficient visual cue (WCAG 1.4.1).
