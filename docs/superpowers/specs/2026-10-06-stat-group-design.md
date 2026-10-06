# StatGroup / StatTile — design

Issue: eocrm/design-system#630. Status: approved 2026-10-06.

## Problem

eocrm dashboard widgets ("Key metrics", "Sales performance", future analytics)
show 1–8 KPI tiles inside one `DashboardWidget`. `DashboardWidget variant="kpi"`
covers exactly one value + trend per card; there is no primitive for a group, so
the app hand-composes `Grid` + `Cluster` + `IconTile` + `Text` with no trend.

## Decisions

- **Compound API**: `StatGroup` (grid container) + `StatTile` (one tile, an
  `<li>`, only valid inside a group).
- **No `DashboardWidget variant="kpi-group"`.** A group sits in
  `variant="standard"` (scroll body absorbs overflow). A variant would couple the
  card to stat data and duplicate the loading story.
- **Visual: filled tiles** (option B): subtle surface fill, `radius-md`, padding.
  Rejected plain cells (blur together when wrapped) and a divided stat bar
  (rules misplace when the grid wraps).
- **Sizes**: value `--font-size-3xl` semibold tabular-nums (matches the kpi
  variant); trend `--font-size-md`; label `--font-size-md` muted; footnote
  `--font-size-sm` muted. The kpi variant's own trend stays `sm` (not changed).

## API

```tsx
<DashboardWidget title="Key metrics">
  <StatGroup loading={isLoading} aria-label="Key metrics">
    <StatTile
      label="Pipeline value"
      value="€1.24M"
      trend={{ label: '12.4% vs previous period', direction: 'up' }}
      footnote="2 deals in other currencies not included"
      icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
    />
    <StatTile label="Win rate" value={null} />
  </StatGroup>
</DashboardWidget>
```

### `StatGroup` — `forwardRef<HTMLUListElement>`, extends `HTMLAttributes<HTMLUListElement>`

| Prop             | Type        | Default   | Notes                                                                                              |
| ---------------- | ----------- | --------- | -------------------------------------------------------------------------------------------------- |
| `minColumnWidth` | `string`    | `'11rem'` | Passed to `Grid` as `min(<value>, 100%)` so one tile shrinks instead of overflowing a narrow cell. |
| `gap`            | `GridGap`   | `'md'`    | Same scale as Grid.                                                                                |
| `loading`        | `boolean`   | `false`   | Tiles keep label + icon; value/trend become skeletons. Provided to tiles via context.              |
| `children`       | `ReactNode` | —         | `StatTile`s.                                                                                       |

Renders `<Grid as="ul" minColumnWidth=… gap=…>` (no `aria-busy`, deliberately).
Props spread last (Pattern A).

### `StatTile` — `forwardRef<HTMLLIElement>`, extends `Omit<HTMLAttributes<HTMLLIElement>, 'children'>`

| Prop       | Type                   | Notes                                                                         |
| ---------- | ---------------------- | ----------------------------------------------------------------------------- |
| `label`    | `ReactNode` (required) | e.g. "Pipeline value".                                                        |
| `value`    | `ReactNode` (required) | Pre-formatted. `null` / `undefined` → "—" + visually hidden "No data".        |
| `trend`    | `StatTrend`            | Alias of `DashboardWidgetTrend` (`label`, `direction`, `sentiment?`).         |
| `footnote` | `ReactNode`            | Small muted text.                                                             |
| `icon`     | `ReactNode`            | Typically an `IconTile`; rendered as-is beside the label. Hidden when narrow. |

`value` is required-but-nullable so "no data" is an explicit decision (`value={null}`).

## Shared trend (`src/components/_internal/Trend`)

Extract the kpi variant's trend markup: lucide `TrendingUp/TrendingDown/Minus`
(aria-hidden), visually hidden direction word, visible label, `data-sentiment`
defaulted from direction (up→positive, down→negative, flat→neutral).
`DashboardWidget` and `StatTile` both render it, passing their own `className`;
size and colours stay per-component tokens. i18n keys stay at
`dashboardWidget.trendUp/trendDown/trendFlat`: consumers may override them via
`I18nProvider overrides`, and a rename would silently drop those overrides.
`DashboardWidget` behaviour and markup are unchanged — covered by its existing tests.

## Accessibility

- DOM order = reading order: label, value, trend, footnote → "Pipeline value,
  €1.24M, Increase 12.4% vs previous period, 2 deals…". List semantics give
  "list, 4 items".
- `value == null` → visible "—" (`aria-hidden`) + `VisuallyHidden`
  `t('stat.noData')`.
- **Loading (Hard rule 10)**: loading is a property the user _arrives at_ while
  browsing tiles, so it lives in content: each tile's value slot renders a
  visually hidden `t('stat.loading')` in place of the value (skeletons are
  aria-hidden). No `aria-busy`: the per-tile hidden text already carries the state.
  Footnotes hide while loading (they describe absent data); a trend skeleton always shows. The `<ul>` carries `role="list"` (Safari drops list semantics on `list-style: none`). **No live region, deliberately**: a
  dashboard loads many widgets at once; per-widget announcements flood screen
  readers (same rationale as `DashboardWidget`, documented in JSDoc + docs).

## Narrow cells

Each tile is `container-type: inline-size`. Below ~160px tile width the value
drops to `--font-size-2xl` and the icon is hidden (`display: none`; decorative).
Column reflow itself is Grid's auto-fit.

## Styling / tokens

`StatTile.tokens.scss` — `--stat-tile-bg` (`--color-bg-muted`; `bg-subtle` is invisible on a white card), `--stat-tile-radius`,
`--stat-tile-padding`, `--stat-tile-gap`, label/value/trend/footnote size, weight
and colour, trend positive/negative/neutral (`--color-success`, `--color-danger`,
`--color-fg-muted`), narrow value size. No raw values; no layout properties on
the tile (Grid places it). Skeleton bars sized in tokens.

## Deliverables (Core invariant)

1. `StatGroup.test.tsx` / `StatTile.test.tsx`: list semantics, ref, className
   merge, prop spread, minColumnWidth clamping, loading (no aria-busy, skeletons,
   per-tile hidden text, labels kept), null value, trend sentiment default +
   override, footnote/icon render.
2. Playground `StatGroupDemo.tsx` (wide, narrow cell, loading, sentiment
   override, "—", in a DashboardWidget), wired into App route, navItems,
   ComponentsIndex, overviewSchematics, registry `ComponentName`.
3. `src/index.ts` exports `StatGroup`, `StatTile`, `StatGroupProps`,
   `StatTileProps`, `StatTrend`.
4. `docs/components/StatGroup.md` + `StatTile.md` (the props-table generator owns `<X>Props` by doc-name prefix, as with Radio/RadioGroup) + AI-PRIMER index lines;
   `npm run build:docs`.
5. CLUSTERS entry in `_meta/manifest.ts` and `scripts/generate-manifest.mjs`;
   `npm run build:manifest`.

## Out of scope (YAGNI)

Sparklines, clickable tiles, per-tile `loading`, `kpi-group` variant, a
compact-header option for `standard`.
