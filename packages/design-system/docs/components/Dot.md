# `<Dot>` — bare palette/tone colored circle

```tsx
// Palette color, paired with a label:
<Cluster gap="xs"><Dot color="violet" /> Design</Cluster>

// Semantic tone:
<Dot tone="success" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `color` | `PaletteColor` | no | — | One of the 30 `PaletteColor`s — renders the bare circle in that color's saturated `--color-palette-<name>-fg` token (the same color OptionsPicker groups and palette Badges use). Takes precedence over `tone`. |
| `tone` | `BadgeTone` | no | — | A semantic `BadgeTone` (`neutral` default / `info` / `success` / `warning` / `danger` / `purple`) — used when `color` is omitted. Neither set → `neutral`. |
| …native | | | | plus native `<span>` attributes |

<!-- props:end -->

- A bare, background-less 6px circle (`--size-badge-dot`) for color-coding affordances — a leading dot on a filter / `FilterChip`, a status indicator, a legend swatch. Unlike `<Badge dot>` it paints NO badge surface; it is just the dot.
- **Decorative**: `aria-hidden` by default (overridable). The dot alone conveys nothing to assistive tech — always pair it with a visible label / accessible text.
- **When NOT to use**: a status pill WITH text → use `<Badge>` (it owns a surface + label). The sole signal of meaning → color isn't an accessible signal on its own; accompany with text.
