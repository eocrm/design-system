# `<ScrollArea>` — height-capped vertical scroll region

```tsx
<ScrollArea maxHeight="md" aria-label="Notifications">
  <Stack gap="xs">{rows}</Stack>
</ScrollArea>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `maxHeight` | `ScrollAreaMaxHeight` | no | — | Caps the area's height; past it, the content scrolls vertically. - `'sm'` — 240px. A short list inside a form or a card. - `'md'` — 400px. A popover feed (notifications, activity). - `'lg'` — 560px. A tall panel body. - `number` — px, for a one-off (`maxHeight={320}`). Prefer the scale. - `string` — any CSS length (`'50vh'`). Omitted: no cap of its own. The area fills the height its parent gives it, which is right as the flexible child of a bounded flex column. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Pads its content by the focus-ring extent (4px) so focused children's rings aren't clipped.
- **Keyboard:** named (`aria-label` / `aria-labelledby`), it is always a `role="region"` landmark. It is a tab stop (`tabIndex=0`) only while it overflows AND holds nothing focusable (a dev warning fires if that happens unnamed). A feed of links adds no tab stop. Name the ones worth landmark navigation (feeds, logs), not decorative ones.
- **In a Popover** it's what caps the popover at the viewport: the popover becomes a flex column where only the ScrollArea shrinks, so a header above it stays put. Keep it a direct child of `Popover.Content`, or inside one wrapper element that is a direct child (`Content > Stack > ScrollArea`). That one wrapper must lay its children out as a column: a `<Stack>`, or a plain element (div/form/Card), which the popover lays out as a column. A row wrapper such as `<Cluster>` is not supported (the popover caps but the feed overflows it) — put the ScrollArea in a Stack instead. Deeper nesting leaves the popover uncapped.
- Not for whole-page scroll (AppLayout owns it), a Card body (`<Card fill>` + `<Card.Body scroll>`), or horizontal scrolling (wider content is clipped — wrap long lines). Don't nest them.

```tsx
// Plain-text log: overflowing with nothing focusable, so it becomes a named tab stop by itself.
<ScrollArea maxHeight="sm" aria-label="Import log">
  <Stack gap="xs">{lines.map((line, i) => <Text key={i} size="sm">{line}</Text>)}</Stack>
</ScrollArea>

// One-off height — prefer the scale.
<ScrollArea maxHeight={320} aria-label="Members">{members}</ScrollArea>
```

**Anti-patterns**

- A plain `overflow: auto` div via `className` instead: it loses the keyboard tab stop, the popover viewport cap, and overscroll containment.
- Plain-text content with no `aria-label` / `aria-labelledby`: it becomes an unnamed tab stop.
