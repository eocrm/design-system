# DS-79 / DS-82 / DS-83 / DS-84 / DS-85 batch — design

Epic: DS-86. One branch, one PR. All changes land in `@eocrm/design-system`, with playground demos, docs and tests to match.

## Intent

Five consumer asks from eocrm (EO-99 dashboard, Reports) and Home Hub (HH-22, HH-29, HH-42). Each one removes a consumer shim or workaround:

| Task  | Consumer pain today                                                              | Workaround it removes                          |
| ----- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| DS-79 | Can't show kg on ScatterChart ticks with grams in the tooltip                    | none (lives with one unit)                     |
| DS-82 | DateRangePicker popover widens a 390px page to ~520px                            | two `DatePicker`s (From / To)                  |
| DS-83 | Can't add `local_date` to LiquidEditor autocomplete without copying the defaults | none (autocomplete lacks it)                   |
| DS-84 | No swipe to move between Lightbox items on touch                                 | `SwipeLightbox.tsx` shim                       |
| DS-85 | Dashboard widgets with variable content need manual `h`, which is wrong at other widths | manual resizing; eager fetches in collapsed sections |

Anti-goal for all five: a change that alters behaviour for consumers who don't opt in. Every new prop is optional, and every default stays as it is today.

## DS-83 — export `DEFAULT_LIQUID_FILTERS`

Approaches: (a) export the constant from the package root; (b) add an `extraFilters` prop. **Pick (a).** It adds no API surface, composes in one line (`filters={[...DEFAULT_LIQUID_FILTERS, 'local_date']}`), and also covers removing a default filter, which (b) can't do.

- Re-export from `components/LiquidEditor/index.ts` and `src/index.ts`. The type stays `readonly string[]`.
- `filters` prop JSDoc and `docs/components/LiquidEditor.md`: add the extend recipe.
- Test: the root export equals the list the editor uses by default.

## DS-79 — tick-only formatters

- `ScatterChart`: optional `formatYTick?: (y: number) => string`. Used only for y-axis tick labels and the gutter width those labels determine. Falls back to `formatY`. `formatY` keeps formatting the tooltip, the announcement and the table.
- `Chart`: optional `formatValueTick?: (n: number) => string`. Used only for the value-axis tick labels (and the gutter width measured from them). Falls back to `formatValue`. Bar value labels, reference-line labels, the tooltip and the table keep using `formatValue`. They show data values, not the axis.
- Not doing: `formatXTick`. Nobody has asked for it; add it the same way when someone does.
- Tests: tick text uses the tick formatter, and the tooltip/table use the main one. Omitting the tick formatter leaves today's output unchanged.
- Docs: a props-table regen plus one line in each component's doc.

## DS-82 — DateRangePicker on narrow viewports

Approaches: (a) one month, paged, below a viewport breakpoint; (b) stack two months vertically; (c) shrink the grids to fit. **Pick (a).** (b) is about 600px tall on an 844px phone and still has to flip. (c) puts day cells under the 44px touch target.

- `useBelowBreakpoint('md')` (viewport ≤ 640px; the popover is portaled, so the viewport is the right measure). When it matches:
  - Render only the left `DatePickerGrid` (cursor month). The header chevrons page by one month, as they already do.
  - The popover uses a single-month width. Add a new token, `--date-range-picker-popover-width-single`, sourced in `tokens.json` if a size token is needed; otherwise drop the width so the grid sizes it. Then run `npm run tokens:check`.
  - `.timeRowsPair` stacks (column), with start above end.
  - Keyboard: arrow navigation past the end of the single grid moves the cursor month. Reuse `handleLeftGridCursorChange`.
- At or above 641px, nothing changes.
- Not in scope: `InlineDateRangePicker`. It sits in the consumer's own layout box, and no report has come in.
- Tests: mock `matchMedia` to match; one grid is rendered; next/prev move one month; a range can be selected across months by paging; time rows render in single mode. Unmatched: two grids (existing tests).
- Docs: drop the "fixed two-month" wording and describe the narrow behaviour.

## DS-84 — Lightbox swipe

- Pointer events on `.stage`, handled only when `pointerType === 'touch'`:
  - Track the active touch pointers. A second pointer cancels the gesture (pinch).
  - On `pointerup` of the single pointer: if `|dx| > 50px` and `|dx| > |dy|`, call `goNext()` (dx < 0) or `goPrev()` (dx > 0). Both route through `goTo`, so `loop`, controlled `index` and `onIndexChange` all behave as the chevrons do.
  - Only when `items.length > 1`.
  - `pointercancel` (the browser took over for scroll or zoom) resets the gesture.
- CSS: `.stage { touch-action: pan-y pinch-zoom; }` lets horizontal moves reach the handler while vertical scroll and pinch stay native.
- A swipe must not trigger the backdrop click-to-close. If the move exceeded the slop, swallow the click that follows (one-shot flag) so `closeIfBackdrop` doesn't fire.
- Arrow-key direction isn't RTL-aware today, so swipe follows LTR as well (left = next). Not changing that.
- A PDF iframe stage swallows touches, so swiping on a PDF doesn't work. The chevrons and thumbnails still do. Documented.
- Tests: a touch swipe left → next and `onIndexChange` fires; right → prev; a short or vertical move → no change; at the end with `loop={false}` → no change; a two-pointer gesture → no change; a mouse drag → no change; a swipe that ends on the backdrop doesn't close.

## DS-85 — DashboardCanvas auto-height items + visibility signal

### API

- `DashboardItemConstraints` gains `autoHeight?: boolean` (record or function form, alongside `minH`/`maxH`).
- `renderItem: (id, ctx: { visible: boolean }) => ReactNode`. Existing one-argument callbacks keep working.
- No `onMeasure` (YAGNI; the task marks it optional). Add it when a consumer needs live spans.

### Approaches for filling the cell (decided: stretch + re-measure)

Rows have a fixed size, so `ceil` leaves up to one row of empty space under natural-height content. The user chose **stretch + re-measure**: the body fills the cell (a `height: 100%` Card has no gap), and measurement briefly turns the stretch off. The rejected option was to measure at natural height, pin the content to the top and accept the gap.

### Effective layout (core model)

- `measured: Map<id, span>` (state, keyed by item id alone). This is our call. `renderItem(id)` already can't tell duplicate ids in different containers apart, so ids that are unique across the whole canvas are already the real contract. The docs will state that. A cross-container move keeps its measurement.
- `effective(value)` = items with `h` replaced by the measured span (for auto items that have a measurement), then `compact()`. This runs **only in containers that hold at least one measured auto item** (our call). A container with no auto items renders `value` exactly as given, so a consumer who never sets `autoHeight` sees no change (the anti-goal). The existing no-op-commit guards (`DashboardCanvas.tsx` ~842-858, ~1006) keep comparing against what is rendered. A pure engine helper, `withSpans(value, spans)`, is unit-tested in `engine.test.ts`, including "no auto items → same reference".
- Everything that renders or computes geometry uses `effective(value)` in place of `value`: the render, drag previews, `applyMove`/`applyResize`, keyboard pick, the ghost size and `bottomOf`.
- **Measured spans never cause `onChange` on their own.** A gesture commit (drop, resize, keyboard move, cross-container move) emits the result computed from the effective layout. It therefore carries the current measured `h` for auto items and the compacted `y` of every item. This is our call: the saved `h` becomes the latest measurement, which makes the next first paint as close to final as possible. Measurement alone never calls `onChange`.
- First paint, SSR and jsdom (no measurement yet): the value's `h` is used.

### Measurement

- An auto item's body is wrapped: `<div class="autoBody" data-dc-auto-body>`, with `display: grid; min-height: 100%` so the returned content stretches to the cell.
- Batched measure pass (one per animation frame, all auto items at once):
  1. Set `data-dc-measuring` on the canvas root. CSS: `[data-dc-measuring] .autoBody { min-height: 0 }`.
  2. Read every pending auto body's `getBoundingClientRect().height`. That is one forced layout for the whole batch.
  3. Remove the attribute. This is synchronous, so neither ResizeObserver nor paint sees the intermediate state.
  4. `span = clamp(ceil((px + gap) / (rowPx + gap)), minH ?? 1, maxH ?? ∞)`. Read `rowPx` and `gap` per container with the existing `measureGrid`.
  5. Call `setMeasured` only if some span changed. That gives one re-pack per frame, however many items changed.
- Triggers (each one schedules the batched pass): a `ResizeObserver` on each auto body (width changes, growth past the cell); a `MutationObserver` on each auto body's subtree (`childList`, `characterData`, `attributes`, `subtree`), which catches content shrinking while stretched; `columns` changes.
- No feedback loop: after a span change the stretched body resizes, RO fires, the re-measure gives the same span and no state changes.
- **Frozen during gestures:** while `live` (pointer drag/resize/lift) or `pick` (keyboard) is active, measure passes queue and don't apply. They flush on gesture end, after the commit.
- **Collapsed sections:** items in a collapsed section are skipped (their body is `inert`, and its height is meaningless mid-animation). The last span is kept, so expanding doesn't jump; a measure runs once after expanding.
- **Stacked layout (`stackBelow`):** the container switches to `grid-auto-rows: auto`. Non-auto items get an explicit block size equal to `h × row-stacked + (h−1) × gap`, so they look exactly as they do today. Auto items take their natural height (no stretch, no rounding). Measurement is skipped while stacked; spans only matter for the multi-column grid. One pass runs when leaving stacked mode.
- **`maxH`:** the span is capped, and the cell's existing `overflow: auto` scrolls the stretched body. **`minH`:** sets the floor for empty or loading content.
- **Reduced motion:** re-packing is not animated today (no grid transitions), so it is already instant. No change; this is noted in the docs.

### Editing an auto item

- The S and SE handles are not rendered; E stays. Pointer resize from E changes only the width, after which a re-measure follows.
- Keyboard Shift+Up/Down on an auto item does nothing (no announcement). Shift+Left/Right still resizes the width.
- Drag ghost and keyboard move use the effective (measured) span.

### Visibility signal

- `visible = !inCollapsedSection && intersectsViewport`.
- One shared `IntersectionObserver` on all cells, `root: null`, `rootMargin: '100% 0px'` (one viewport above and below). Results go into a `Map<id, boolean>` state, updated once per IO callback.
- Before the first IO callback: `visible = false`, except when `IntersectionObserver` is absent (SSR/jsdom), where `visible = !collapsed`. This allows a one-frame skeleton for on-screen items, which is the price of deferral.
- The ghost always renders with `visible: true`.
- Collapsing a section flips its items to `visible: false` immediately, without waiting for IO.
- Docs recipe: latch "seen once" in the consumer to defer a fetch; use the live value to pause polling.

### Tests (jsdom; mock RO/MO/IO and `getBoundingClientRect`)

Engine: `withSpans` replaces `h` and re-compacts, pushing neighbours down and pulling them back up.

Component:
- An auto item's span follows the mocked content height (the `--dc-row` span), and the neighbour below moves.
- `onChange` isn't called on measurement; a later drop emits the measured `h`.
- Coalescing: 30 auto items changing in one frame give one state update and one forced layout pass.
- Measurement is frozen mid-drag and applied after drop.
- Collapsed section: the span is kept, and items are not visible.
- No S/SE handles; Shift+Up/Down does nothing on auto items.
- `maxH`/`minH` clamp the span.
- Stacked: auto items render without a span; non-auto items keep their height.
- Visibility: IO callback → `renderItem` receives `visible: true/false`; no IO → `visible` follows collapse.

### Docs and demo

- `DashboardCanvas.md`: an auto-height section (stretch behaviour, gesture-commit `h`, `maxH` scrolling, stacked), a visibility section with the defer recipe, and a regenerated props table.
- Playground `DashboardCanvasDemo`: an auto-height example with lists of 3/8/20 rows, a button that adds and removes rows, a section to collapse, and a stacked width. A "deferred" widget shows a skeleton until `visible`.

## Left to the builder

The exact CSS mechanics for the stacked override, the swallow-click mechanism in Lightbox, the token naming for the single-month width (follow the existing `--size-daterange-*` pattern), and test file placement per `packages/design-system/CLAUDE.md` "Test placement".
