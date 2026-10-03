# `<Title>` — semantic heading

```tsx
<Title order={1}>Dashboard</Title>
<Title order={2}>Recent activity</Title>
<Title order={3} tone="muted">Filter group</Title>
<Title order={2} size="lg">Visually compact h2</Title>
```

- `order: 1 | 2 | 3 | 4 | 5 | 6` — required. Renders `<h1>` … `<h6>` AND drives the default visual size.
- Default size map: `1→3xl`, `2→2xl`, `3→xl`, `4→lg`, `5→md`, `6→sm`. Override with `size` (same vocab: `xs | sm | md | lg | xl | 2xl | 3xl`).
- `tone`: `default | muted | subtle | accent | danger`. **`subtle` is deprecated (#521) and resolves to `muted`.** In LIGHT the two neutrals were indistinguishable — OKLab ΔE 0.0261 when #521 was filed, 0.0365 after #522's retune, against a 0.065 perceptibility floor — so one visible tier shipped under two names. In DARK they were 0.0707 apart, a real step, so **this deprecation changes dark-theme appearance**: `tone="subtle"` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That was the accepted trade — a tier that exists in one theme only is not a tier — but it is a visual change, not the removal of a duplicate. Use `muted`. The prop still works, so nothing breaks at the type or build level.
- `weight`: `regular | medium | semibold | bold` (default `semibold`).
- `truncate`: single-line ellipsis.
- **Use `<Title>` for every heading in your UI.** Raw `<h1>` / `<h2>` is forbidden.
