# `<IconTile>` — palette-colored icon frame

```tsx
<IconTile color="blue" icon={<Zap size={16} />} />
<IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
<IconTile color="green" label="Verified" icon={<Check size={16} />} />
```

- A small decorative tile framing one icon, tinted by a **Palette** `color` (one of the 30 categorical colors; default `'slate'`). For a person use `<Avatar>`; for text/status use `<Badge>`.
- `icon` (required ReactNode — you size it). `size`: `xs` 20 / `sm` 24 / `md` 32 (default) / `lg` 40 px (sizes the tile, not the icon). `xs` + a 14px icon sits inside a text / `Badge` / `EntityChip` row without growing it. `inline` is font-relative: a `1em` tile that follows the surrounding text size, aligned with it, and sizes the glyph itself to `0.75em`, overriding the `size` of a direct `<svg>` child such as a lucide icon. Use it in chips, badge rows and running text, e.g. `<EntityChip icon={<IconTile size="inline" color="violet" icon={<ListTodo />} />} …/>`. Don't use it for standalone tiles; it's only as big as the text. `shape`: `square` (default) / `circle`.
- Color is categorical (visual identity), **not** semantic — use `<Badge tone>` for status.
- A11y: decorative by default (`aria-hidden`); pass `label` to make it `role="img"` + `aria-label` when the icon is the only indicator.
