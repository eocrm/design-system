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
