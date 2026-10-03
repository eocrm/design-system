# `<Card>` — bordered container

- `fill` makes the Card fill a definite-height parent (`height: 100%`) and
  applies `min-width: 0` so it can shrink inside narrow Grid, Sortable, and
  DashboardCanvas cells. When a direct `Card.Body` is present, it also creates
  Card's internal column/min-height chain. It does not create a height by
  itself; bound the parent (for example with `Constrain height`) when needed.

```tsx
<Card padding="md">
  <Stack gap="md">...</Stack>
</Card>

// Tone-coded stat card — 3px left-edge stripe in the tone color:
<Card padding="md" tone="accent">Open deals</Card>
```

```tsx
// Fixed header + scrolling body in a definite-height dashboard cell.
<Constrain height="sm">
  <Card fill>
    <Card.Header>Pipeline</Card.Header>
    <Card.Body scroll>
      <Stack gap="sm">...</Stack>
    </Card.Body>
  </Card>
</Constrain>
```

```tsx
// Compound API — section card with header + list (Dashboard's "Deals needing attention" pattern).
// No `padding` prop needed — Card auto-detects compound children and defaults to padding="none".
<Card>
  <Card.Header
    action={
      <Link as={RouterLink} to="/deals">
        View all
      </Link>
    }
  >
    Deals needing attention
  </Card.Header>
  <Card.List>
    {deals.map((d) => (
      <Card.ListRow key={d.id}>
        <Stack gap="xs">
          <span>{d.title}</span>
          <span>{d.company}</span>
        </Stack>
        <Avatar name={d.owner} size="sm" />
      </Card.ListRow>
    ))}
  </Card.List>
</Card>
```

- `padding`: `none` / `sm` / `md` / `lg`. Defaults to `md` for plain content, `none` when `Card.Header` / `Card.Body` / `Card.List` / `Card.ListRow` is a direct child. Pass explicitly to override.
- `tone`: `accent` / `info` / `success` / `warning` / `danger` — draws a 3px left-edge stripe in the tone color. Default: no stripe (standard bordered look). A transparent border-left is always reserved so toggling `tone` never shifts layout.
- `overflow`: `hidden` (default) / `visible`. The default clips children to the card's rounded border so square-cornered children (a `<Table>`'s internal scroll wrapper, an `<img>`, a full-bleed `<video>`) don't show a seam at the rounded corners. Overlay primitives in this library (DropdownMenu, Tooltip, Popover, Drawer, Modal) portal to `document.body` and are NOT clipped by this. Focus rings are NOT exempt: an `outline` is clipped by an ancestor's overflow exactly as a spread shadow is, so a focusable flush against the card edge loses that band — draw its ring inset by passing `$offset: calc(-1 * var(--ring-offset))` to the `focus-ring` mixin, not a separate `outline-offset` declaration after the `@include` (a `structure.test.ts` gate fails the build on that shape). Pass `overflow="visible"` only when a direct child genuinely needs to overhang the card edge (decorative badges that protrude past a corner, hover-lift transforms whose shadow extends outward).
- **Compound API** — `Card.Header` / `Card.Body` / `Card.List` / `Card.ListRow` for section-card patterns. Drop `padding="none"` — the parent Card auto-detects compound children.
- `Card.Header`: title row (`h3` by default, override via `headerLevel`) with optional right-aligned `action` slot and bottom-border separator.
- `Card.Body`: padded `<div>` content section. Add `scroll` beneath a Header in a `fill` Card to make Body the flexible vertical scroll region while Header stays fixed. Card intentionally owns this layout because it relates only its own compound pieces; the parent still owns the Card's definite outer height. `scroll` also sets `tabIndex={0}`, because a scroll container with no focusable descendant is unreachable by keyboard (axe `scrollable-region-focusable`) — pair it with `role="group"` and an `aria-label` when the content is worth naming, and pass `tabIndex={-1}` to opt out if the body already contains something focusable.
- `Card.List`: semantic `<ul>` with list-reset styling — screen readers announce "list with N items".
- `Card.ListRow`: `<li>` with padded content and bottom dividing border; last-child border suppressed automatically.
- **Never nest Card in Card.**
