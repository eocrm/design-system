# Charts batch: DonutChart, marker icon gap + label colour, reference emphasis (DS-58) — design

**Status:** draft for approval · 2026-11-09
**Epic:** DS-58 · **Tasks:** DS-55, DS-56, DS-57 · **Branch:** `feat/charts-batch-ds58` (one PR)

## Decided by the user

- One branch, one PR for all three.
- DS-55 is a **new `DonutChart` component** (like `ScatterChart`), not a `Chart` type.
- Segment activation is an **`onSegmentClick(segment)` callback**; no `href`.
- Segment colour is a **palette slot only** (`color?: ChartSeriesColor`, 1–8), the same as Chart series. No semantic tones.
- The **centre shows the formatted total plus a caption**. Hovering or focusing a segment swaps the centre to that
  segment's value, percentage and label, then back. `showTotal={false}` turns the centre off.

## DS-55 — `DonutChart`

Need: eocrm's space Overview "Status overview" tile (EO-77): open and closed work per workflow stage, each stage linking
to a filtered list.

```tsx
<DashboardWidget variant="chart" title="Status overview">
  <DonutChart
    label="Work items by stage"
    segments={[
      { key: 'todo', label: 'To do', value: 12 },
      { key: 'doing', label: 'In progress', value: 5, color: 3 },
      { key: 'done', label: 'Done', value: 30, color: 2 },
    ]}
    formatValue={(n) => String(n)}
    centerLabel="work items"
    onSegmentClick={(s) => navigate(`/tasks?stage=${s.key}`)}
  />
</DashboardWidget>
```

### API

- `DonutSegment = { key: string; label: string; value: number; color?: ChartSeriesColor }`.
- Props:
  - `label: string` (required): the accessible name of the figure and the caption of its data table.
  - `segments: DonutSegment[]` (required).
  - `formatValue: (n: number) => string` (required): used for the centre, tooltip, announcement and table.
  - `centerLabel?: string`: the caption under the total, e.g. "work items". Defaults to translated "Total".
  - `showTotal?: boolean`: defaults to `true`.
  - `onSegmentClick?: (segment: DonutSegment) => void`.
  - `emptyMessage?: ReactNode` and `footnote?: ReactNode`, as on ScatterChart.
  - It forwards its ref to the root `<figure>` and spreads the remaining HTML attributes, matching ScatterChart's root.
- Exported from the package root with JSDoc, plus the docs page, playground demo, manifest cluster and AI-PRIMER line,
  per the Core invariant.

### Drawing

- An SVG ring that fills the cell responsively, as Chart and ScatterChart do. It is square and centred inside
  whatever box the parent gives it.
- Segments run clockwise from 12 o'clock in array order. A small gap token separates them, and the ring thickness
  is a token.
- Colours: `color` pins a palette slot. Segments without one fill the free slots in order, using the same assignment
  rule as Chart series.
- A segment below a visible minimum angle is still drawn at that minimum, so a tiny stage isn't invisible. Its real
  share is listed everywhere else.
- **Centre:**
  - It shows the total, formatted with `formatValue`, in large type, with `centerLabel` underneath.
  - On hover or focus it swaps to the segment's formatted value, its percentage (via `Intl.NumberFormat` percent,
    in the active locale), and its label.
- **Legend:**
  - A legend sits beside or below the ring (it reflows to the cell) and lists every segment with its swatch,
    label, value and percentage.
  - The legend is not a toggle. Hiding a slice of a whole changes what "100%" means.
  - When `onSegmentClick` is set, each legend entry is a button that does the same thing as the segment.

### Interaction and a11y

- Hovering a segment highlights it (other segments dim), shows a tooltip and swaps the centre.
- **Keyboard:** the figure is one tab stop (roving), as in Chart:
  - The arrow keys move across segments.
  - Each move announces "To do: 12, 26%" through the existing chart live-region pattern.
  - Enter or Space activates `onSegmentClick`.
  - Escape clears the inspection.
- **Without `onSegmentClick`:** segments are inspect-only and the legend is static text.
- **Data table:** a visually hidden `<table>` (the same toggle and pattern as Chart and ScatterChart) with the
  columns segment, value and share.
- **Empty state:** when there are no segments or every value is ≤ 0, show `emptyMessage`, or the translated default,
  instead of the ring.
- Segments with a value of 0 are listed in the legend and table but draw no arc.

### Non-goals

- Pie (a solid centre), half-donut or gauge. `CircularProgress` covers a single value.
- Nested rings, and labels drawn on the arcs.
- `href` segments, and a legend toggle.

### Anti-goals

- Meaning by colour alone. Every segment's label, value and share are in the legend and the table.
- Anything announced twice, or keyboard-unreachable activation.

## DS-56 — Chart marker icon gap + label colour

1. **Icon gap:**
   - A new token `--chart-marker-icon-gap` (spacing scale, small) puts space between the icon's bottom edge and the
     marker line or plot top.
   - The marker gutter height grows by that gap whenever any marker has an `icon`, so nothing clips. Charts whose
     markers have no `icon` are unchanged.
2. **Label colour:**
   - A marker with `color` draws its labels (`beside` and `top`) in that palette slot's ink, keeping the halo for
     contrast.
   - A marker without `color` keeps `--chart-marker-label-fg`.

Home Hub's `useChartMarkerColors.ts` shim can then be deleted.

## DS-57 — reference line emphasis

- Add `emphasis?: 'default' | 'strong'` to both `ScatterReference` and `ChartReferenceLine`.
- `'strong'` uses a new token, `--chart-reference-width-strong`, which maps to `--border-width-strong`. ScatterChart
  gets its own alias, `--scatter-reference-width-strong`.
- The legend dash swatch uses the same width.
- The default is unchanged.

Home Hub's `scatterReference.module.css` shim can then be deleted.

## My calls (the user can overrule)

- DonutChart has no legend toggle, because the shares are of a fixed whole.
- The minimum visible angle applies to non-zero segments only.
- There is no pie variant.
- Reference emphasis is a two-step enum, not a free width, so widths stay on tokens.

## Builder-check answers (my calls)

- **Home Hub shims** live in the Home Hub repo, not here. This PR changes the library only. The release note on
  DS-56 and DS-57 tells Home Hub which shim to delete.
- **Zero-value segments:**
  - Arrow-key roving skips them, and they get no legend button: there is nothing to highlight, and the list behind
    them would be empty.
  - They are still listed in the legend (as static text) and in the table.
- **More than 8 segments:**
  - Slots come from Chart's existing `assignSlots`. Past 8 they wrap and repeat, and a dev warning fires.
  - The docs say to group the tail into "Other".
  - Colour is never the only cue: every segment's label is in the legend and the table.
- **Negative or non-finite values:** treated as 0, with a dev warning. They don't count toward the total, and they
  are listed with their share at 0%.
- **Percentages:** always computed from the real total. The minimum visible angle only affects drawing.

## Left to the builder

- Ring thickness, gap and minimum-angle tokens.
- Where the legend sits at each width.
- The internal geometry module (`donutModel.ts`, mirroring `scatterModel.ts`).
- Reuse of the Chart tooltip, live-region and table pieces where they fit.
