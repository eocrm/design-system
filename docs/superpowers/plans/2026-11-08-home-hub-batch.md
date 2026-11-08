# Home Hub batch (DS-51) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship DS-42/43/44/47/48/49/50 in one branch so Home Hub can delete its shims.

**Architecture:** Three CSS fixes; ScatterChart `reference` becomes a list; Chart markers gain `color`/`icon`/`labelPlacement` with a
top gutter; Chart gains a continuous render `viewport` (pure math in a new `chartViewport.ts`, rendering through
`computeLayout`) plus opt-in gestures and `onPlotDoubleClick` (a new `useChartGestures.ts` hook); a new `TabNav` component
reuses the Tabs look.

**Tech Stack:** React 18 + TypeScript, SCSS modules + component tokens, Vitest (`unit` Node project for `*.test.ts`, `dom`
jsdom project for `*.test.tsx`), d3-scale/d3-shape (already deps).

**Spec:** `docs/superpowers/specs/2026-11-08-home-hub-batch-design.md` — read it; it is binding. Its "My calls" are decisions.

## Global Constraints

- Library Hard rules (`packages/design-system/CLAUDE.md`): tokens only in `.module.scss`, no layout props, `forwardRef` +
  spread, JSDoc on every exported prop/type, i18n via `useTranslation`, `:focus-visible`.
- Every changed public prop is documented in `packages/design-system/docs/components/<Name>.md` (then `npm run build:docs`
  from `packages/design-system`) and shown in its playground demo (`packages/playground/src/pages/components/<Name>Demo.tsx`).
- Playground imports only from `@eocrm/design-system`.
- No visual change to existing charts / Tabs / Grids / toasts beyond the reported defects.
- Plain vertical wheel and one-finger vertical swipe always scroll the page.
- Tests: CSS-only behaviour is pinned with the existing static-SCSS regex pattern (see
  `ButtonGroup.test.tsx` "ButtonGroup touch tokens (DS-35)", helpers `readTouchTokens`/`resolveTouchTokens`); pure math in
  Node `*.test.ts`; wiring in jsdom.
- Run tests from `packages/design-system`: `npx vitest run <path>`. Full gate at the end of each task: `npm test` exit code
  (not piped), `npm run typecheck`, `npm run lint:css`.
- Commit messages: plain, no Co-Authored-By / session trailers.

## Review Focus

1. Ctrl/⌘+wheel over a Chart **without** `zoomGestures` must not `preventDefault` (browser page zoom keeps working) — Task 5 test.
2. Viewport on 1 category, all-null data, or while categories are still empty (loading) — no NaN paths, gestures no-op — Task 4 test.
3. Controlled `viewport` with no `onViewportChange`: gestures must not move the view (controlled stays put) — Task 5 test.
4. Marker `icon`/top label on the first/last category shifts inward instead of clipping — Task 3 test.
5. TabNav in RTL: indicator under the current link, overflow scroll starts at the inline-start edge — Task 6 test (indicator
   uses logical `offsetLeft` math as Tabs does; assert on `dir="rtl"` render that the indicator style is set from the current link).

---

### Task 1: Small fixes — DS-42 touch sizes, DS-43 Grid lists, DS-44 toast safe area

**Files:**

- Modify: `src/components/Select/Select.tokens.scss` (coarse block ~L146), `Select.module.scss` (option rule)
- Modify: `src/components/ButtonGroup/ButtonGroup.tokens.scss` (coarse block ~L47), `ButtonGroup.module.scss` (segmented sizes ~L109)
- Modify: `src/components/Grid/Grid.tsx`, `Grid.module.scss`
- Modify: `src/components/Toast/Toast.module.scss` (viewport positions ~L16–40)
- Test: `Select.test.tsx`, `ButtonGroup.test.tsx`, `Grid.test.tsx`, `Toast.test.tsx`
- Docs: `docs/components/Grid.md` (one line: `as="ul"/"ol"` resets bullets and indent), `docs/components/Toast.md` (safe-area note)

**Interfaces:** none produced.

- [ ] **Step 1: Failing tests**
  - Select (static SCSS): coarse block sets a new `--select-option-min-height: var(--size-touch)`, and the option rule uses
    `min-block-size: var(--select-option-min-height)`. Default (non-coarse) value of the token is `auto` so nothing changes on mouse.
  - ButtonGroup (static SCSS): in the coarse block every `--button-group-item-height-{xs,sm,md,lg}` equals
    `calc(var(--size-touch) + 2 * var(--button-group-segmented-padding))` **for the segmented track**, and segmented items get
    `min-inline-size: var(--button-group-item-min-width)` with `--button-group-item-min-width: var(--size-touch)` in coarse
    (default `auto`). Check first how the module derives item vs track height (L109–120: item = height − 2×padding); the
    target is item ≥ 44px both axes, non-segmented items unchanged. Pick token edits that achieve that, and assert on them.
  - Grid (jsdom): `render(<Grid as="ul"><Grid.Item as="li">A</Grid.Item></Grid>)` → the `ul` has a `list` class
    (`styles.list`); `as="ol"` too; `as="div"` does not. Static SCSS: `.list` has `list-style: none` and `padding: 0`
    (padding is not a layout prop under Rule 4; `List` does the same).
  - Toast (static SCSS): each anchored edge uses `max(var(--toast-viewport-inset), env(safe-area-inset-<side>))` for
    top/bottom/left/right as used, and `max-width` subtracts the left+right safe insets.
- [ ] **Step 2:** `npx vitest run src/components/{Select,ButtonGroup,Grid,Toast}` → new tests FAIL.
- [ ] **Step 3:** Implement. Grid adds `styles.list` when `as === 'ul' || as === 'ol'`.
- [ ] **Step 4:** Same command → PASS; existing DS-35 touch tests still pass.
- [ ] **Step 5:** Commit `fix: touch-size Select options and segmented items, Grid list reset, toast safe-area insets (DS-42/43/44)`.

### Task 2: ScatterChart — several reference lines (DS-50)

**Files:**

- Modify: `src/components/ScatterChart/scatterModel.ts` (`ScatterReference` L39, layout input L111, `referencePath` L98/L281)
- Modify: `ScatterChart.tsx` (prop L63–64, `REFERENCE_KEY` L82, legend items ~L324, render ~L462), `ScatterChart.module.scss`,
  `ScatterChart.tokens.scss`, `Chart/ChartLegend.tsx` (swatch dash variant)
- Test: `scatterModel.test.ts`, `ScatterChart.test.tsx`
- Docs: `docs/components/ScatterChart.md`; demo `ScatterChartDemo.tsx` (two lines: "Usual pace" + "Today's pace")

**Interfaces:**

- Produces: `ScatterReference { key?: string; label: string; points: {x: number|Date; y: number}[]; color?: ChartSeriesColor }`;
  prop `reference?: ScatterReference | ScatterReference[]`; layout field `references: { key: string; path: string; dash: number; slot: number }[]`
  replaces `referencePath` (dash = index mod the number of patterns; slot 0 = neutral ink).

- [ ] **Step 1: Failing tests**
  - model: two references → `layout.references.length === 2`, distinct `dash`, first has `dash: 0`; a reference with
    `color: 3` → `slot: 3`; without → `slot: 0`; a reference with no points → omitted.
  - dom: `reference={[a, b]}` renders two `[data-scatter-reference]` paths with different `data-dash`, and the legend lists
    both labels; `reference={a}` (single object) renders exactly as before (one path, `data-dash="0"`, legend label).
  - dom: legend swatch of the second line carries the same `data-dash` as its path.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Normalise with `[reference].flat()` once. Legend key per line: `` `\0reference:${key ?? index}` ``. Dash
      patterns as component tokens `--scatter-reference-dash-0..2` (0 = today's `--scatter-reference-dash`), cycling; colour
      via the existing `--chart-series-<slot>` when `slot > 0`. JSDoc on every new field.
- [ ] **Step 4:** run → PASS. **Step 5:** docs + demo, `npm run build:docs`, commit `feat(scatter): several reference lines (DS-50)`.

### Task 3: Chart markers — `color`, `icon`, `labelPlacement` (DS-47)

**Files:**

- Modify: `src/components/Chart/chartModel.ts` (`ChartMarkerBase` L37, `ResolvedMarker` L65, `resolveMarkers` L76,
  `MarkerGeometry` L106, `layoutMarkers` L119, `PAD_TOP`/plot top in `computeLayout` ~L496)
- Modify: `Chart.tsx` (marker render ~L787–870, labels ~L935), `Chart.module.scss`, `Chart.tokens.scss`
- Test: `chartModel.test.ts`, `Chart.test.tsx`
- Docs: `docs/components/Chart.md` markers section; demo `ChartDemo.tsx` (feedings example: two scales, coloured markers,
  `icon: '🐱'`, one with `labelPlacement: 'top'`)

**Interfaces:**

- Produces:
  - `ChartMarkerLabelPlacement = 'beside' | 'top'` (exported type, JSDoc).
  - `ChartMarkerBase` adds `color?: ChartSeriesColor; icon?: string; labelPlacement?: ChartMarkerLabelPlacement`.
  - `ResolvedMarker` adds `slot: number` (0 = none), `icon?: string`, `placement: ChartMarkerLabelPlacement`.
  - `LayoutInput` adds `topGutter?: number` (px reserved above the plot; default 0); `computeLayout` sets `plot.y = PAD_TOP + topGutter`.
  - `markerGutterRows(markers: readonly ResolvedMarker[]): 0 | 1 | 2` — 2 if any marker has both icon and a top label, 1 if
    any has an icon or a top label, else 0.
  - `MarkerGeometry` adds `slot: number` and `top?: { x: number; icon?: string; label?: string }` (centred x, shifted inward).
- Consumed by Task 4 (viewport must keep using `layoutMarkers` with the shifted `categoryX`).

- [ ] **Step 1: Failing tests (model)**
  - `resolveMarkers` passes `color` → `slot`, `icon`, `placement` (default `'beside'`).
  - `markerGutterRows`: none → 0; icon only → 1; `labelPlacement:'top'` only → 1; icon + top label → 2.
  - `layoutMarkers`: an icon marker at the first category gets `top.x >= plot.x + halfWidth(icon)`; at the last ≤ right − half.
  - Two icon markers on adjacent categories closer than their widths → the second's `top` is undefined (dropped).
  - A `'top'` marker has no beside `label`; a `'beside'` marker with an icon has `top.icon` and a beside `label`.
  - A band marker with an icon centres `top.x` on the band.
- [ ] **Step 2 (dom):** a chart without icons/top labels renders the plot at the same `y` as before (snapshot the plot
      rect `y` from `computeLayout` with `topGutter` 0 vs omitted — equal). A marker with `color: 2` renders its line with
      `data-slot="2"` and style `--chart-series-color: var(--chart-series-2)`. Icon text renders inside
      `g.markerLabels` with `aria-hidden` (the svg is already hidden — assert it is not in the data table or tooltip notes).
      Compact chart (root height < 120) renders no icons.
- [ ] **Step 3:** run → FAIL. **Step 4:** implement. Gutter row height = `MARKER_LABEL_BASELINE` (reuse); icon font size =
      token `--chart-marker-icon-size` (default `--font-size-md`). Coloured band = palette colour at the band's existing
      tone opacity.
- [ ] **Step 5:** run → PASS; full Chart tests green. Docs + demo; commit `feat(chart): marker colour, icon and top labels (DS-47)`.

### Task 4: Chart viewport — continuous render window (DS-48, part 1)

**Files:**

- Create: `src/components/Chart/chartViewport.ts`, `chartViewport.test.ts`
- Modify: `chartModel.ts` (`LayoutInput`, `computeLayout` x/y scale and x labels, `categoryIndexAt` L792)
- Modify: `Chart.tsx` (props, state, reset/zoom interplay, clipPath, keyboard `+`/`-`/auto-pan, status text)
- Test: `chartModel.test.ts`, `Chart.test.tsx`
- Docs: `Chart.md` "Zoom" section; demo in Task 5.

**Interfaces:**

- Produces (exported from `Chart/index.ts` and `src/index.ts`): `ChartViewport = { from: number; to: number }`.
- Props: `viewport?: ChartViewport | null; defaultViewport?: ChartViewport | null;
onViewportChange?: (next: ChartViewport | null, info: { end: boolean }) => void`.
- `chartViewport.ts`:
  - `MIN_VIEWPORT_CATEGORIES = 2`
  - `clampViewport(v: ChartViewport, n: number): ChartViewport | null` — clamps into [0,1], enforces span ≥ min(1, 2/n),
    returns `null` when it covers everything (span ≥ 1 − 1e-9) or `n < 2`.
  - `zoomViewport(v: ChartViewport | null, factor: number, anchor: number, n: number): ChartViewport | null` — factor < 1 zooms
    in; keeps the domain point under `anchor` (0..1 of the **visible** plot) fixed.
  - `panViewport(v: ChartViewport | null, delta: number, n: number): ChartViewport | null` — delta in domain fractions; keeps span.
  - `visibleIndexRange(v: ChartViewport | null, n: number): { from: number; to: number }` — categories whose band overlaps.
  - `domainFractionAt(layout: ChartLayout, x: number): number` — svg x → 0..1 of the domain.
  - `ensureVisible(v: ChartViewport | null, index: number, n: number): ChartViewport | null` — pans minimally so band `index` is inside.
- Domain coordinate (ruling): fraction f is the band-edge domain — f=0 the left edge of the first category band, f=1 the
  right edge of the last, i.e. `x = plot.x + f * plot.width` at `viewport = null`.
- `LayoutInput.viewport?: ChartViewport | null`; with it, `step = plot.width / (n * span)`,
  `categoryX[i] = plot.x + step * (i + 0.5) - from * n * step`; y domain from values of `visibleIndexRange` only; x labels
  thinned over visible categories only. `categoryIndexAt` uses `categoryX[0] - step/2` as origin (works with and without viewport).
- Consumed by Task 5.

- [ ] **Step 1: Failing tests (Node, `chartViewport.test.ts`)** — `clampViewport({from:-0.2,to:0.3},10)` →
      `{from:0,to:0.5}`; span below 2/n widened around its centre; full span → `null`; `n=1` → `null`.
      `zoomViewport(null,0.5,0.5,10)` → `{from:0.25,to:0.75}`; `zoomViewport(null,0.5,0,10)` → `{from:0,to:0.5}`; zooming out
      past full → `null`. `panViewport({from:0.2,to:0.4},0.7,10)` → `{from:0.8,to:1}`. `visibleIndexRange({from:0.25,to:0.5},8)`
      → `{from:2,to:3}`. `ensureVisible({from:0,to:0.5},6,10)` → `{from:0.2,to:0.7}`. No NaN for `n=0`.
- [ ] **Step 2: Failing tests (model)** — `computeLayout` with `viewport {from:0.5,to:1}` on 4 categories: `categoryX[2]`
      equals `categoryX[0]` of the unzoomed layout's position doubled-step formula (assert `categoryX[2] === plot.x + step/2`
      and `step === plot.width/2`); y ticks span only visible values (a huge value at index 0 doesn't set the max); x labels
      include only indices 2–3. `categoryIndexAt` returns 2 at `plot.x + 1` with that viewport.
- [ ] **Step 3: Failing tests (dom)**
  - Uncontrolled `defaultViewport` renders a `<clipPath>` used by marks/markers/selection/value labels; status text says
    zoomed with the first/last **visible** category (reuse `chart.zoomed`/`chart.zoomedOne`).
  - "Reset zoom" shows when only the viewport is set; clicking it calls `onViewportChange(null, {end:true})` and
    `onZoomRangeChange(null)` only if zoomRange was set.
  - Changing `zoomRange` (prop or "Zoom to selection") with a non-null viewport calls `onViewportChange(null,{end:true})`.
  - Uncontrolled viewport resets to `null` when `categories` change content (same length, different labels → reset).
  - Data table still lists every category of the current domain while a viewport is set.
  - Keyboard: with plot focused and a category inspected, `+`/`=` zoom in around it (`onViewportChange` called with
    `end:true`), `-` zooms out; ArrowRight past the right edge calls `onViewportChange` with a panned window.
    Keys only active when `zoomGestures` is on (Task 5 adds the prop; add the boolean prop here, default `false`).
  - Loading (`categories=[]`) and a 1-category chart: setting `viewport` renders without NaN in any `d`/`x` attribute.
- [ ] **Step 4:** run → FAIL. **Step 5:** implement. `useControllableState` like `zoom`. Viewport resets live in the same
      render-time reset pattern as `inspectedZoomKey`. JSDoc each new prop.
- [ ] **Step 6:** run → PASS; full Chart suite green. Commit `feat(chart): continuous viewport with keyboard zoom (DS-48)`.

### Task 5: Chart gestures + `onPlotDoubleClick` (DS-48, part 2)

**Files:**

- Create: `src/components/Chart/useChartGestures.ts`
- Modify: `Chart.tsx` (wire the hook, `touch-action`, pointer handlers coexist with selection), `Chart.module.scss`
- Test: `Chart.test.tsx` (jsdom events), `chartViewport.test.ts` if helpers grow
- Docs: `Chart.md` (gestures table: input → effect, incl. "plain wheel scrolls the page"); demo `ChartDemo.tsx`
  ("Zoom gestures" section: controlled viewport, `onViewportChange` log line showing `end`, a double-click that adds a marker)

**Interfaces:**

- Consumes Task 4: `ChartViewport`, `zoomViewport`, `panViewport`, `domainFractionAt`, `categoryIndexAt`.
- Produces (exported types): `ChartPlotPointerEvent = { index: number; fraction: number; value: number | null; clientX: number;
clientY: number; source: 'mouse' | 'touch' | 'keyboard' }`; props `zoomGestures?: boolean`,
  `onPlotDoubleClick?: (e: ChartPlotPointerEvent) => void`.
- `useChartGestures({ plotEl, layout, enabled, selectable, viewport, n, onChange(next, end), onDoubleClick })`: binds native
  non-passive `wheel` and `touchstart/move/end` on `plotEl`; returns `{ onPointerDown, onPointerMove, onPointerUp }` handlers the
  Chart composes with its selection handlers.
- Constants: `WHEEL_ZOOM_STEP = 0.0015` (factor = `Math.exp(deltaY * step)`, deltaMode lines ×16), `WHEEL_END_MS = 200`,
  `DOUBLE_TAP_MS = 300`, `DOUBLE_TAP_SLOP_PX = 24`.

- [ ] **Step 1: Failing tests (dom)**
  - `zoomGestures` + `wheel` with `ctrlKey: true, deltaY: -100` at the plot centre → `onViewportChange` called with a
    narrower window centred near 0.5, `end:false`; then after `WHEEL_END_MS` (fake timers) once more with `end:true`; the
    event was `defaultPrevented`.
  - Plain `wheel` (`ctrlKey:false`, deltaY) → no call, not defaultPrevented. `shiftKey` or `deltaX` while zoomed → pan call.
  - Without `zoomGestures`, ctrl+wheel → no call, not defaultPrevented (Review Focus 1).
  - Controlled `viewport={{from:0,to:0.5}}` without `onViewportChange`: ctrl+wheel leaves the rendered window unchanged (Review Focus 3).
  - Touch: two touches moving apart (dispatch `touchstart`/`touchmove`/`touchend` with two `touches`) → zoom calls, `end:true`
    on last lift; one-finger horizontal move while zoomed → pan; one-finger vertical move → no call.
  - Mouse drag while zoomed with selection **off** → pan; with selection **on** → selects (existing behaviour), no pan.
  - `onPlotDoubleClick`: `dblClick` on the plot at x of category 2 → called once with `{ index: 2, source:'mouse' }`, a
    `fraction` in (0,1), numeric `value`; while zoomed to a `zoomRange`, `index` is the original index.
  - Two `pointerdown/up` touch taps within 300ms and < 24px → called with `source:'touch'`; taps 400ms apart → not called.
  - Enter on an inspected category → called with `source:'keyboard'`, `value: null`.
  - The plot has `touch-action: pan-y` (class) and, when `onPlotDoubleClick` is set, double-tap zoom is suppressed
    (`touch-action: pan-y` already excludes it — assert the class is present in both cases).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. Pinch anchor = midpoint fraction of the visible plot; two-finger
      pan = midpoint delta; `preventDefault` on touchmove only while a two-finger gesture or a one-finger horizontal pan
      (decided after slop on the dominant axis) is active, so vertical swipes stay page scroll. Long-press selection keeps
      priority when it lifts first.
- [ ] **Step 4:** run → PASS; full suite green. Docs + demo; `npm run build:docs`. Commit `feat(chart): wheel/pinch/pan zoom and plot double-click (DS-48)`.

### Task 6: `TabNav` component (DS-49)

**Files:**

- Create: `src/components/TabNav/{TabNav.tsx, TabNavLink.tsx, TabNav.module.scss, TabNav.tokens.scss, TabNav.test.tsx, index.ts}`
- Modify: `src/index.ts`; `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` CLUSTERS (`TabNav: 'Navigation'` — use
  whatever cluster `Tabs`/`Breadcrumb` use); run `npm run build:manifest`
- Create: `docs/components/TabNav.md`; add `AI-PRIMER.md` index line; `docs/components/Tabs.md` "When NOT to use": page
  navigation → `TabNav`
- Playground: `packages/playground/src/pages/components/TabNavDemo.tsx`; wire in `App.tsx`, `src/layout/AppShell/navItems.ts`,
  `ComponentsIndex.tsx`, `overviewSchematics.tsx`, `src/pages/mockups/registry.ts` (`ComponentName`), and regenerate any
  `props.manifest.json` the DateTile commit d966ecc4 touched (`git show --stat d966ecc4` lists the exact files — mirror it).

**Interfaces:**

- Produces: `TabNav` (compound, `TabNav.Link`), types `TabNavProps`, `TabNavLinkProps<C>`.
- `TabNavProps extends HTMLAttributes<HTMLElement>`: `aria-label` (required in JSDoc guidance; dev warning when neither
  `aria-label` nor `aria-labelledby`), `size?: 'sm' | 'md'` (match Tabs' size options exactly — read `Tabs.tsx` and mirror;
  if Tabs has no size prop, omit), `children`.
- `TabNavLinkProps<C extends ElementType = 'a'>`: polymorphic `as` (reuse the `PolymorphicProps` helper style from
  `Link.tsx`), `current?: boolean` (sets `aria-current="page"`), `leading?: ReactNode`, `trailing?: ReactNode`, `children`.
- Rendering: `<nav ref aria-label class=root><div scrollWrap><ul role="list"><li><Link …/></li>…</ul><span indicator aria-hidden/></div></nav>`.

- [ ] **Step 1: Failing tests (jsdom)**
  - renders `nav` with the label; links are `a` with `href`; no `role="tab"`/`tablist`/`tabpanel` anywhere.
  - `current` → `aria-current="page"`; a child that sets `aria-current="page"` itself (`as={FakeNavLink}`) gets the current
    style with no `current` prop (`data-current` or class on the `li` derived from the DOM after mount — test via the indicator
    becoming visible / `opacity: 1`).
  - `as` + extra props (`to`) are forwarded; `ref` on `TabNav` → `nav`, on `TabNav.Link` → the anchor; `className` merged.
  - `leading`/`trailing` render inside the link.
  - indicator style set from the current link's `offsetLeft`/`offsetWidth` (mock them) and updates when `current` moves;
    in `dir="rtl"` the indicator is still positioned from the current link (Review Focus 5).
  - the current link is scrolled into view on mount (`scrollIntoView` mocked, called with `{ block: 'nearest', inline: 'nearest' }`).
  - static SCSS: coarse block sets the link min height to `var(--size-touch)`; focus uses `:focus-visible`.
  - Tab key moves link to link (no roving: every link has no `tabIndex=-1`).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. Reuse Tabs' indicator/overflow logic by extracting shared code into
      `src/components/_internal/` only if it is a clean lift; otherwise mirror it (note which in the commit). Tokens alias Tabs
      tokens (`--tab-nav-*: var(--tabs-*)`) so both look identical. Detect `aria-current` via a `MutationObserver` on the list
      (attributeFilter `aria-current`) so router NavLinks work.
- [ ] **Step 4:** run → PASS. Docs (TL;DR, router example with `NavLink`, When NOT to use → Tabs), `npm run build:docs`,
      `npm run build:manifest`, playground demo (Pet Control sub-nav example with a fake router state, overflow example at 390px).
- [ ] **Step 5:** full gates incl. `make test` from repo root (exit code), commit `feat: TabNav — tab-styled route navigation (DS-49)`.
