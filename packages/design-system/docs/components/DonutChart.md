# `DonutChart` — part-of-whole donut with a centre total and drill-through segments

Shows how one whole splits into a few parts: a ring drawn clockwise from 12 o'clock, the formatted total (or the hovered segment's value, share and label) in the centre, and a legend of values and shares. Fills a `DashboardWidget variant="chart"` body or sits inline on a page, and ships its own tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { DonutChart, DashboardWidget, type DonutSegment } from '@eocrm/design-system';

// `link`: an empty link element per segment (router <Link to>, DS <Link>, <a href>).
const segments: DonutSegment[] = [
  { key: 'new', label: 'New', value: 48, link: <Link to="/items?status=new" /> },
  {
    key: 'in-progress',
    label: 'In progress',
    value: 31,
    link: <Link to="/items?status=in-progress" />,
  },
  { key: 'blocked', label: 'Blocked', value: 9, link: <Link to="/items?status=blocked" /> },
  { key: 'done', label: 'Done', value: 112, link: <Link to="/items?status=done" /> },
]; // keep the array and `formatValue` referentially stable (module level or useMemo / useCallback)

<DashboardWidget variant="chart" title="Work items by status">
  <DonutChart
    label="Work items by status"
    segments={segments}
    formatValue={formatCount}
    centerLabel="work items"
    footnote="Open and closed"
  />
</DashboardWidget>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Accessible name of the figure and caption of its data table, e.g. "Work items by stage". Required. |
| `segments` | `DonutSegment[]` | yes | Segments of the whole, drawn clockwise from 12 o'clock in array order. `color` pins a palette slot (`--chart-series-N`); segments without one fill the free slots in order. Values of 0 are listed in the legend and table but draw no arc; negative or non-finite values count as 0 (dev warning). More than 8 segments repeat colours (dev warning): group the smallest into "Other". |
| `formatValue` | `(n: number) => string` | yes | Formats a value for the centre, legend, tooltip, announcement and data table (the app owns i18n). Required. |
| `centerLabel` | `string` | no | Caption under the total in the centre, e.g. "work items". Default: translated "Total". |
| `showTotal` | `boolean` | no | Shows the formatted total and `centerLabel` in the centre; hovering or focusing a segment swaps them for its value, share and label. `false` leaves the centre empty. Default `true`. |
| `onSegmentClick` | `((segment: DonutSegment) => void)` | no | Makes every non-zero segment activatable (arc click, Enter or Space on the focused ring, and a legend button), called with the consumer's original segment. To navigate, prefer a segment's `link` (a real link: new tab, copy link); this stays for non-navigating actions and analytics, and also fires for linked segments. Omit both for an inspect-only donut with a plain-text legend. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when there are no segments or every value is 0. Default: translated "No data". |
| `footnote` | `ReactNode` | no | Short note under the donut, e.g. "Open items only". Takes its own row; also describes the ring for screen readers. Shown in the empty state too. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Percentages** come from the real total, not from the drawn angles. Pass raw counts.
- **Minimum angle.** Tiny segments get a minimum visible angle so they stay hoverable; their share still shows the real value.
- **Zero-value segments** are listed in the legend and data table but draw no arc: they cannot be focused or clicked. Negative or non-finite values count as 0 (dev warning).
- **Colour** comes from the chart palette (`--chart-series-N`). `color` pins a slot; segments without one fill the free slots in order. Slot hues follow `data-accent` and carry no meaning.
- **More than 8 segments** repeat colours and a dev warning fires. Group the tail into an "Other" segment in the app.
- **Linked segments (navigation).** Give a segment `link`: an _empty_ link element (`<a href>`, a router `<Link to>`, the DS `<Link>`). Its legend entry renders that link (cloned with the entry's content, so new tab, middle-click and copy link work), and an arc click or Enter on the ring follows it by clicking that legend link, so a router `Link` navigates through its own `onClick` and Ctrl/Cmd/Shift-click keep their meaning. Children are replaced (dev warning); a non-element is ignored (dev warning). Zero-value segments render no link. With some segments linked and no `onSegmentClick`, the unlinked ones stay inspect-only (no pointer, Enter does nothing, their legend entry is plain text).
- **Clickable segments.** `onSegmentClick(segment)` receives your original segment. Use it for non-navigating actions (open a panel, analytics); to go to a page, use `link`. It also fires for linked segments. Without a `link` it makes every non-zero legend entry a button; the arcs stay hidden from assistive tech, clicking one calls `onSegmentClick`, and keyboard users press Enter on the ring. Omit it for an inspect-only donut with a plain-text legend (hidden from screen readers; the data table carries the values).
- **Keyboard.** The ring is one tab stop: arrows, Home and End choose a segment (announced), Escape clears. Enter or Space activates only the segment chosen with the arrow keys; hovering shows details but does not choose a segment for Enter.
- **Tooltip** follows hover, focus and tap. **Screen readers** get a visually hidden data table (caption = `label`) with exact values and shares.
- **Centre text** is `centerLabel` (default "Total") under the total; `showTotal={false}` leaves the centre empty. A long segment label can overrun a very small ring: keep labels short.
- **Empty** (no segments, or every value 0) renders `EmptyState` with `emptyMessage` (default "No data"). `footnote` stays visible there.
- **Sizing.** Fills its parent (`width/height: 100%`); give it a definite-height parent. The legend sits beside the ring when there is room, below it otherwise.

#### When NOT to use

- ❌ Comparing many categories → `Chart type="bar"`.
- ❌ A single value or progress toward a target → `CircularProgress`.
- ❌ Change over time → `Chart`.
- ❌ More than about 8 segments → group the tail into "Other" in the app.

#### Anti-patterns

- ❌ `onSegmentClick={(s) => navigate(...)}` for drill-through. It renders buttons: no new tab, no copy link. Use a segment `link`.
- ❌ Passing an inline `segments` array or `formatValue` on every render of a busy parent; geometry is recomputed when their identity changes.
- ❌ Pre-computing percentages into `value`. Pass counts; the component derives shares.
- ❌ Rendering a note next to the chart in the widget body (it steals height). Use `footnote`.
- ❌ Passing `loading` / error UI into `DonutChart`. Use `DashboardWidget loading` and an `ErrorState` child.
