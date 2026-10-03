# `<Constrain>` — size / flex constraint

```tsx
<Constrain maxWidth="sm"><Input placeholder="Search…" /></Constrain>

<Constrain height="viewport-70" maxHeight="lg"><FlowCanvas /></Constrain>

<Cluster wrap={false} gap="sm">
  <Constrain flex="grow"><Progress value={x} max={y} /></Constrain>
  <Button>Upgrade plan</Button>
</Cluster>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `width` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | no | — | Fixed width — a named step (`xs` 200 / `sm` 320 / `md` 448 / `lg` 640 / `xl` 800px, via `--measure-*` tokens) or `'full'` (100%). |
| `minWidth` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | no | — | Minimum width floor — a named step or `'full'` (100%). |
| `maxWidth` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | no | — | Maximum width cap — the common case (e.g. a search input at `'sm'`). |
| `height` | `'viewport' \| 'viewport-70' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xs' \| 'full'` | no | — | Fixed height — a named measure (same scale as the widths), `'full'` (100%), `'viewport'` (100dvh), or `'viewport-70'` (70dvh). `height="viewport-70"` with `maxHeight="lg"` makes a viewport-relative panel that never exceeds 640px. |
| `minHeight` | `'viewport' \| 'viewport-70' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xs' \| 'full'` | no | — | Minimum height floor — a named measure, `'full'`, `'viewport'`, or `'viewport-70'`. |
| `maxHeight` | `'viewport' \| 'viewport-70' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xs' \| 'full'` | no | — | Maximum height cap — a named measure, `'full'`, `'viewport'`, or `'viewport-70'`. |
| `flex` | `'grow' \| 'shrink' \| 'auto' \| 'none'` | no | — | Flex behavior as a child of a flex row/column. - `'grow'` — fill remaining space (`flex: 1 1 0`) and shrink below content width (`min-width: 0`) so a truncating child (`<Text truncate>`) can clip. To opt a `Stack`/`Cluster` into that truncating chain WITHOUT also making it fill the row, use their `minWidth0` prop instead — and note Constrain renders a `<div>`, so it is invalid inside a `<button>`/`<a>`/`<label>`, where `<Cluster as="span" minWidth0>` is the only option. - `'auto'` — size to content, may grow/shrink (`flex: 1 1 auto`). - `'shrink'` — don't grow, may shrink (`flex: 0 1 auto`, the flex default). - `'none'` — fixed, never grow/shrink (`flex: 0 0 auto`). Omit for no flex class: the element behaves as its flex container dictates. |
| `children` | `ReactNode` | yes | — | The content to size. Required — a Constrain with nothing inside has nothing to constrain. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- The one place width/height/flex sizing lives — `Stack`/`Cluster`/`Grid` are spacing-only (Rule 4). Constrain sizes its **own** box; it does not arrange children (put a `Cluster`/`Stack` inside).
- No padding/border/background — for those use `<Card>`; for a full-bleed shell use `<Screen>`.

#### Anti-patterns

- ❌ Reaching for Constrain to add `margin` / `padding`. It carries size/flex only; spacing comes from the parent layout primitive.
- ❌ Spacing or arranging children: use `<Stack>` / `<Cluster>` / `<Grid>`.
