# `<BrandIcon>` — third-party brand marks

```tsx
<Button variant="secondary">
  <BrandIcon name="google" size={16} /> Continue with Google
</Button>
```

<!-- props:start -->

## Props

| Prop    | Type        | Required | Default | Description                                                                                                                                                                                        |
| ------- | ----------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`  | `BrandName` | yes      | —       | Which brand mark to render.                                                                                                                                                                        |
| `size`  | `number`    | no       | —       | Square pixel size (width = height). Defaults to `20`.                                                                                                                                              |
| `title` | `string`    | no       | —       | Accessible name. Omit (default) for a decorative icon beside a text label — the icon renders `aria-hidden`. Set it for a standalone icon (e.g. an icon-only button) → `role="img"` + `aria-label`. |
| …native |             |          |         | plus native HTML attributes                                                                                                                                                                        |

<!-- props:end -->

Full-color official brand marks for SSO buttons. Ships `google` + `yandex`.

- `name`: `'google' | 'yandex'`. `size`: px (default 20). Colors are brand-mandated (not themeable).
- Decorative by default (`aria-hidden`); pass `title` for a labeled standalone icon (`role="img"`).

**When NOT to use:** generic UI glyphs → `lucide-react`. Don't recolor brand marks.
