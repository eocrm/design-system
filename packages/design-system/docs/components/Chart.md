# `<Chart>` — time-series chart for a dashboard widget

Line, bar, stacked bar or area chart over app-bucketed categories. Fills a `DashboardWidget variant="chart"` body, reflows to any cell size, and ships its own legend, tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { Chart, DashboardWidget, ErrorState } from '@eocrm/design-system';

<DashboardWidget variant="chart" title="Deals won" loading={isLoading}>
  {error ? (
    <ErrorState title="Could not load" headingLevel={4} />
  ) : (
    <Chart
      type="line"
      label="Deals won per week"
      categories={['W1', 'W2', 'W3', 'W4']}
      series={[
        { key: 'won', label: 'Deals won', values: [3, 5, null, 8] },
        { key: 'won-prev', label: 'Previous period', values: [2, 4, 6, 5], comparisonOf: 'won' },
      ]}
      formatValue={(n) => numberFormat.format(n)}
    />
  )}
</DashboardWidget>;

// Stacked, with the previous period as a total line
<Chart
  type="stacked-bar"
  label="Deals won by owner"
  categories={weeks}
  series={[
    ...owners.map((o) => ({ key: o.id, label: o.name, values: o.values })),
    { key: 'prev', label: 'Previous period', values: prevTotals, comparisonOf: 'total' },
  ]}
  formatValue={formatCurrency}
/>;

// Markers: an event line, a campaign band, weekends as subtle decorative bands
<Chart
  type="line"
  label="Calls per day"
  categories={days}
  series={calls}
  formatValue={formatCount}
  markers={[
    { key: 'launch', label: 'Launch', at: '10 Jul' },
    { key: 'promo', label: 'Summer promo', from: '21 Jul', to: '30 Jul' },
    ...weekends.map(([sat, sun]) => ({ key: sat, from: sat, to: sun, tone: 'subtle' as const })),
  ]}
/>;

// Footnote: a short note under the plot; the plot fills the rest of the cell
<DashboardWidget variant="chart" title="Revenue">
  <Chart
    type="line"
    label="Revenue per month"
    categories={months}
    series={revenue}
    formatValue={formatCurrency}
    footnote={`${excluded} deals in other currencies not included`}
  />
</DashboardWidget>;
```

## Range selection and zoom

Pass `selectedRange`, `defaultSelectedRange` or `onSelectedRangeChange` to let users select a category range (`line`, `area`, `bar`, `stacked-bar`). Ranges name categories: `{ from: 'Mon', to: 'Wed' }`, inclusive, either order; duplicate category labels resolve to the first match. A range naming an unknown category is ignored with a dev warning.

| Input                                                     | Does                                                                                                                                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mouse click                                               | Inspects (tooltip), as without selection. Outside the selected band it also clears the selection.                                                                                                          |
| Mouse press + drag (past 8px)                             | Selects from the pressed category to the pointer's; release commits.                                                                                                                                       |
| Touch tap                                                 | Inspects (tooltip), as a mouse click; outside the selected band it also clears the selection.                                                                                                              |
| Touch long-press (300ms, finger still within 8px) + slide | Selects from the pressed category to the finger's; release commits (release without sliding selects one category). Page scroll is held for that finger only; a swipe that moves first stays a page scroll. |
| Shift + ←/→                                               | Extends the range from the category inspected when Shift was first used.                                                                                                                                   |
| Esc                                                       | Mid-drag, cancels the drag (nothing is committed). Otherwise clears the selection; a second Esc clears the inspection.                                                                                     |

Selection changes and keyboard zoom (`+` / `-`) are announced in the chart's live region ("Selected Mon to Wed", "Selection cleared", "Zoomed to W3–W7"); the plot's description mentions Shift+arrows only when selection is on. The current zoom and selection are also part of the plot's description ("Zoomed to W3–W7. Selected W4 to W5."), and the data-table caption names the zoom, so a screen-reader user arriving later still hears them.

While a selection exists, a **Zoom to selection** button appears at the end of the legend row; whenever zoomed (also when the app sets `zoomRange` without selection enabled), **Reset zoom**. A selection partly outside the zoomed range draws its visible part. Zooming slices categories, series, markers (clipped; markers outside dropped), value labels and the data table to the range, rescales the y-axis and clears the selection. `details` always receives the **original** category index.

Both are controlled-or-uncontrolled: `selectedRange` + `onSelectedRangeChange`, `zoomRange` + `onZoomRangeChange` (`defaultZoomRange` for uncontrolled). Zoom is uncontrolled by default; control it to sync the zoom with filters or the URL.

```tsx
const [selection, setSelection] = useState<ChartRange | null>(null);

<Chart
  type="line"
  label="Bowl weight"
  categories={hours}
  series={weight}
  formatValue={formatGrams}
  selectedRange={selection}
  onSelectedRangeChange={setSelection}
/>;
```

### Viewport (continuous zoom)

`zoomRange` slices the data; `viewport` is a **render window** on top of it. `ChartViewport = { from, to }` are fractions 0..1 of the current domain (the `zoomRange` slice when set, else all categories) measured on **band edges**: `0` is the left edge of the first category's band, `1` the right edge of the last, so with `n` categories category `i` spans `i / n` to `(i + 1) / n`. `null` = everything.

- **What follows the window:** x positions are continuous (a category can be partly off-screen), marks, markers, selection and value labels are clipped to the plot, x labels are re-picked from the categories centred in it, and the y axis rescales to the visible values. A marker outside the window is not drawn (its icon and labels too).
- **What does not:** the data table, tooltip contents, keyboard inspection and the listed markers keep every category of the domain, so screen-reader users get the same data as sighted users. The plot description says "Zoomed to …" with the first and last visible category.
- **Limits:** clamped into 0..1 and to at least two categories; a window covering everything is `null`.
- **With `zoomRange`:** the window lives inside the slice. Any `zoomRange` change (Zoom to selection, Reset, a new prop) resets it to `null`, calling `onViewportChange(null, { end: true })` when it was set. **Reset zoom** shows whenever either is set and clears both in one action.
- **New data:** an uncontrolled window (`defaultViewport`) resets to `null` silently when `categories` change content. A controlled `viewport` is yours to reset after swapping in finer data.
- **`onViewportChange(next, { end })`:** fires with `end: false` continuously during a gesture and once with `end: true` when it settles (pointer up, last finger lifted, wheel idle 200ms, each keyboard step, a button, a reset). Refetch on `end: true` only.
- **`zoomGestures`** (default `false`) turns on interaction; the plot's description then mentions the plus and minus keys:

| Input                                   | Does                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| Plain vertical wheel                    | **Scrolls the page.** The chart never traps page scroll.                                |
| Ctrl/⌘ + wheel, trackpad pinch          | Zooms around the pointer.                                                               |
| Shift + wheel, horizontal wheel / swipe | Pans while zoomed (otherwise left to the page).                                         |
| Two-finger pinch / two-finger drag      | Zooms around the fingers' midpoint / pans.                                              |
| One-finger horizontal drag              | Pans while zoomed.                                                                      |
| One-finger vertical swipe               | Scrolls the page (the plot keeps `touch-action: pan-y`).                                |
| Touch long-press (300ms)                | Still selects when selection is on; once it lifts, a second finger does not pinch.      |
| Mouse drag                              | Pans while zoomed **only when selection is off**; with selection on it keeps selecting. |
| `+` / `=`, `-` (plot focused)           | Zoom in / out around the inspected category.                                            |

### Plot double-click

`onPlotDoubleClick(e: ChartPlotPointerEvent)` fires on a mouse double-click, a touch double-tap (two taps within 300ms and 24px) and **Enter** on the category inspected from the keyboard, so the action is not pointer-only. `e.index` is the nearest category as an index into `categories` (the **original** index while zoomed, like `details`), `e.fraction` the 0..1 position across the current domain in viewport coordinates, `e.value` the y value at the pointer (`null` from the keyboard; a pointer over the axis gutter or padding counts as the nearest plot edge, so `index` / `fraction` / `value` stay inside the visible window), plus `clientX` / `clientY` and `source: 'mouse' | 'touch' | 'keyboard'`. The plot's `touch-action: pan-y` already stops the browser's double-tap zoom.

```tsx
<Chart
  {...props}
  markers={markers}
  onPlotDoubleClick={({ index }) =>
    setMarkers((m) => [...m, { key: `m${index}`, label: 'Note', at: categories[index] }])
  }
/>
```

- **Keyboard inspection** (always, whenever a viewport is set): moving the inspected category past an edge pans the window to keep it visible (`onViewportChange` with `end: true`; a controlled `viewport` without a handler stays put).

```tsx
const [viewport, setViewport] = useState<ChartViewport | null>(null);

<Chart
  type="line"
  label="Bowl weight"
  categories={hours}
  series={weight}
  formatValue={formatGrams}
  zoomGestures
  viewport={viewport}
  onViewportChange={(next, { end }) => {
    setViewport(next);
    if (end) refetchFor(next);
  }}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `type` | `'line' \| 'bar' \| 'stacked-bar' \| 'area'` | yes | Chart form. Required. - `'line'` — one line per series (smoothed unless `curve="linear"`); trends over time. Comparison series dashed. - `'bar'` — grouped bars per category; compare a few series per bucket. Comparison bars outlined + light fill. - `'stacked-bar'` — bars stacked per category; parts of a total. Comparison only as `comparisonOf: 'total'` (dashed total line). - `'area'` — stacked areas (smoothed unless `curve="linear"`); parts of a total over time. Same comparison rule as `stacked-bar`. |
| `label` | `string` | yes | Accessible name of the figure and caption of its data table, e.g. "Deals won per week". Required. |
| `categories` | `string[]` | yes | X-axis buckets, already formatted by the app ("12 Jan", "W3", "Mar"). `series[].values[i]` belongs to `categories[i]`. |
| `series` | `ChartSeries[]` | yes | Series to plot, in a stable order. Colour: `color` pins a palette slot (1–8); series without it fill the remaining free slots in order, so keep the order fixed when filtering or pin `color`. Comparison series inherit their parent's colour. At most 8 primary series — fold the rest into an "Other" series in the app (series 9+ still render, dashed/outlined, with a dev warning). `values` shorter than `categories` are padded with gaps; `null` is a gap (lines break, bars are absent). `comparisonOf` marks a de-emphasised comparison (e.g. previous period): a series key (line / bar) or `'total'` (stacked-bar / area). |
| `formatValue` | `(n: number) => string` | yes | Formats a number for axis ticks, tooltip and data table (the app owns i18n and currency). Required. |
| `curve` | `'smooth' \| 'linear'` | no | Line/area interpolation. `'smooth'` (default) is a monotone curve; `'linear'` draws straight segments between points. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when there are no categories or every value is null/zero. Default: translated "No data for this period". |
| `hiddenSeries` | `string[]` | no | Controlled list of hidden series keys (legend toggles). Omit for uncontrolled. Unknown keys are ignored. If it would hide every primary series, it is ignored for primaries (the last primary can't be hidden). |
| `onHiddenSeriesChange` | `((keys: string[]) => void)` | no | Called with the next hidden keys when the user toggles a legend item. |
| `markers` | `ChartMarker[]` | no | Static annotations pinned to `categories`: `{ key, label?, at }` draws a vertical line at one category, `{ key, label?, from, to }` shades a category range (inclusive), e.g. a campaign or weekends. `tone`: `'neutral'` for events (the tone default) or `'subtle'` for recurring context. `color` (palette slot 1–8) strokes / tints the marker, e.g. to match a series. `icon` (short text or emoji, decorative) is drawn centred above the plot; `labelPlacement: 'top'` moves the label there too, under the icon (default `'beside'`, on the plot). Labelled markers are also listed in the tooltip, the keyboard announcement and the data table; unlabelled ones are decorative. A marker naming an unknown category is ignored with a dev warning. |
| `referenceLines` | `ChartReferenceLine[]` | no | Horizontal lines at constant values, e.g. `[{ value: 35, label: '30-day average' }]`: drawn across the full plot width, over bars and area fills and under line strokes, always inside the y domain (also when zoomed). Neutral ink unless `color` (palette slot 1–8) is set; each line's array index picks its dash pattern (cycling after three), so keep the order stable. Each gets a static legend entry, a muted "label: value" row (via `formatValue`) in the tooltip and the keyboard announcement, and a row in the data table's footer. A non-finite `value` is ignored with a dev warning. |
| `footnote` | `ReactNode` | no | Short note under the plot, e.g. "3 deals in other currencies not included" or why a comparison was omitted. Takes its own row (wraps, never truncates) and the plot fills the rest; also describes the plot for screen readers. Shown in the empty state too, where it often explains the emptiness. |
| `details` | `((categoryIndex: number) => string[])` | no | Extra plain-text lines for a category, e.g. `['235 kcal', '5 times']`. `categoryIndex` indexes `categories`. Shown as muted rows under the series in the tooltip, appended to the keyboard announcement and listed in a "Details" column of the data table (joined with "; "). Strings only; return `[]` for none. |
| `valueLabels` | `boolean` | no | Print each value on its bar (`bar`, comparisons included) or the stack total above each `stacked-bar`, using `formatValue`. Decorative (`aria-hidden`); the data table and tooltip carry the same values. A label wider than its bar is omitted rather than truncated. Ignored on `line` and `area`. Default `false`. |
| `selectedRange` | `ChartRange \| null` | no | Controlled selected category range (`null` = none). Passing this, `defaultSelectedRange` or `onSelectedRangeChange` turns selection on (`line`, `area`, `bar`, `stacked-bar`): mouse press + drag past 8px or a touch long-press (300ms) + slide selects, a click or tap outside the band clears, Shift+←/→ extends from the inspected category and Escape clears. A range naming an unknown category is ignored with a dev warning. |
| `defaultSelectedRange` | `ChartRange \| null` | no | Initial selection when uncontrolled. Default `null`. Also turns selection on. |
| `onSelectedRangeChange` | `((range: ChartRange \| null) => void)` | no | Called with the next selection (or `null` when cleared) on every user change. Also turns selection on. |
| `zoomRange` | `ChartRange \| null` | no | Controlled zoomed category range (`null` = all categories). While zoomed, categories, series, markers and value labels are sliced to the range, the y-axis rescales and `details` still receives original indices. A range naming an unknown category is ignored (full range shown) with a dev warning. Header buttons: "Zoom to selection" while a selection exists, and "Reset zoom" whenever zoomed (also without selection enabled); when controlled, they call `onZoomRangeChange`. Omit for uncontrolled. |
| `defaultZoomRange` | `ChartRange \| null` | no | Initial zoomed range when uncontrolled. Default `null` (all categories). |
| `onZoomRangeChange` | `((range: ChartRange \| null) => void)` | no | Called with the next zoomed range (or `null` on reset) when the user clicks a zoom button. |
| `viewport` | `ChartViewport \| null` | no | Controlled render window inside the current domain (the `zoomRange` slice, else all categories): fractions `{ from, to }` of the domain's band edges (0 = left edge of the first category, 1 = right edge of the last). `null` = everything. Only the plot follows it (continuous x positions, marks clipped to the plot, x labels and y axis from the visible categories); the data table, tooltip contents, keyboard inspection and markers keep every category of the domain. Clamped to 0..1 and at least two categories. Any `zoomRange` change resets it to `null`. Omit for uncontrolled. |
| `defaultViewport` | `ChartViewport \| null` | no | Initial render window when uncontrolled. Default `null`. Resets to `null` when `categories` change content (new data). |
| `onViewportChange` | `((next: ChartViewport \| null, info: { end: boolean; }) => void)` | no | Called with the next window (`null` = everything) when the user zooms or pans, "Reset zoom" clears it, or a `zoomRange` change resets it. `end: true` once the change settles (each keyboard step, a button, a reset): refetch finer data then. |
| `zoomGestures` | `boolean` | no | Turns on interactive zooming of the `viewport`: Ctrl/⌘ + wheel and trackpad pinch zoom around the pointer; Shift + wheel or a horizontal wheel pans while zoomed; a plain vertical wheel always scrolls the page. Touch: two-finger pinch zooms and two-finger drag pans; a one-finger horizontal drag pans while zoomed; a vertical swipe scrolls the page; a long-press still selects. Mouse drag pans while zoomed only when selection is off. With the plot focused: `+` / `=` zoom in and `-` zooms out around the inspected category. (Moving the inspected category past the window's edge pans to keep it visible whenever a viewport is set, with or without this.) `onViewportChange` fires with `end: false` during a gesture and `end: true` when it settles. Default `false`. |
| `onPlotDoubleClick` | `((e: ChartPlotPointerEvent) => void)` | no | Called on a mouse double-click or a touch double-tap (two taps within 300ms and 24px) on the plot, and on Enter while a category is inspected from the keyboard (`value: null`). Reports the nearest category's original index, the domain fraction and the y value at the pointer, e.g. to add a marker there. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Pre-bucketed data.** `categories` are x labels the app already formatted; `series[].values[i]` belongs to `categories[i]`. Shorter `values` are padded with gaps, extras ignored. `null` and non-finite values (NaN, Infinity) are gaps: lines and areas break, bars are absent.
- **Types.** `line` (trend), `bar` (grouped per bucket), `stacked-bar` (parts of a total), `area` (always stacked; overlapping areas hide each other).
- **Smoothing.** By default (`curve="smooth"`) every line (comparisons and the `stacked-bar` total included) and `area` is drawn with a monotone curve: it passes through every value and never leaves the range of the two values it joins, so there is no dip before a step, no bump after it, no peak above a real maximum and no negative between counts. Peaks, troughs and flat runs ease in flat. Two-point runs are straight. Stacked areas are the exception: each layer stays within its own values, but where layers trade places the stacked top can rise slightly above the largest real total; the y axis grows to keep it inside the plot. Stacked areas smooth each series on its own and stack the curves, so a steady layer stays steady whatever its neighbours do, a series that is 0 has no thickness, and with non-negative data no layer turns inside out or crosses its neighbour. A `'total'` comparison equal to the stack stays close to its top but is smoothed on its own, so next to a spike or a series' zero it can drift up to about a tenth of the plot height (typically 2–4%). Markers and the tooltip sit on the real points; the data table has the exact values. Pass `curve="linear"` for straight segments between points (stacking stays cumulative, gaps still break the line); tooltip, markers and the data table are unchanged. Has no effect on bar types.
- **Y axis** always includes 0, with rounded ticks formatted by `formatValue`. In `bar` and `line`, negative values grow down from 0; `stacked-bar` diverges around 0 (positives up, negatives down); `area` stacks without a diverging offset, so negatives accumulate.
- **Colour** follows a series' position among non-comparison series unless `color` pins a slot: 1–8 get the 8 slots of the Brand palette (`--chart-series-1`…`8`, light + dark). Slot order follows `data-accent` so slot 1 matches the accent:

  | Accent                  | Slots 1–8                                             |
  | ----------------------- | ----------------------------------------------------- |
  | default (blue), `slate` | blue, red, teal, orange, magenta, gold, violet, green |
  | `indigo`, `grape`       | violet, red, teal, orange, magenta, gold, blue, green |
  | `berry`                 | magenta, orange, blue, red, teal, gold, violet, green |
  | `ocean`, `tealpine`     | teal, red, blue, orange, magenta, gold, violet, green |
  | `moss`                  | green, violet, magenta, orange, blue, gold, teal, red |

  Every order is validated in normal vision and protan/deutan colour blindness: adjacent slots are distinct, and so is every pair among slots 1–3, so a chart with up to three series never relies on two close hues. **Exception:** under `moss`, green sits close to every warm hue for deutan viewers, so slots 1–3 separate less there; label series directly or keep moss charts to two series. Light gold sits under 3:1 on white, so it is held back to slot 6; the data table carries identity. Slot hues carry no meaning (red is not "bad"), so don't pick a series position to signal status. Set `color` (1–8) on a series to pin its slot, recommended when an entity's colour must be stable across views (e.g. user-chosen colours); series without `color` fill the remaining free slots in order, and two series may share a slot. Otherwise keep the series order stable so filtering never repaints survivors.

- **Comparison series** (`comparisonOf`): in `line` / `bar`, name the parent's key — it inherits the parent's colour, dashed (line) or outlined with a light fill (bar), sits after its parent in legend and tooltip, and hides with it. In `stacked-bar` / `area`, use `comparisonOf: 'total'` — a dashed neutral line of the previous period's total. Mismatches are ignored with a dev warning.
- **Markers** (`markers`) are static annotations pinned to `categories`: `{ key, label?, at }` draws a dashed vertical line at the centre of one category; `{ key, label?, from, to }` shades whole buckets from `from` to `to` (inclusive, either order). Positions snap to buckets: there is no sub-bucket time. `tone: 'neutral'` (default) for events, `'subtle'` for recurring context such as weekends (one marker per weekend). Bands sit behind the grid and data, lines behind the data. Labels are drawn at the top of the plot when they fit (earlier markers win a collision; hidden when the chart is compact) and are always listed in the tooltip, the keyboard announcement and a "Markers" column of the data table. Unlabelled markers are decorative. `color` (a palette slot, 1–8) strokes a line or tints a band in that series colour, e.g. feedings coloured per scale; the tone still sets the strength. `icon` (short text or an emoji) is drawn centred above the marker (line, or band centre) in a gutter above the plot; it is decorative and never read out, so put the meaning in `label`. `labelPlacement: 'top'` draws the label in that gutter too, under the icon (default `'beside'`: on the plot, as above). The gutter exists only when a marker has an icon or a top label (one row, two when one stacks both), so charts without them keep their plot size. Top items shift inward at the chart edges; on a collision the earlier marker wins. Compact charts hide icons and top labels with the other marker text. A marker naming an unknown category is ignored with a dev warning. Building markers with `.map` inside an array literal widens `tone` to `string`: write `'subtle' as const`. Don't encode status with markers (no red "incident" tone): put the meaning in the label.
- **Reference lines** (`referenceLines`) are horizontal lines at constant values, e.g. `[{ value: 35, label: '30-day average' }]` over a 7-day `stacked-bar`. Each spans the full plot width (edge to edge, not just between the outer category centres), sits over bars and area fills and under line strokes, and its value always joins the y domain, also under `zoomRange` or a `viewport`, so the line is never off-plot (even when that flattens small data). Neutral ink by default; `color` (palette slot 1–8) strokes it in a series colour. Each line's array index picks its dash pattern (three patterns, cycling), so lines differ without colour: keep the order stable. Every line gets a static (non-toggle) legend entry with its dash as the swatch, a muted "30-day average: 35 g" row (via `formatValue`) in the tooltip and keyboard announcement, and a row in the data table's footer. A non-finite `value` is ignored with a dev warning. For a vertical line at a category, use `markers`; there are no y-axis bands or target zones.
- **Details** (`details`) is `(categoryIndex) => string[]`: extra plain-text lines per category (e.g. `['235 kcal', '5 times']`), muted and swatch-less under the series in the tooltip, appended to the keyboard announcement and joined with `; ` in a "Details" column of the data table. `categoryIndex` indexes the `categories` prop. Strings only; return `[]` for none.
- **Value labels** (`valueLabels`) print each value on its bar (`bar`, comparisons included) or the stack total above each `stacked-bar`, via `formatValue`. They are `aria-hidden` (the tooltip and data table carry the values) and a label wider than its bar is omitted, never truncated. Ignored on `line` and `area`.
- **Footnote** (`footnote`) is a short muted note in its own row under the plot, e.g. excluded currencies or why a comparison was dropped. It wraps (never truncates) and the plot shrinks to make room, so keep it to a line or two. It is also the plot's accessible description (after the key hint), and stays visible in the empty state, where it often explains why there is no data. Don't use it for errors (use `ErrorState`) or for legends.
- **Legend** appears with more than one series (reference lines count as entries but never toggle). Hover or focus an item to highlight its series; click to hide/show it (`aria-pressed`). The last visible primary series can't be hidden: its button is `aria-disabled` but stays focusable. A comparison's button is disabled while its parent is hidden. Control with `hiddenSeries` / `onHiddenSeriesChange` to persist per widget. Below 120px height the legend shrinks to one row with a "+N" counter; overflow items are not rendered, so they are not keyboard-reachable (the data table still lists every series) — except hidden series, which always render so they can be re-shown (the "+N" counts only the remaining visible ones).
- **Tooltip** on hover or tap shows every visible series at that bucket. On touch, tapping the plot shows it and it stays until you tap outside the plot. **Keyboard:** the plot is one tab stop (named by `label`, with the key hint as its description); ←/→ move, Home/End jump, Esc closes. Screen-reader users in browse mode never receive the arrow keys on the plot — they should read the data table instead. Values are announced politely only while a keyboard user inspects — never on load, so a dashboard of charts stays quiet.
- **Screen readers** (browse mode: use the table, not the plot's arrow keys) get a visually hidden data table (caption = `label`) with exactly the plotted values (a null cell reads "No data"); the SVG is hidden from them. Identity never relies on colour alone: dashes for comparisons, marker shapes per series, labels everywhere.
- **Empty** (no categories, or every value null/0) renders `EmptyState` with `emptyMessage` (default "No data for this period"; an empty string falls back to the default).
- **Sizing.** Fills its parent (`width/height: 100%`) and redraws on resize. The parent must have a definite height (e.g. a `DashboardWidget` chart body); in an auto-height parent the plot measures 0 and only the legend renders. X labels never overlap: end labels are clamped inside the chart and the last label is dropped if it would collide. It never scrolls horizontally.
- **Performance.** Layout is recomputed when the `formatValue`, `categories` or `series` identities change. Memoise them (`useCallback` / `useMemo`) when the parent re-renders often.

#### When NOT to use

- ❌ One headline number → `DashboardWidget variant="kpi"` or `StatGroup`.
- ❌ More than 8 groups at once → fold the tail into an "Other" series in the app (the DS can't know whether your metric is additive).
- ❌ Two measures with different units → two charts. There is no dual axis.
- ❌ Stage conversion (pipeline / campaign) → `FunnelChart`.
- ❌ Two measures against each other, or events on a time axis sized by magnitude → `ScatterChart`.
- ❌ A value per weekday × hour (two categorical dimensions) → `Heatmap`.
- ❌ Non-time categorical comparisons that need sorting, or pies — not supported.

#### Anti-patterns

- ❌ Wrapping `Chart` in a fixed-height or scrolling div inside the widget body. The cell is the size.
- ❌ Rendering a note next to `Chart` in the widget body (it steals the plot's height unpredictably). Use `footnote`.
- ❌ Passing `loading` / error UI into `Chart`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Reordering `series` by value each refresh — colours jump between entities.
- ❌ Formatting inside `categories` with the value (`"W1: 3"`); values go in `series`, labels in `categories`.
- ❌ A constant series (the same value in every category) for a target or average → `referenceLines`, which spans the full plot width, stays out of the series colours and reads as one row, not a column of identical values.
- ❌ Comparison series on 8 groups (16 marks): compare only ungrouped or with ≤ 4 groups.
