# `<Text>` — body / inline text

```tsx
<Text>Default body — block <p>, md, regular.</Text>
<Text as="span" size="sm" tone="muted">12m ago</Text>
<Text as="label" htmlFor="email" weight="medium">Email</Text>
<Text lineClamp={2}>A long description that wraps and ellipses after two lines.</Text>
<Text size="sm" tone="danger">Email is required.</Text>
```

- `as: 'p' | 'span' | 'div' | 'label'` (default `'p'`). Constrained string union — no polymorphic generic.
- `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'inherit'` (default `'md'`).
- `tone`: `default | muted | subtle | accent | danger | success | warning`. **`subtle` is deprecated (#521) and resolves to `muted`.** In LIGHT the two neutrals were indistinguishable — OKLab ΔE 0.0261 when #521 was filed, 0.0365 after #522's retune, against a 0.065 perceptibility floor — so one visible tier shipped under two names. In DARK they were 0.0707 apart, a real step, so **this deprecation changes dark-theme appearance**: `tone="subtle"` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That was the accepted trade — a tier that exists in one theme only is not a tier — but it is a visual change, not the removal of a duplicate. Use `muted`. The prop still works, so nothing breaks at the type or build level.
- `weight`: `regular | medium | semibold | bold` (default `regular`).
- `align`: `left | center | right` (default `left`).
- `truncate`: single-line ellipsis. `lineClamp: number`: multi-line ellipsis. `lineClamp` overrides `truncate`.
- **Use `<Text>` for every non-heading run.** No more `<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>`.
- **`size="inherit"`** — for a muted/toned inline run INSIDE a heading (e.g. `<Text as="span" size="inherit" tone="muted">ENG-5</Text>` at the start of a `<Title order={1}>` task name) that must keep the heading's size instead of shrinking to `md`. Font-size AND line-height both inherit from the parent.
