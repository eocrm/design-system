# Dashboard widget gallery: WidgetPreview, CatalogPicker, DashboardWidget (#613)

## Problem

The CRM tenant dashboard (eocrm/eocrm#1140, Phase 4) renders every widget as
`<Card fill>` + `Card.Header` + `<Card.Body scroll>`, so KPI, list and chart
widgets all wear the same header-heavy chrome. "Add widget" is a Drawer holding
a list of Cards with buttons: no search, no grouping, and nothing shows what a
widget looks like. The app will supply per-widget metadata (localized title,
description, category, tags, preview kind, availability). The DS must own the
presentation primitives; the app keeps data, loading/error state, permissions
and the add flow.

## Decisions

| Question                      | Decision                                                                                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Components                    | Three: `WidgetPreview`, `CatalogPicker`, `DashboardWidget`                                                                                                                                                             |
| Picker generality / container | Generic `CatalogPicker` **surface** (not dashboard-named); the app drops it into `Drawer.Body` / `Modal.Body`. It owns no overlay                                                                                      |
| Picker layout                 | Search on top, wrapping single-select category pills, visible result count, auto-fill card grid (2 cols in a Drawer, 3–4 in a Modal)                                                                                   |
| Picker semantics              | `role="listbox"` of `role="option"` cards, roving tabindex, 2-D arrow keys; category pills are native radios                                                                                                           |
| Unavailable items             | Visible, dimmed, `aria-disabled`, still focusable; the reason is visible text and in `aria-describedby`                                                                                                                |
| Preview style                 | Monochrome wireframe shapes + one accent "hero" element per kind; no text, no numbers                                                                                                                                  |
| Widget card API               | New `DashboardWidget`, props API (`variant`, `title`, `actions`, `value`, `trend`, `loading`, children) built on `Card fill`. Not a `Card` variant, not compound                                                       |
| Skeleton reuse                | One internal shape set per kind, built from `<Skeleton>` pieces. `WidgetPreview` renders it static + accented; `DashboardWidget loading` renders it pulsing, neutral, filling the body. `Skeleton` itself is unchanged |
| Branch                        | `feat/batch-611-613` (shared with #611, #612 and the Lightbox PDF chrome fix)                                                                                                                                          |

## 1. Shared widget shapes (internal)

`src/components/WidgetPreview/shapes.tsx` (internal, not exported from the
package). One renderer per kind:
`kpi | list | chart | pipeline | activity | lines` (`lines` = generic text
lines, used only for the `standard` widget's loading state).

```ts
type WidgetShapeKind = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity' | 'lines';
type WidgetShapeMode = 'preview' | 'loading';
function WidgetShape(props: { kind: WidgetShapeKind; mode: WidgetShapeMode }): JSX.Element;
```

- Every piece is a `<Skeleton>` (`text` / `circular` / `rectangular`) laid out
  with internal flex/grid in `shapes.module.scss`. Sizes are percentages /
  `flex`, never fixed pixel heights, so a shape scales with its box.
- `mode="preview"`: `animation="none"`; the kind's hero pieces get an accent
  class (`--widget-preview-accent` / `--widget-preview-accent-strong` override
  the Skeleton background). Heroes: kpi value block; list first avatar; chart
  bars (one bar strong); pipeline stage header bars (first strong, second soft);
  activity timeline dots (first strong).
- `mode="loading"`: default Skeleton pulse, NO accent (neutral — accent would
  imply real data). Fills its container: list/activity rows repeat (a fixed
  generous count, e.g. 12, clipped by `overflow: hidden`), chart bars stretch to
  the full height, kpi pieces stack at the top.
- The whole shape root is `aria-hidden` (Skeleton already is).

## 2. `WidgetPreview`

```tsx
<WidgetPreview variant="chart" />
```

```ts
type WidgetPreviewVariant = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity';
interface WidgetPreviewProps extends HTMLAttributes<HTMLDivElement> {
  /** Which widget kind the miniature depicts. Required. */
  variant: WidgetPreviewVariant;
}
```

- `forwardRef<HTMLDivElement>`; `{...props}` FIRST then `aria-hidden="true"`
  (Pattern B — decorative contract wins; the surrounding card names the item).
- Root: `width: 100%`, `aspect-ratio: var(--widget-preview-aspect)` (16 / 10),
  `background: var(--widget-preview-bg)`, `border-radius`, internal padding;
  renders `<WidgetShape kind={variant} mode="preview" />`.
- Tokens (`WidgetPreview.tokens.scss`): `--widget-preview-bg` (muted surface),
  `--widget-preview-radius`, `--widget-preview-padding`, `--widget-preview-gap`,
  `--widget-preview-aspect`, `--widget-preview-accent` (accent subtle),
  `--widget-preview-accent-strong` (accent). Theme tokens only, so dark mode
  follows automatically.

## 3. `CatalogPicker`

```tsx
<Drawer open={open} onOpenChange={setOpen}>
  <Drawer.Header title="Add widget" />
  <Drawer.Body>
    <CatalogPicker
      label="Widget catalog"
      items={catalog}
      categories={[{ id: 'sales', label: 'Sales' }, …]}
      onSelect={(id) => addOrConfigure(id)}
    />
  </Drawer.Body>
</Drawer>
```

```ts
interface CatalogPickerItem {
  id: string;
  title: string; // searched; the option's accessible name
  description?: string; // searched; shown clamped to 2 lines
  category?: string; // matches a CatalogPickerCategory.id
  tags?: string[]; // searched; not rendered
  badge?: ReactNode; // e.g. <Badge>New</Badge>, top-right of the card body
  preview?: ReactNode; // e.g. <WidgetPreview variant="kpi" />
  disabledReason?: string; // set → unavailable; the text is shown + described
}
interface CatalogPickerCategory {
  id: string;
  label: string;
}
interface CatalogPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  items: CatalogPickerItem[];
  categories?: CatalogPickerCategory[]; // omitted/empty → no pills
  onSelect: (id: string) => void;
  label: string; // listbox accessible name
}
```

**Layout** (root is a column, `Stack`-like internal flex):

1. Toolbar — `position: sticky; top: 0` with the surface background, so search
   stays reachable while the Drawer/Modal body scrolls (internal sticky header;
   stylelint-disabled with a comment, as Lightbox does). Contains:
   - Search `<Input type="search">` with a search icon, placeholder
     `t('catalogPicker.search')`, `aria-controls` → listbox id.
   - Category pills (only when `categories` has entries): a `role="radiogroup"`
     labelled `t('catalogPicker.categories')`, of native
     `<input type="radio">` + `<label>` pairs styled as wrapping pills; "All"
     (`t('catalogPicker.all')`) first and default. Native radios give arrow-key
     movement and single tab stop for free.
   - Result count: visible text in a `role="status"` element,
     `t('catalogPicker.resultCount', { count })` (ru plural forms via the
     existing plural helper). Rendered unconditionally; only its text changes.
2. Results — `role="listbox"` `aria-label={label}`, CSS grid
   `repeat(auto-fill, minmax(var(--catalog-picker-item-min), 1fr))`.
   Each option is a card: preview slot (top), title (semibold, 1 line,
   ellipsis), description (muted, 2-line clamp), badge, and — when unavailable —
   the `disabledReason` as an extra muted line under the description.
3. Empty — when the filter matches nothing, `EmptyState` with
   `t('catalogPicker.noMatches')` replaces the listbox (the status still says
   "0 results").

**Filtering**: query trimmed + `toLocaleLowerCase()`; an item matches when the
query is a substring of title, description or any tag; AND the selected
category (`All` = any). Items keep consumer order. Changing the query or
category resets the roving focus target to the first result.

**Keyboard / focus** (roving tabindex; exactly one option has `tabIndex=0`):

- In search: `ArrowDown` → focus the first option.
- In listbox: `←/→` ±1 (RTL flips), `↑/↓` ±columns, `Home/End` first/last;
  `↑` from the first row returns focus to search. Column count is read from
  `getComputedStyle(listbox).gridTemplateColumns` (number of tracks), fallback 1
  (jsdom); tests stub it.
- `Enter` / `Space` / click on an available option → `onSelect(id)`. On an
  unavailable option: no-op.
- Options: `aria-selected="false"` (selection is an action, not a state —
  same as EmojiPicker), `aria-disabled="true"` when unavailable,
  `aria-describedby` → description + reason ids.
- Focus ring on options via the `focus-ring` mixin (`:focus-visible`).

**i18n keys** (`catalogPicker.*`, en + ru): `search`, `categories`, `all`,
`resultCount` (plural), `noMatches`.

## 4. `DashboardWidget`

```tsx
<DashboardWidget variant="kpi" title="Open deals" actions={menu}
  value="128" trend={{ label: '+12% vs last month', direction: 'up' }} />

<DashboardWidget variant="list" title="Tasks due" actions={menu} loading={isLoading}>
  <Card.List>…</Card.List>
</DashboardWidget>

<DashboardWidget variant="chart" title="Revenue">
  <RevenueChart />   {/* height: 100% fills the cell */}
</DashboardWidget>
```

```ts
type DashboardWidgetVariant = 'standard' | 'list' | 'kpi' | 'chart';
interface DashboardWidgetTrend {
  label: ReactNode; // e.g. "+12% vs last month"
  direction: 'up' | 'down' | 'flat';
  sentiment?: 'positive' | 'negative' | 'neutral'; // default: up→positive, down→negative, flat→neutral
}
interface DashboardWidgetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: DashboardWidgetVariant; // default 'standard'
  title: ReactNode;
  actions?: ReactNode; // edit-mode overflow DropdownMenu etc.
  headerLevel?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; // default 'h3'
  value?: ReactNode; // kpi only
  trend?: DashboardWidgetTrend; // kpi only
  loading?: boolean; // variant-matched skeleton body
  children?: ReactNode; // body
}
```

- `forwardRef<HTMLDivElement>` to the Card root; Pattern A (`{...props}` last).
  Always `<Card fill padding="none">`; the root fills its DashboardCanvas cell.
  Root stays a `div` with a heading (no `section`/region: 20 landmarks on one
  dashboard is noise).
- **standard** — `Card.Header` (title + `action={actions}`) + `Card.Body scroll`
  (padded). Same as today's composition.
- **list** — stronger header: divider below, semibold title; body
  `scroll` and flush (no padding) so `Card.List` bleeds edge to edge.
- **kpi** — compact: a muted small title row with actions at the end; large
  value (`--dashboard-widget-kpi-value-size`); trend row: direction icon
  (`TrendingUp`/`TrendingDown`/`Minus`, `aria-hidden`) + a `VisuallyHidden`
  `t('dashboardWidget.trendUp|trendDown|trendFlat')` + `label`, coloured by
  sentiment (success/danger/muted fg tokens). Optional `children` below
  (e.g. a footnote or sparkline). No scrolling body.
- **chart** — compact header (small title, no divider, reduced padding); body
  flush, `overflow: hidden`, flex-fills the remaining height so a child with
  `height: 100%` gets the plot area. No scrolling.
- Every variant: header title is the heading element at `headerLevel`; actions
  slot never wraps; error/empty states are the app's `ErrorState`/`EmptyState`
  passed as `children` (or `value` for kpi).
- **`loading`**: replaces the body (and for kpi the value/trend) with
  `<WidgetShape mode="loading">` of the matching kind
  (standard→lines, list→list, kpi→kpi, chart→chart); title and actions stay.
  **A11y (Hard rule 10)**: the skeleton is `aria-hidden`; the body instead
  contains `VisuallyHidden` text `t('dashboardWidget.loading')` ("Loading…") as
  plain content — a property a reader arrives at when browsing the widget.
  **No live region, deliberately**: a dashboard loads 10–20 widgets at once, so
  per-widget announcements would flood the reader; a page-level "dashboard
  loaded" announcement is the app's (documented in the widget doc). The root
  gets `aria-busy` only as a hint alongside that text, never on its own.
- Tokens (`DashboardWidget.tokens.scss`): header padding per variant, divider,
  title sizes (standard/compact), kpi value size/weight, trend fg per sentiment,
  body padding.
- i18n keys (`dashboardWidget.*`, en + ru): `trendUp`, `trendDown`,
  `trendFlat`, `loading`.

## 5. Wiring (per component, Core invariant)

For each of the three: `<Name>.test.tsx`; playground `<Name>Demo.tsx` + route
(`App.tsx`) + `navItems.ts` + `ComponentsIndex.tsx` + `overviewSchematics.tsx`

- `ComponentName` in `registry.ts`; `src/index.ts` exports (component + types);
  `docs/components/<Name>.md` + `AI-PRIMER.md` index line; `CLUSTERS` entry in
  both `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, then
  `npm run build:manifest`; `npm run build:docs`; `npm run build:props`.

The DashboardCanvas demo gains a "Widget gallery" example: an "Add widget"
button opens a Drawer with a `CatalogPicker` (WidgetPreview previews, one item
already added → unavailable), selecting appends a `DashboardWidget` of the
matching variant, with a toggle that flips all widgets to `loading`.

## 6. Testing

- **WidgetPreview**: each variant renders; root is `aria-hidden` even if the
  consumer passes `aria-hidden={false}`; ref/className; preview mode has no
  pulsing skeleton and has accent pieces.
- **Shapes**: loading mode has no accent class and pulses; preview mode is static.
- **CatalogPicker**: renders items/preview/badge; search by title, description,
  tag (case-insensitive); category filter + All; count text updates in the
  status; empty state; click/Enter/Space select available, no-op unavailable;
  unavailable option is `aria-disabled`, focusable, reason visible + in
  description; arrow navigation incl. ↑/↓ by stubbed column count, Home/End,
  ArrowDown from search, ↑ from first row back to search; exactly one tab stop
  in the listbox; roving target resets on filter change; no pills without
  categories; ref/className.
- **DashboardWidget**: each variant's structure (heading level, actions slot,
  scroll vs flush body); kpi value + trend with hidden direction text and
  default/explicit sentiment; loading swaps body for the matched shape, keeps
  title/actions, exposes the hidden "Loading…" text, no live region; ref/className.

## Out of scope

Real data in previews; drag-to-place from the gallery; multi-select in the
picker; controlled query/category; a public `WidgetSkeleton`; changes to
`Skeleton` or `Card`.
