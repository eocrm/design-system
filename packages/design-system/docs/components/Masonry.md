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

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `gap` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | no | — | `xs`(4) / `sm`(8) / `md`(12, default) / `lg`(16) / `xl`(24) / `2xl`(32). |
| `children` | `ReactNode` | no | — |  |
| `columns` | `number` | no | — | Fixed number of columns. Mutually exclusive with `minColumnWidth`. |
| `minColumnWidth` | `string` | no | — | Min column width (px) for a responsive column count. Default `'240px'`. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

Packs variable-height children into columns (greedy shortest-column-first) →
left→right reading order, balanced heights. Measures on the client + rebalances
via `ResizeObserver`.

- `columns` **xor** `minColumnWidth` (px string, default `'240px'`) — pass one.

**When NOT to use:** equal-height tiles → `<Grid>`; one column → `<Stack>`;
wrapping rows → `<Cluster>`. Display content only — rebalancing remounts children.

Fixed column count:

```tsx
<Masonry columns={3} gap="lg">
  {notes.map((n) => (
    <Card key={n.id}>{n.body}</Card>
  ))}
</Masonry>
```

Before measurement (and without JS) children render round-robin across the columns. Heights re-balance on container resize and when child content settles (e.g. images finish loading).

- ❌ Interactive / stateful children (videos, focus-holding forms) — rebalancing re-parents items between columns, so React remounts them.
- ❌ Expecting a single top-to-bottom reading column — items are distributed across columns; order is left→right by placement.
