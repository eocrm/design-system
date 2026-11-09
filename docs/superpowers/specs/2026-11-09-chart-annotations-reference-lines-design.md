# Chart: category annotations + horizontal reference lines (DS-54) — design

**Status:** draft for approval · 2026-11-09
**Epic:** DS-54 · **Tasks:** DS-52, DS-53 · **Branch:** `feat/chart-annotations-reference-ds54` (one PR)

Both come from Home Hub's Pet Control dashboard widget "Eaten over time" (a `bar` / `stacked-bar` Chart).
Home Hub currently overlays both with a shim, `frontend/src/shared/ds-shims/ChartBarBadge.tsx`, that reads
the rendered SVG. Success: that shim is deleted.

## Decided by the user

- One branch, one PR for both.
- **DS-52 glyphs are a fixed set drawn by the chart:** `glyph: 'up' | 'down' | 'dot'` plus a `tone`, with a
  required `label`. No free React nodes or emoji text, so sizing, theming and collision handling stay in
  the library.

## DS-52 — `annotations`

```tsx
<Chart
  type="bar"
  annotations={[{ at: 'Sun', glyph: 'up', tone: 'success', label: 'Ahead of usual pace' }]}
/>
```

- `annotations?: ChartAnnotation[]`, where
  `ChartAnnotation = { key?: string; at: string; glyph: 'up' | 'down' | 'dot'; tone: 'success' | 'danger' | 'warning' | 'neutral'; label: string }`.
  `at` is a category label, as for markers. An annotation naming an unknown category is ignored with a dev
  warning, the same as markers.
- **Drawing:**
  - The glyph is a small SVG shape: a filled triangle for up or down, a circle for dot.
  - It is coloured with the tone's semantic foreground token, so it is legible in light and dark.
  - The shape carries the meaning even without colour.
  - Its size comes from a component token.
  - It is decorative (`aria-hidden`).
- **Placement:**
  - Above the top of the category's tallest mark: the stack top on `stacked-bar`, the tallest bar in the
    group on `bar`, the highest point on `line`/`area`.
  - With `valueLabels` on, it sits just after the value label on the same baseline. Otherwise it sits above
    the bar.
  - For negative values it sits below the mark, as value labels do.
  - The y scale reserves room for it, as it does for value labels, so it never clips at the plot top.
- **Meaning:** `label` is listed wherever labelled markers are: in the tooltip notes, the keyboard
  announcement, and the data table's notes column.
- Applies to every chart type. On `line`/`area` it marks the point.
- Zoom: it follows the category under `zoomRange` and the DS-48 viewport. It is clipped with the other marks
  when off-window.
- More than one annotation on the same category: the glyphs sit side by side in array order, and all labels
  are listed.

## DS-53 — `referenceLines`

```tsx
<Chart type="stacked-bar" referenceLines={[{ value: 35, label: '30-day average' }]} />
```

- `referenceLines?: ChartReferenceLine[]`, where
  `ChartReferenceLine = { key?: string; value: number; label: string; color?: ChartSeriesColor }`.
  The name and fields mirror ScatterChart's `reference` (DS-50).
- **Drawing:**
  - A horizontal line at `value` across the full plot width, from the plot's left edge to its right edge.
  - It does not stop at the outer categories' centres.
  - Neutral ink by default, or the palette slot when `color` is set.
  - Each line index gets its own dash pattern, reusing the DS-50 `--chart-reference-dash-*` tokens, so
    lines differ without colour.
  - It is drawn over bars and under data lines.
- **Y axis:** every reference value is part of the y domain, so the line is never off-plot. Under a zoom or
  viewport, the domain still includes it.
- **Legend:** each line gets a static (non-toggle) legend entry whose swatch is its dash pattern, as in
  ScatterChart.
- **Tooltip and announcement:** each line adds a muted row, "30-day average: 35 g", formatted with
  `formatValue`.
- **Data table:** one extra row under the table's caption or footer per line ("30-day average: 35 g"),
  not a constant column.
- A non-finite `value` is ignored with a dev warning.

## Non-goals

- Glyphs other than up, down and dot, and free text or React nodes.
- Vertical reference lines (markers already cover those).
- Bands or ranges on the y axis (target zones).
- A ScatterChart change.

## Anti-goals

- A glyph that carries meaning by colour alone, or is read aloud twice.
- A reference line that clips at the plot top or stops short of the plot edges.
- Any visual change to charts that use neither prop.

## My calls (the user can overrule)

- `annotations` works on every chart type, not only bars.
- `referenceLines` drops the task's `tone`. It uses `color` (palette slot) plus dash, consistent with
  ScatterChart. Semantic tones read as status, and a threshold line is not a status.
- The table lists reference lines as rows under the table, not as a column of identical values.
- Several annotations on one category sit side by side.

## Builder-check answers (my calls)

- **Annotations sit inside the plot.** The y scale reserves room for them, as it does for value labels. That
  is separate from the DS-47 marker gutter, which sits above the plot, so the two never collide.
  `line`/`area` have no value labels, so there the glyph sits just above the point.
- **Only visible series count.** "Tallest mark" means the visible series (after legend toggles), the same
  rule as the y domain. Toggling a series moves the glyph.
- **Reference values always join the y domain** when `referenceLines` is set, even if they flatten small
  data. The line must be visible. Charts without the prop are unchanged.
- **Axes:** Chart has one vertical value axis and no horizontal or dual-axis mode, so `value` is on that axis.
- **Data table:**
  - Reference lines are `<tfoot>` rows: `<th scope="row">label</th>` plus one cell spanning the remaining
    columns that holds the formatted value.
  - The notes column appears when any marker or annotation has a label.
- **Same label from a marker and an annotation:** both are listed, with no de-duplication, because they come
  from different sources.
- **Dash patterns follow array index**, as in DS-50: they cycle after three, and docs say to keep the order
  stable. There's no cap.

## Left to the builder

Glyph size and spacing tokens, how the reserved y-room is computed, the exact table and footer markup, and
internal structure, reusing the DS-47/50 marker and dash code.
