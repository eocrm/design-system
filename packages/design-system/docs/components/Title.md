# `<Title>` — semantic heading

```tsx
<Title order={1}>Dashboard</Title>
<Title order={2}>Recent activity</Title>
<Title order={3} tone="muted">Filter group</Title>
<Title order={2} size="lg">Visually compact h2</Title>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `order` | `TitleOrder` | yes | — | Heading semantic level (1–6). REQUIRED — forces the consumer to think about heading hierarchy on the page. Drives both the rendered element (`<h1>`–`<h6>`) and the default visual size (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm). |
| `size` | `TitleSize` | no | — | Visual size override. Defaults to the size for the given `order`. Use this when the semantic level and the visual size need to diverge — e.g. a small section title that's still an `<h2>` for screen readers. |
| `tone` | `TitleTone` | no | — | Color tone. Defaults to `'default'` (full foreground). - `default` — `--color-fg` - `muted` — `--color-fg-muted` - `subtle` — **@deprecated: resolves to `muted`. Use `muted`.** In LIGHT theme the two neutrals were indistinguishable: OKLab ΔE 0.0261 when #521 was filed, 0.0365 after #522 retuned `--color-fg-muted`, against the 0.065 floor this library's perceptual gates use. In DARK they were 0.0707 apart — a real step — so **this deprecation changes dark-theme appearance**: `subtle` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That is the accepted trade (a tier that exists in one theme only is not a tier), but it is a visual change, not the removal of a duplicate. `--title-fg-subtle` now aliases `--title-fg-muted`, so nothing breaks at the type or build level; if you need the old dark value back, override `--title-fg-subtle`. - `accent` — `--color-accent` - `danger` — `--color-danger` |
| `weight` | `TitleWeight` | no | — | Font weight. Defaults to `'semibold'` (matches the most common heading weight across the existing mockups). |
| `truncate` | `boolean` | no | — | Truncate the title to a single line with ellipsis. Useful inside narrow cards or grid cells. Defaults to `false`. The full text remains in the accessibility tree — screen readers read the entire string. Don't additionally add `aria-label` to "compensate" for the visual clip. |
| `children` | `ReactNode` | yes | — | Title text content. |
| …native | | | | plus native `<h1–h6>` attributes |

<!-- props:end -->

- `order: 1 | 2 | 3 | 4 | 5 | 6` — required. Renders `<h1>` … `<h6>` AND drives the default visual size.
- Default size map: `1→3xl`, `2→2xl`, `3→xl`, `4→lg`, `5→md`, `6→sm`. Override with `size` (same vocab: `xs | sm | md | lg | xl | 2xl | 3xl`).
- `tone`: `default | muted | subtle | accent | danger`. **`subtle` is deprecated and resolves to `muted`.** In LIGHT the two neutrals were indistinguishable — OKLab ΔE 0.0261 when #521 was filed, 0.0365 after #522's retune, against a 0.065 perceptibility floor — so one visible tier shipped under two names. In DARK they were 0.0707 apart, a real step, so **this deprecation changes dark-theme appearance**: `tone="subtle"` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That was the accepted trade — a tier that exists in one theme only is not a tier — but it is a visual change, not the removal of a duplicate. Use `muted`. The prop still works, so nothing breaks at the type or build level.
- `weight`: `regular | medium | semibold | bold` (default `semibold`).
- `truncate`: single-line ellipsis.
- **Use `<Title>` for every heading in your UI.** Raw `<h1>` / `<h2>` is forbidden.
