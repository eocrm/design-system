# `<BrandIcon>` — third-party brand marks

```tsx
<Button variant="secondary">
  <BrandIcon name="google" size={16} /> Continue with Google
</Button>
```

Full-color official brand marks for SSO buttons. Ships `google` + `yandex`.

- `name`: `'google' | 'yandex'`. `size`: px (default 20). Colors are brand-mandated (not themeable).
- Decorative by default (`aria-hidden`); pass `title` for a labeled standalone icon (`role="img"`).

**When NOT to use:** generic UI glyphs → `lucide-react`. Don't recolor brand marks.
