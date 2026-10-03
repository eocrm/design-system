# `<Cluster>` — horizontal layout that wraps

```tsx
// Form footer:
<Cluster justify="end" gap="sm">
  <Button variant="secondary">Cancel</Button>
  <Button type="submit">Save</Button>
</Cluster>

// Toolbar (title left, actions right):
<Cluster justify="between" gap="md">
  <h1>Users</h1>
  <Cluster gap="sm">
    <Button variant="secondary">Filter</Button>
    <Button>Add user</Button>
  </Cluster>
</Cluster>

// Inline, inside a <button>/<a>/<label> where a <div> is invalid HTML —
// as="span" renders inline-flex (e.g. icon + label in a ButtonGroup.Item):
<ButtonGroup.Item value="list">
  <Cluster as="span" gap="xs" align="center" wrap={false}>
    <List size={14} aria-hidden />
    List
  </Cluster>
</ButtonGroup.Item>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `as` | `ClusterAs` | no | — | Element to render. Defaults to `'div'`. - `div` (default) — block-level flex container; right for nearly all uses. - `span` — renders `display: inline-flex`, for phrasing-content contexts where a block element is invalid HTML: inside `<button>` (e.g. a `ButtonGroup.Item` icon + label), `<a>`, or `<label>`. - `section` — only for a genuinely standalone, nameable region; pair with `aria-label`/`aria-labelledby` (an unnamed section is just a div to AT). - `aside` — exposes a `complementary` landmark to screen readers; label it, and never use it for mere visual grouping. `span` is the ONLY value valid inside `<button>`/`<a>`/`<label>` — `section` and `aside` are flow content and remain invalid HTML there. |
| `gap` | `ClusterGap` | no | — | Gap between children, in pixels: `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32). |
| `justify` | `ClusterJustify` | no | — | Horizontal distribution. - `start` (default) — items at the start. - `center` — items centered. - `end` — items at the end. Canonical form-footer pattern. - `between` — first item at start, last at end, gap between. Canonical toolbar pattern (title left, actions right). |
| `align` | `ClusterAlign` | no | — | Vertical alignment. - `start` / `center` (default) / `end` / `baseline`. |
| `minWidth0` | `boolean` | no | false | Lets the container shrink below its content's intrinsic width (`min-width: 0`), so a `<Text truncate>` inside can ellipsize instead of being hard-cut by a clipping ancestor. Reach for it when this Cluster is an item of a **row** flex container (or a grid item) that clips — a `Calendar` `renderEvent` chip, a `Card.Header` row. Without it the flex default (`min-width: auto`) floors the container at its content's min-content width and the ellipsis never appears. That floor applies because a Cluster sets no `overflow` — per CSS Flexbox §4.5 a flex item keeps its automatic minimum size while its computed `overflow` is non-scrollable (`visible` or `clip`); the scrollable values (`hidden`/`auto`/`scroll`) drop it to `0`. That is why a `<Text truncate>` (overflow hidden) never needs this and a Cluster around it does. It is a **no-op** inside a column `Stack` (the automatic minimum size applies only on the flex MAIN axis, so there is no horizontal floor), and inside a plain block or a table cell (the automatic minimum size applies to flex and grid ITEMS only, so `min-width: auto` is just `0` there). A table cell is a no-op for a different reason than it looks: auto table layout floors the cell at its content's min-content width regardless, so what makes text truncate there is `table-layout: fixed` or a `max-width` on the cell — not this prop. Opt-in rather than the default on purpose: a container that CAN shrink also VOLUNTEERS for shrink, so turning it on where the content is NOT truncatable (buttons, badges, icons) lets that content be clipped instead. Set it on the container whose text should give way, not on one holding controls. Related: `<Constrain flex="grow">` applies the same `min-width: 0` but also forces `flex: 1 1 0`, and renders a `<div>` — reach for this prop when you want only the shrink permission, or when you are inside a `<button>`/`<a>`/`<label>` where a `<div>` is invalid HTML. |
| `maxWidthFull` | `boolean` | no | false | Caps the cluster at its container's width (`max-width: 100%`). Meant for `as="span"` inside running text: an inline cluster otherwise sizes to its content, so a `<Text as="span" truncate>` child with a long title makes the cluster overflow the paragraph instead of ellipsizing at the line edge. Combine with `wrap={false}` + a truncating child. The chip is one inline box: if the text before it leaves too little room on the line, the whole chip wraps to the next line, then ellipsizes at the full paragraph width. Phrasing-safe (still a span) — unlike `<Constrain maxWidth>`, which renders a `<div>` that is invalid inside `<p>`. For an entity link row (icon, KEY, title, status, adornments) prefer `<EntityChip truncate trailing={…}>`, which does exactly this. |
| `wrap` | `boolean` | no | — | Whether children wrap to additional lines when the container is narrow. - `true` (default) — natural for toolbars and tag lists. - `false` — use sparingly, when overflow is preferable to wrapping (e.g. inside a narrow table cell with fixed-width action buttons). |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- `as`: `div` (default) / `span` / `section` / `aside`. `span` = inline-flex for phrasing-content contexts (inside `<button>`, `<a>`, `<label>`). `section`/`aside` only for genuinely standalone, labelled regions — `aside` creates a `complementary` landmark; never use it for visual grouping.
- `gap`: same scale as Stack
- `justify`: `start` (default) / `center` / `end` / `between`
- `align`: `start` / `center` (default) / `end` / `baseline`
- `wrap`: `true` (default). Set `false` only for narrow table cells where overflow is preferable to wrapping.
- `minWidth0`: `false` (default). Sets `min-width: 0` so the container can shrink below its content's intrinsic width, letting a `<Text truncate>` inside ellipsize instead of being hard-cut by a clipping ancestor. Turn it on when this Cluster is an item of a **row** flex container (or a grid item) that clips — a `Calendar` `renderEvent` chip, a `Card.Header` row. **No-op** inside a column `Stack` (that minimum applies only on the flex MAIN axis, so there is no horizontal floor), and inside a plain block or a table cell (it applies to flex and grid ITEMS only, so `min-width: auto` is just `0`). Note a table cell is a no-op for a different reason than it looks: auto table layout floors the cell at its content's min-content width regardless, so what makes text truncate there is `table-layout: fixed` or a `max-width` on the cell — not this prop. **Opt-in on purpose:** a container that can shrink also _volunteers_ for shrink, so setting it where the content is NOT truncatable (buttons, badges, icons) lets that content be clipped instead. Set it on the container whose text should give way, never on one holding controls.
- `maxWidthFull`: `false` (default). `max-width: 100%` — for `as="span"` inside running text, where an inline cluster otherwise sizes to its content and a long `<Text as="span" truncate>` child overflows the paragraph instead of ellipsizing at the line edge. Pair with `wrap={false}` (`minWidth0` is a no-op in running text — the parent is a block). The chip is one inline box: it wraps to the next line as a unit when the preceding text leaves too little room, then ellipsizes at the paragraph width. Stays a span (phrasing-safe), unlike `<Constrain maxWidth>`. For an entity link row prefer `<EntityChip truncate trailing>`.

```tsx
// Custom Calendar chip content that ellipsizes instead of hard-clipping.
// The chip is a <button> with overflow: hidden, so the Cluster is a flex item:
// as="span" for valid HTML, minWidth0 so it can actually shrink.
<Calendar
  events={events}
  renderEvent={(event) => (
    <Cluster as="span" gap="xs" align="center" wrap={false} minWidth0>
      <Dot color="violet" />
      <Text as="span" size="inherit" truncate>
        {event.title}
      </Text>
    </Cluster>
  )}
/>
```
