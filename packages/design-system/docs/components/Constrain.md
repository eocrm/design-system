# `<Constrain>` — size / flex constraint

```tsx
<Constrain maxWidth="sm"><Input placeholder="Search…" /></Constrain>

<Constrain height="viewport-70" maxHeight="lg"><FlowCanvas /></Constrain>

<Cluster wrap={false} gap="sm">
  <Constrain flex="grow"><Progress value={x} max={y} /></Constrain>
  <Button>Upgrade plan</Button>
</Cluster>
```

- The one place width/height/flex sizing lives — `Stack`/`Cluster`/`Grid` are spacing-only (Rule 4). Constrain sizes its **own** box; it does not arrange children (put a `Cluster`/`Stack` inside).
- `width` / `minWidth` / `maxWidth`: a named scale `'xs'` (200) / `'sm'` (320) / `'md'` (448) / `'lg'` (640) / `'xl'` (800) / `'full'` (100%), via `--measure-*` tokens.
- `height` / `minHeight` / `maxHeight`: the same named scale plus `'viewport'` (100dvh) and `'viewport-70'` (70dvh). Combine `height="viewport-70"` with `maxHeight="lg"` to make a viewport-relative panel that never exceeds the 640px large measure.
- `flex`: `'grow'` (fill remaining space) / `'auto'` / `'shrink'` (no grow, may shrink — the CSS flex default) / `'none'` (fixed). Omitting `flex` applies no class; the element behaves as its flex container dictates. Use `flex="grow"` to let a child fill a `Cluster` row.
- No padding/border/background — for those use `<Card>`; for a full-bleed shell use `<Screen>`.
