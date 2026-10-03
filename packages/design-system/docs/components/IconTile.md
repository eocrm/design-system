# `<IconTile>` — palette-colored icon frame

```tsx
<IconTile color="blue" icon={<Zap size={16} />} />
<IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
<IconTile color="green" label="Verified" icon={<Check size={16} />} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `ReactNode` | yes | — | The icon to frame — a lucide icon (sized by you, ~14–20px), custom SVG, or any ReactNode. Required; IconTile is purely an icon frame. |
| `color` | `PaletteColor` | no | — | Palette color for the tint — one of the 30 categorical colors. Defaults to `'slate'`. Categorical (visual identity), NOT semantic; for status use a `<Badge tone>` instead. |
| `size` | `IconTileSize` | no | — | Tile box size. `'xs'` 20 / `'sm'` 24 / `'md'` 32 (**default**) / `'lg'` 40 px. Sizes the tile box — size your icon child separately. `'xs'` brackets a 14px glyph with ~3px of padding so the tile sits inside a text / Badge / EntityChip row without growing it. `'inline'` is font-relative: a `1em` tile (the surrounding text's font-size) centred on the text's capitals, whose glyph the tile sizes to `0.75em` — a direct `<svg>` child's (a lucide icon's) own `size` is overridden; wrap nothing around the icon. Use it in text contexts (`EntityChip` `icon` / `trailing`, `Badge` rows, dense lists, running text) where even `xs` towers over the capitals. It follows `font-size`, so there is no size decision per call site. |
| `shape` | `IconTileShape` | no | — | `'square'` (radius-md, **default**) or `'circle'` (radius-full). |
| `label` | `string` | no | — | Accessible name. Omit (**default**) → the tile is decorative (`aria-hidden`), for use beside text that carries the meaning. Set it → `role="img"` + `aria-label`, for a standalone tile whose icon is the only indicator. |
| …native | | | | plus native `<span>` attributes |

<!-- props:end -->

- A small decorative tile framing one icon, tinted by a **Palette** `color` (one of the 30 categorical colors; default `'slate'`). For a person use `<Avatar>`; for text/status use `<Badge>`.
- `icon` (required ReactNode — you size it). `size`: `xs` 20 / `sm` 24 / `md` 32 (default) / `lg` 40 px (sizes the tile, not the icon). `xs` + a 14px icon sits inside a text / `Badge` / `EntityChip` row without growing it. `inline` is font-relative: a `1em` tile that follows the surrounding text size, aligned with it, and sizes the glyph itself to `0.75em`, overriding the `size` of a direct `<svg>` child such as a lucide icon. Use it in chips, badge rows and running text, e.g. `<EntityChip icon={<IconTile size="inline" color="violet" icon={<ListTodo />} />} …/>`. Don't use it for standalone tiles; it's only as big as the text. `shape`: `square` (default) / `circle`.
- Color is categorical (visual identity), **not** semantic — use `<Badge tone>` for status.
- A11y: decorative by default (`aria-hidden`); pass `label` to make it `role="img"` + `aria-label` when the icon is the only indicator.
- Not for a plain icon with no tinted container — render the lucide icon directly.
- ❌ A decorative IconTile as the ONLY indicator of meaning with no nearby text — pass a `label`.
- ❌ `size="xs"` in a chip or text row where it towers over the text (it is a fixed 20px) — use `size="inline"`.
