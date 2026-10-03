# `<Grid>` — 2D layout primitive

```tsx
// Auto-fit responsive (default) — columns reflow by container width.
<Grid gap="md">
  {cards.map(c => <Card key={c.id}>...</Card>)}
</Grid>

// Fixed N equal columns.
<Grid columns={2} gap="lg">
  <Input label="First name" />
  <Input label="Last name" />
</Grid>

// Dashboard widgets — 12-column base, fraction spans, collapses under 640px.
<Grid columns={12} gap="md" collapseBelow="md">
  <Grid.Item span="25%"><Card>KPI</Card></Grid.Item>
  <Grid.Item span="75%"><Card>Chart</Card></Grid.Item>
  <Grid.Item span="33%"><Card>List</Card></Grid.Item>
  <Grid.Item span="67%"><Card>Table</Card></Grid.Item>
  <Grid.Item span="100%"><Card>Footer row</Card></Grid.Item>
</Grid>
```

- **One of `columns` or `minColumnWidth`, not both.** TypeScript enforces it.
- **Default** when neither is set: `minColumnWidth="240px"`. Naturally responsive without breakpoints.
- **Gap scale:** `xs` (4px) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32) — same as Stack and Cluster.
- **alignItems / justifyItems** — pass `start` / `center` / `end` / `stretch` to override the default browser stretch on either axis. Useful for cards of varying intrinsic height.
- **`as` prop** — 10 common semantic elements (`div` default, `section`, `ul`, `ol`, `nav`, `main`, `aside`, `article`, `header`, `footer`). Limited rather than fully polymorphic to keep types simple.

**`<Grid.Item span>` — per-cell column span:**

| `span`              | Tracks (12-col grid)                                      |
| ------------------- | --------------------------------------------------------- |
| `'25%'`             | 3/12                                                      |
| `'33%'`             | 4/12                                                      |
| `'50%'`             | 6/12                                                      |
| `'67%'`             | 8/12                                                      |
| `'75%'`             | 9/12                                                      |
| `'100%'` / `'full'` | full row (`1 / -1`), safe in ANY grid                     |
| number              | `span N` tracks of whatever `columns` the parent declares |

Fractions assume a 12-column grid — pair them with `columns={12}` on the parent `<Grid>`. A numeric `span` is relative to the parent's actual `columns` count, no 12-col assumption. `Grid.Item` is opt-in; plain children remain valid Grid cells.

**`collapseBelow` — collapse to one column below a width preset:**

Only valid on a fixed-`columns` Grid (auto-fit grids already reflow). Presets: `'sm'` 480px / `'md'` 640px / `'lg'` 768px. This is a **container query on the Grid's own width, not the viewport** — it fires based on the space the Grid itself has, not the browser window, so it collapses correctly inside a narrow sidebar or split pane even on a wide screen — provided the pane gives the grid a definite width. Below the threshold every child spans the full row, `Grid.Item` spans included.

Also takes a graduated breakpoint→columns map instead of a single string, for a step-down rather than straight-to-1-column collapse — `Grid.Item` spans clamp to fit each step:

```tsx
<Grid columns={12} gap="md" collapseBelow={{ md: 6, sm: 1 }}>
```

The map form — and only the map form — renders an extra wrapper `<div>` around the grid element, because re-templating the grid needs the size container on an ancestor (a container query never restyles its own container). `ref`, `className`, `style`, `as` and spread props all stay on the grid element, so the only thing that changes for a consumer is the DOM: a `> child` selector aimed at the Grid from its parent now hits the wrapper, and layout meant for "the Grid" (`flex: 1`, `grid-column`, `align-self` via `className`) lands inside the wrapper where the parent can't see it — put that layout on your own element around the Grid. The string form's DOM is unchanged.

**Anti-patterns:**

- ❌ Grid for a single column of vertical flow — use Stack.
- ❌ Grid for unaligned wrapping rows (toolbars, tag lists) — use Cluster.
- ❌ `<Grid columns="auto 1fr">` strings — not supported in v1. For asymmetric / named tracks, use raw CSS Grid via className.
- ❌ `<Grid as="ul">` with non-`<li>` children. The component doesn't enforce list semantics; consumers must.
- ❌ Fraction spans (other than `'100%'`) on a Grid whose `columns` isn't 12 — the span is a fixed track count, so it overflows into implicit tracks on a non-12 grid.
- ❌ A `collapseBelow` grid in an intrinsic-width context (`Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`). `container-type: inline-size` makes the grid contribute zero intrinsic width, so it renders at width 0 — the grid must get its width from its parent; give the aside a concrete width instead. The element carrying the containment also becomes the containing block for absolutely-positioned descendants (layout containment) — the grid itself for the string form, the wrapper for the map form; same box geometry either way.
