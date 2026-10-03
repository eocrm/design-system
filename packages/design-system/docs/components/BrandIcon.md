# `<BrandIcon>` — third-party brand marks

```tsx
<Button variant="secondary">
  <BrandIcon name="google" size={16} /> Continue with Google
</Button>

// Standalone, labeled
<BrandIcon name="yandex" title="Yandex" size={24} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `'google' \| 'yandex'` | yes | — | Which brand mark to render. |
| `size` | `number` | no | — | Square pixel size (width = height). Defaults to `20`. |
| `title` | `string` | no | — | Accessible name. Omit (default) for a decorative icon beside a text label — the icon renders `aria-hidden`. Set it for a standalone icon (e.g. an icon-only button) → `role="img"` + `aria-label`. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

Full-color official brand marks for SSO buttons. Ships `google` + `yandex`.

- Decorative by default (`aria-hidden`); pass `title` for a labeled standalone icon (`role="img"`).

**When NOT to use:** generic UI glyphs → `lucide-react`. Don't recolor brand marks.

**Anti-pattern:** ❌ a decorative `BrandIcon` next to visible brand text AND a `title` double-announces ("Google Continue with Google"). Keep it `aria-hidden` (the default) beside a label.
