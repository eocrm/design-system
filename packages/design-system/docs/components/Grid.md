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

<!-- props:start -->

## Props

### `GridProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `gap` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | no | Gap between cells. `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32). Same scale as Stack and Cluster. |
| `alignItems` | `'start' \| 'center' \| 'end' \| 'stretch'` | no | Cross-axis (vertical within row) alignment of each cell. Default browser behavior is `stretch`; omit to use the default. Useful for cards of varying intrinsic height. |
| `justifyItems` | `'start' \| 'center' \| 'end' \| 'stretch'` | no | Main-axis (horizontal within track) alignment of each cell. Default browser behavior is `stretch`; omit to use the default. |
| `as` | `'div' \| 'section' \| 'ul' \| 'ol' \| 'nav' \| 'main' \| 'aside' \| 'article' \| 'header' \| 'footer'` | no | Element to render. Default `'div'`. Limited to `div`, `section`, `ul`, `ol`, `nav`, `main`, `aside`, `article`, `header`, `footer` rather than fully polymorphic. |
| `columns` | `number` | no | Fixed number of equal-width columns. Mutually exclusive with `minColumnWidth`. |
| `minColumnWidth` | `string` | no | Minimum column width for auto-fit responsive layout. Columns reflow based on container width — no breakpoints needed. CSS length string like `'240px'` or `'15rem'`. Defaults to `'240px'` when neither `columns` nor `minColumnWidth` is provided. |
| `collapseBelow` | `CollapseBreakpoint \| Partial<Record<CollapseBreakpoint, number>>` | no | Collapse to a single visual column when the GRID'S OWN width (container query, not viewport) drops below the preset: `sm` 480px / `md` 640px / `lg` 768px. Every child spans the full row below the threshold — `Grid.Item` spans included. Only valid with `columns` (auto-fit grids already reflow). Consumer inline `style={{ gridColumn }}` on a child still wins below the threshold (inline beats any stylesheet rule) — don't do that; use `Grid.Item span` instead. ❌ Anti-pattern: a `collapseBelow` grid must get its width from its parent. `container-type: inline-size` zeroes the grid's contribution to intrinsic sizing, so in an intrinsic-width context (`Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`) it renders at width 0 — give the parent a concrete width instead. Whichever element carries the containment also becomes the containing block for absolutely-positioned descendants (layout containment) — the grid itself for the string form, the wrapper below for the map form. Also accepts a graduated breakpoint→columns map, e.g. `collapseBelow={{ md: 6, sm: 1 }}`: below 640px the grid re-templates to 6 columns (item spans clamp to fit — a span wider than the step becomes a full row), and below 480px to a single column. Use when jumping straight from N columns to 1 wastes tablet widths. When several breakpoints match, the smallest wins. Only `Grid.Item` children get span clamping; plain children auto-place into the step's tracks. ⚠️ The map form (and ONLY the map form) renders an extra wrapper `<div>` around the grid element — it carries `container-type: inline-size`, because re-templating the grid requires querying an ancestor, not the grid itself. Consequences: a `> child` CSS selector aimed at the grid from its parent now hits the wrapper instead, and layout the parent applies to "the Grid" (`flex: 1`, `grid-column`, `align-self` via `className`) lands on the grid *inside* the wrapper, where the parent's layout can't see it — put that layout on an element you control around the Grid. `ref`, `className`, `style`, `as` and all spread props stay on the grid element. |
| …native | | | plus native HTML attributes |

### `GridItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `span` | `GridItemSpan` | no | Column span. Omit for a single track (auto placement). - number — `span N` of the parent's `columns`. - `'25%' \| '33%' \| '50%' \| '67%' \| '75%'` — fractions of a 12-column grid; use with `columns={12}` (other counts won't produce the named fraction — documented, not validated). - `'100%'` / `'full'` — the entire row; safe with any Grid variant. |
| `as` | `'div' \| 'li' \| 'section' \| 'article' \| 'aside'` | no | Element to render. Default `'div'`. Use `'li'` inside `<Grid as="ul">`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **One of `columns` or `minColumnWidth`, not both.** TypeScript enforces it.

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
- ❌ `<Grid>` for a list of clickable items — semantics matter; use `<ul><li>` or `<Grid as="ul">` with `<li>` children.
- ❌ Inline `gridTemplateColumns` in `style` instead of `columns` / `minColumnWidth` — it bypasses tokens and the responsive default.
- ❌ A numeric `Grid.Item` `span` larger than `columns` — it overflows into implicit tracks, like fraction spans on a non-12 grid.
- Under a map-form `collapseBelow`, a `Grid.Item` span wider than a step's column count becomes a full row.

```tsx
// Photo gallery — auto-fit with a smaller minimum
<Grid minColumnWidth="160px" gap="sm">{photos.map((p) => <img key={p.id} src={p.src} />)}</Grid>

// Semantic element via `as`
<Grid as="section" columns={3} gap="md" aria-labelledby="dashboard-title">...</Grid>
```
