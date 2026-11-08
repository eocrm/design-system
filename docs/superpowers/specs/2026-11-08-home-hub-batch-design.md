# Home Hub batch (DS-51) — design

**Status:** draft for approval · 2026-11-08
**Epic:** DS-51 · **Tasks:** DS-42, DS-43, DS-44, DS-47, DS-48, DS-49, DS-50 · **Branch:** `feat/home-hub-batch-ds51` (one PR)

All seven come from Home Hub, which is replacing Tailwind/sonner/its own chart code with the design system and
currently carries a shim for each. Success: every shim named in the tasks can be deleted, and the
library has no new a11y regressions.

## Decided by the user

- **All seven ship in one branch/PR.**
- **DS-49 → a new `TabNav` component**, not a mode of `Tabs`, and built "properly" (full Tabs look and
  behaviour parity, not a lean stub).
- **DS-47 → configurable marker labels.** A new `icon` is drawn centred above the marker; the existing `label`
  either stays beside the line (today's look) or moves above the plot, stacked under the icon. All three mockups
  are valid outcomes: icon on top + label beside, both on top, or colour only (no icon).
- **DS-48 → the Chart zooms live and reports.** A continuous `viewport` (controlled or uncontrolled) moves with
  wheel/pinch/pan on the data already loaded; `onViewportChange(next, { end })` lets the app refetch finer data.

## Per task

### DS-42 — touch sizes (Select options, segmented ButtonGroup items)

On `@media (pointer: coarse)`:

- Select listbox options are at least `--size-touch` tall (min block size, not just padding), and so are group
  "load more" or similar rows if they are options.
- Segmented `ButtonGroup.Item`s are at least `--size-touch` × `--size-touch`. The segmented track grows to
  `--size-touch + 2 × --button-group-segmented-padding` so the item itself is 44px, not the track. Non-segmented
  items already meet 44px; leave them.
- Via component tokens in the existing coarse blocks of `Select.tokens.scss` / `ButtonGroup.tokens.scss`.

### DS-43 — `Grid as="ul" | "ol"`

When Grid renders a `ul`/`ol`, it resets `list-style: none; padding: 0` (same as `List`). Other `as` values are
untouched. `Grid.Item as="li"` needs nothing.

### DS-44 — toast viewport safe area

Each edge inset of the toast viewport becomes `max(var(--toast-viewport-inset), env(safe-area-inset-<side>))`
for the sides it is anchored to (top/bottom and left/right), and the `max-width` calc accounts for the side
insets. `--toast-viewport-inset` stays the consumer knob.

### DS-50 — ScatterChart: several reference lines

- `reference?: ScatterReference | ScatterReference[]`. A single object keeps working unchanged.
- `ScatterReference` gains `color?: ChartSeriesColor` (palette slot; default = today's neutral ink) and an
  optional `key?: string` (React key / legend identity; default = index).
- Every line gets its own legend entry. Lines are distinct without colour: each line index gets a different
  dash pattern (the first keeps today's pattern). Legible in light and dark.
- Wherever the single reference appears today (legend, tooltip, data table, announcement), every line appears.

### DS-47 — Chart markers: colour, icon, label placement

New optional fields on `ChartMarker` (both the `at` and the `from/to` forms):

- `color?: ChartSeriesColor` — a palette slot, so a marker can match its series. A line marker strokes in that
  colour; a band tints in it (the subtle/neutral tone still decides the strength). No colour = today's look.
- `icon?: string` — short text or an emoji, drawn centred above the marker (line x, or band centre) in a gutter
  above the plot. Decorative: not read out, not in tooltip/table (the `label` carries meaning).
- `labelPlacement?: 'beside' | 'top'` — default `'beside'` (today). `'top'` draws the label centred above the
  plot, under the icon when there is one.

Layout rules:

- The top gutter exists only when at least one visible marker has an `icon` or a `'top'` label; its height is one
  row, or two when any marker stacks icon + label. Charts without these look exactly as today.
- Top items never clip at the chart's left/right edges: they shift inward. On collision with an earlier top item
  the later one is dropped, the same rule as today's labels. Text uses the existing marker label ink (legible
  in both themes).
- Compact charts (below `COMPACT_HEIGHT`) keep hiding marker text, icons included.

### DS-48 — Chart: plot double-click and gesture zoom

**`onPlotDoubleClick?: (e: ChartPlotPointerEvent) => void`**

- Fires on mouse `dblclick` and on a touch double-tap (two taps within 300ms and ~24px) inside the plot.
- `{ index, fraction, value, clientX, clientY, source }`:
  - `index`: nearest category, as an index into the `categories` prop (original index while zoomed, same as
    `details`).
  - `fraction`: continuous 0..1 position across the current domain (the `zoomRange` slice when set, else all
    categories, first to last), the same coordinate system as `viewport`.
  - `value`: the y value at the pointer from the y scale; `null` for keyboard.
  - `source`: `'mouse' | 'touch' | 'keyboard'`.
- Keyboard equivalent: Enter on the inspected category fires it (`value: null`, client coords = that
  category's point on screen), so the action is not pointer-only.
- The plot must stop the browser's double-tap zoom (`touch-action` no double-tap) when the callback is set.

**`zoomGestures?: boolean`, `viewport?`, `defaultViewport?`, `onViewportChange?`**

- `ChartViewport = { from: number; to: number }`: fractions 0..1 of the current domain, `from < to`. `null` =
  everything. The current domain is the `zoomRange` slice when one is set, otherwise all categories.
- The chart renders only the window: x positions are continuous (a category can be partly off-screen; marks,
  markers, selection and value labels are clipped to the plot), x labels are re-picked for the visible window, and
  the y axis rescales to visible values (as with `zoomRange`).
- Gestures, only when `zoomGestures` is on:
  - Ctrl/⌘ + wheel and trackpad pinch (which arrives as ctrl + wheel) zoom around the pointer.
  - Horizontal wheel / Shift + wheel pans while zoomed.
  - Plain vertical wheel always scrolls the page. The chart never traps page scroll.
  - Touch: two-finger pinch zooms around the midpoint and two-finger drag pans. One-finger horizontal drag pans
    while zoomed. One-finger vertical swipe scrolls the page (`touch-action: pan-y` on the plot). A long-press
    still starts selection.
  - Mouse drag pans while zoomed only when selection is off; with selection on, drag keeps selecting.
  - Keyboard (plot focused): `+`/`=` zoom in and `-` zoom out around the inspected category. Moving the
    inspected category past an edge pans the window to keep it visible.
- Limits: the window never leaves 0..1 and never shrinks below about two categories.
- `onViewportChange(next, { end })` fires continuously during a gesture with `end: false`, and once with
  `end: true` when it settles (pointer up, last touch lifted, wheel idle ~200ms, each keyboard step). Apps refetch
  on `end`. When they swap in finer data, they reset `viewport` to `null` (or a new window).
- The existing "Reset zoom" button also clears the viewport, and shows whenever the viewport is non-null.
  "Zoom to selection" is unchanged.
- **Viewport vs `zoomRange`:** the viewport lives inside the `zoomRange` slice and a gesture never widens past it.
  Any `zoomRange` change ("Zoom to selection", Reset, or a new prop value) resets the viewport to `null`
  (`onViewportChange(null, { end: true })` when it was non-null). "Reset zoom" clears both in one action.
- **The viewport is a render window, not a data slice.** The data table, keyboard inspection, tooltip contents
  and the listed markers keep every category of the current domain, so screen-reader users get the same data as
  sighted users. The x positions, x labels, clipping and y-axis scale follow the window. The plot description
  says "zoomed" the same way it does for `zoomRange`.
- **Uncontrolled + new data:** when `categories` change content (the app swapped in finer data), an uncontrolled
  viewport resets to `null`. A controlled viewport is the app's to set.
- A viewport change is announced the way zoom buttons already announce (reuse, no new live region).

### DS-49 — `TabNav`

A navigation strip that looks like horizontal `Tabs` but is made of links: page-level sub-navigation (Pet
Control: Today / Trends / Calendar / Manage; a CRM record: Overview / Activity / Files).

```tsx
<TabNav aria-label="Pet Control">
  <TabNav.Link as={NavLink} to="/pets/today">
    Today
  </TabNav.Link>
  <TabNav.Link href="/pets/trends" current>
    Trends
  </TabNav.Link>
</TabNav>
```

- `TabNav` renders `<nav aria-label>` with a `<ul>` of `<li>`s. `TabNav.Link` is polymorphic (`as`, default `a`,
  like `Link`/`LinkCard`) and forwards its ref and props.
- The current item: `current` sets `aria-current="page"`. Styling keys off `[aria-current='page']`, so router
  `NavLink`s that set it themselves work without `current`.
- Look and behaviour parity with horizontal `Tabs`: the same sizes and type, the sliding underline indicator
  (follows the current link, also across route changes when the strip stays mounted), the same overflow
  behaviour (horizontal scroll on narrow screens, scrollbar only on real overflow) with the current item scrolled
  into view on mount/change. Each item is at least `--size-touch` on coarse pointers. `leading` / `trailing`
  slots per link like `TabItem`.
- Keyboard: ordinary links in tab order. No roving and no tablist/tabpanel roles. Focus ring per Hard rule 3a.
- Docs: `Tabs` says "page navigation → `TabNav`"; `TabNav` says "views inside one page → `Tabs`". The full Core
  invariant applies (tests, demo + four playground wirings, export, docs + AI-PRIMER line, CLUSTERS in both maps).

## Non-goals

- Pinch/wheel zoom on `ScatterChart` or other charts (Chart only).
- Interpolating new data while zoomed. The app refetches on `end`.
- Vertical `TabNav`, `TabNav` actions/`endContent`, or a TabNav dropdown for overflowing items.
- Changing default marker label placement for existing charts.

## Anti-goals

- A chart that hijacks page scroll on wheel or one-finger swipe.
- Gestures with no keyboard equivalent.
- `TabNav` announcing "tab, 1 of 4" or `Tabs` gaining link semantics.
- Any visual change to existing charts, scatter charts, Tabs, Grids or toasts beyond the reported defects.

## My calls (the user can overrule)

- **Plain mouse wheel scrolls the page; zoom needs Ctrl/⌘ + wheel (trackpad pinch included).** DS-48 says "mouse-wheel
  zoom". I chose Ctrl/⌘ + wheel to avoid scroll traps on dashboards.
- `fraction` (double-click) uses the same domain as `viewport`, not "fraction of the visible plot".
- The viewport stacks inside `zoomRange`, resets on any `zoomRange` change, and is a render window only (table,
  tooltip and keyboard still see the whole current domain). An uncontrolled viewport resets when `categories`
  change.
- Marker `icon` is decorative. `icon`/`labelPlacement` apply to bands as well as lines (centred over the band).
- DS-50 reference lines are told apart by dash pattern first, colour optionally.
- `TabNav.Link` has no `disabled` (a link can't be disabled; omit the item).
- The epic DS-51 was created for this batch so the run links to one key.

## Left to the builder

Internal structure (shared x-scale for the viewport, the gesture recogniser, reusing the Tabs indicator and
overflow code for TabNav), exact dash patterns, gutter heights from the existing label metrics, the double-tap
thresholds within the stated ranges, token names.
