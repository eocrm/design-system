# `<Divider>` — separator primitive

Thin rule between content sections. Horizontal (default) or vertical. Optional centered label slot. Three size tiers + solid/dashed variants.

```tsx
import { Divider } from '@eocrm/design-system';

// Default horizontal
<Divider />

// Vertical inside a Cluster (toolbar separator)
<Cluster gap="sm">
  <Button>Edit</Button>
  <Divider orientation="vertical" />
  <Button>Duplicate</Button>
</Cluster>

// Labeled (auth-form pattern)
<Divider>OR</Divider>

// Variants + sizes
<Divider variant="dashed" />
<Divider size="lg" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `orientation` | `DividerOrientation` | no | — | Layout direction. Defaults to `'horizontal'`. |
| `variant` | `DividerVariant` | no | — | Line style. Defaults to `'solid'`. |
| `size` | `DividerSize` | no | — | Line thickness tier. Defaults to `'sm'`. |
| `children` | `ReactNode` | no | — | Optional centered label rendered between two line segments. Common pattern: `<Divider>OR</Divider>` for auth-form section breaks. When `children` is set, the root becomes `<div role="separator">` instead of `<hr>` (HTML `<hr>` cannot have children). Works with `orientation="vertical"` but renders awkwardly (text wraps across two short line segments). Avoid vertical + label combos. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- **Default**: solid, size `'sm'` (1px), horizontal.
- **Labeled** dividers use `<div role="separator">` instead of `<hr>` because HTML `<hr>` can't have children.
- **Vertical** dividers stretch to the parent's height — works inside Cluster/Stack/Flex but needs a parent with known height. Falls back to `--space-3` minimum height as a sanity floor.
- **No spacing prop** — parent owns layout per Rule 4. Use Stack `gap` around the Divider.

#### When NOT to use

- ❌ Decorative under a heading → just style the heading's `border-bottom`.
- ❌ Between unrelated stacked sections → use Stack with `gap` instead.
- ❌ A tone-driven separator (warning/danger) → use `<Alert>` for persistent tone-tied messages.

#### Anti-patterns

- ❌ `<Divider>OR</Divider>` with `orientation="vertical"` — text wraps awkwardly across two short line segments.
- ❌ `<Divider size="lg" />` for casual section breaks. Reserve `lg` (3px) for strong visual hierarchy.
- ❌ Adding `margin` via inline `style`. The parent should own spacing.
