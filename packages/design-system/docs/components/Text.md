# `<Text>` — body / inline text

```tsx
<Text>Default body — block <p>, md, regular.</Text>
<Text as="span" size="sm" tone="muted">12m ago</Text>
<Text as="label" htmlFor="email" weight="medium">Email</Text>
<Text lineClamp={2}>A long description that wraps and ellipses after two lines.</Text>
<Text size="sm" tone="danger">Email is required.</Text>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `htmlFor` | `string` | no | — | Associates a `<label>` with its form control. Only meaningful when `as="label"` — passes through as the native `for` attribute. |
| `as` | `TextAs` | no | — | Rendered element. Defaults to `'p'` (block, default body text). Use `'span'` for inline runs, `'div'` for block containers that can't be a `<p>` (e.g. when the body needs nested block-level elements that React would warn about inside `<p>`), `'label'` for form labels (pair with `htmlFor`). |
| `size` | `TextSize` | no | — | Visual size. Defaults to `'md'` (body text). - `xs` — 11px, dense metadata / captions - `sm` — 12px, small body / labels - `md` — 14px, body text (default) - `lg` — 16px, large body / lead text - `xl` — 20px, very large body (rare) - `inherit` — no fixed size; font-size AND line-height inherit from the parent. For inline runs inside a heading (`as="span"` inside a `<Title>` / `<PageHeader.Title>`) that must keep the heading's size — e.g. a muted task-key prefix. Tone / weight still apply — font-weight stays Text's own (default `regular`), it does NOT inherit; pass `weight` to match the heading if needed. |
| `tone` | `TextTone` | no | — | Color tone. Defaults to `'default'`. - `default` — `--color-fg` - `muted` — `--color-fg-muted` (for secondary copy) - `subtle` — **@deprecated: resolves to `muted`. Use `muted`.** In LIGHT theme the two neutrals were indistinguishable: OKLab ΔE 0.0261 when #521 was filed, 0.0365 after #522 retuned `--color-fg-muted`, against the 0.065 floor this library's perceptual gates use. In DARK they were 0.0707 apart — a real step — so **this deprecation changes dark-theme appearance**: `subtle` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That is the accepted trade (a tier that exists in one theme only is not a tier), but it is a visual change, not the removal of a duplicate. `--text-fg-subtle` now aliases `--text-fg-muted`, so nothing breaks at the type or build level; if you need the old dark value back, override `--text-fg-subtle`. - `accent` — `--color-accent` - `danger` / `success` / `warning` — state-coded text |
| `weight` | `TextWeight` | no | — | Font weight. Defaults to `'regular'`. |
| `align` | `TextAlign` | no | — | Text alignment. Defaults to `'left'`. |
| `truncate` | `boolean` | no | — | Truncate to a single line with ellipsis. Defaults to `false`. Use inside narrow containers (table cells, card list rows). Mutually exclusive with `lineClamp` — if both are set, `lineClamp` wins. |
| `lineClamp` | `number` | no | — | Clamp to N lines with ellipsis (uses `-webkit-line-clamp`). Defaults to `undefined`. Overrides `truncate` when set. Example: `lineClamp={2}` for a 2-line description that ellipses on the third. If you also pass `style.WebkitLineClamp`, the `lineClamp` prop takes precedence — the component merges the dynamic line-clamp value into `style` AFTER spreading your `style`, so the prop wins. |
| `children` | `ReactNode` | yes | — | Text content. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- `as: 'p' | 'span' | 'div' | 'label'` (default `'p'`). Constrained string union — no polymorphic generic.
- `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'inherit'` (default `'md'`).
- `tone`: `default | muted | subtle | accent | danger | success | warning`. **`subtle` is deprecated and resolves to `muted`.** In LIGHT the two neutrals were indistinguishable — OKLab ΔE 0.0261 when #521 was filed, 0.0365 after #522's retune, against a 0.065 perceptibility floor — so one visible tier shipped under two names. In DARK they were 0.0707 apart, a real step, so **this deprecation changes dark-theme appearance**: `tone="subtle"` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That was the accepted trade — a tier that exists in one theme only is not a tier — but it is a visual change, not the removal of a duplicate. Use `muted`. The prop still works, so nothing breaks at the type or build level.
- `weight`: `regular | medium | semibold | bold` (default `regular`).
- `align`: `left | center | right` (default `left`).
- `truncate`: single-line ellipsis. `lineClamp: number`: multi-line ellipsis. `lineClamp` overrides `truncate`.
- **Use `<Text>` for every non-heading run.** No more `<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>`.
- **`size="inherit"`** — for a muted/toned inline run INSIDE a heading (e.g. `<Text as="span" size="inherit" tone="muted">ENG-5</Text>` at the start of a `<Title order={1}>` task name) that must keep the heading's size instead of shrinking to `md`. Font-size AND line-height both inherit from the parent.

```tsx
// Muted inline run inside a heading — keeps the heading's font size:
<Title order={1}>
  <Text as="span" size="inherit" tone="muted">ENG-5</Text> Fix login
</Title>

// Body copy under a heading, spaced with Stack — the canonical CRM-page shape:
<Stack gap="xs">
  <Title order={2}>Pipeline</Title>
  <Text tone="muted">Active deals for Q3.</Text>
</Stack>
```

If you need a size or tone the primitive doesn't expose, that is a token-vocabulary conversation, not a reason to skip the component.

**When NOT to use**

- Heading text: use `<Title order={N}>`.
- Inline code: use `<Code>`.
- Clickable text / action triggers: use `<Button>` or `<Link>`.
- Pure layout containers: use `<Stack>` / `<Cluster>` / `<Grid>`.

**Anti-patterns**

- `<Text style={{ color: '#someHex' }}>`: pick a tone from the whitelist; the whitelist is the contract.
- `<Text as="h2">`: Text doesn't accept heading tags; use `<Title order={2}>`.
- Wrapping a `<Title>` in `<Text>` for tone/weight tweaks: pass tone/weight to the `<Title>`. `size="inherit"` is for runs INSIDE a heading, not for wrapping it.
- Nesting `<Text>` in another `<Text>` with the default `as="p"`: the inner `<p>` inside the outer `<p>` is invalid HTML and triggers React's DOM nesting warning. Use `<Text as="span" tone="...">` for an inline override inside a paragraph.
