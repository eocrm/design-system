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
| Prop | Type | Required | Description |
|---|---|---|---|
| `order` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | yes | Heading semantic level (1–6). REQUIRED — forces the consumer to think about heading hierarchy on the page. Drives both the rendered element (`<h1>`–`<h6>`) and the default visual size (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm). |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl'` | no | Visual size override. Defaults to the size for the given `order`. Use this when the semantic level and the visual size need to diverge — e.g. a small section title that's still an `<h2>` for screen readers. |
| `tone` | `'default' \| 'muted' \| 'subtle' \| 'accent' \| 'danger'` | no | Color tone. Defaults to `'default'` (full foreground). - `default` — `--color-fg` - `muted` — `--color-fg-muted` - `subtle` — **@deprecated: resolves to `muted`. Use `muted`.** In LIGHT theme the two neutrals were indistinguishable: OKLab ΔE 0.0261 when the deprecation was filed, 0.0365 after `--color-fg-muted` was retuned, against the 0.065 floor this library's perceptual gates use. In DARK they were 0.0707 apart — a real step — so **this deprecation changes dark-theme appearance**: `subtle` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That is the accepted trade (a tier that exists in one theme only is not a tier), but it is a visual change, not the removal of a duplicate. `--title-fg-subtle` now aliases `--title-fg-muted`, so nothing breaks at the type or build level; if you need the old dark value back, override `--title-fg-subtle`. - `accent` — `--color-accent` - `danger` — `--color-danger` |
| `weight` | `'regular' \| 'medium' \| 'semibold' \| 'bold'` | no | Font weight. Defaults to `'semibold'` (matches the most common heading weight across the existing mockups). |
| `truncate` | `boolean` | no | Truncate the title to a single line with ellipsis. Useful inside narrow cards or grid cells. Defaults to `false`. The full text remains in the accessibility tree — screen readers read the entire string. Don't additionally add `aria-label` to "compensate" for the visual clip. |
| `children` | `ReactNode` | yes | Title text content. |
| …native | | | plus native `<h1–h6>` attributes |

<!-- props:end -->

- `order: 1 | 2 | 3 | 4 | 5 | 6` — required. Renders `<h1>` … `<h6>` AND drives the default visual size.
- Default size map: `1→3xl`, `2→2xl`, `3→xl`, `4→lg`, `5→md`, `6→sm`. Override with `size` (same vocab: `xs | sm | md | lg | xl | 2xl | 3xl`).
- **Use `<Title>` for every heading in your UI.** Raw `<h1>` / `<h2>` is forbidden.

`size` decouples visual size from the semantic level (e.g. a nested section that needs a smaller-looking h2).

```tsx
// Heading + supporting paragraph in a Stack:
<Stack gap="xs">
  <Title order={1}>Dashboard</Title>
  <Text size="md" tone="muted">
    Pipeline summary for this week.
  </Text>
</Stack>
```

**When NOT to use**

- Body text: use `<Text>`.
- Inline emphasis: use `<strong>` / `<em>` / `<Text weight="semibold">`.
- Monospaced identifiers: use `<Code>`.
- Picking a font size without thinking about hierarchy: the required `order` prop forces the question of what level this heading is on the page.

**Anti-patterns**

- `<h2 className={styles.title}>`: use `<Title order={2}>`; consumer SCSS should never name a typography class.
- `<Title order={1} size="xs">`: usually a sign the heading hierarchy is wrong. Bump the order up instead of shrinking a low-order heading.
- Skipping heading levels (`order={1}` then `order={4}`) hurts screen-reader users; use sequential orders.
