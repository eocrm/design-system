# `<Masonry>` — height-balanced masonry layout

```tsx
<Masonry minColumnWidth="220px" gap="md">
  {photos.map((p) => (
    <Image key={p.id} src={p.src} alt={p.alt} aspectRatio={p.ratio} />
  ))}
</Masonry>
```

<!-- props:start -->

## Props

| Prop             | Type         | Required | Default | Description                                                              |
| ---------------- | ------------ | -------- | ------- | ------------------------------------------------------------------------ |
| `gap`            | `MasonryGap` | no       | —       | `xs`(4) / `sm`(8) / `md`(12, default) / `lg`(16) / `xl`(24) / `2xl`(32). |
| `children`       | `ReactNode`  | no       | —       |                                                                          |
| `columns`        | `number`     | no       | —       | Fixed number of columns. Mutually exclusive with `minColumnWidth`.       |
| `minColumnWidth` | `string`     | no       | —       |                                                                          |
| …native          |              |          |         | plus native HTML attributes                                              |

<!-- props:end -->

Packs variable-height children into columns (greedy shortest-column-first) →
left→right reading order, balanced heights. Measures on the client + rebalances
via `ResizeObserver`.

- `columns: number` **xor** `minColumnWidth: string` (default `'240px'`, px).
- `gap`: `xs`|`sm`|`md` (default)|`lg`|`xl`|`2xl`.

**When NOT to use:** equal-height tiles → `<Grid>`; one column → `<Stack>`;
wrapping rows → `<Cluster>`. Display content only — rebalancing remounts children.
