# `<Stack>` — vertical layout

```tsx
<Stack gap="md">
  <Input ... />
  <Input ... />
  <Cluster justify="end" gap="sm">
    <Button variant="secondary">Cancel</Button>
    <Button type="submit">Save</Button>
  </Cluster>
</Stack>
```

- `gap`: `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32) — pixels
- `align`: `start` / `center` / `end` / `stretch` (default)
- `minWidth0`: `false` (default). Sets `min-width: 0` so the Stack can shrink below its content's intrinsic width, letting a `<Text truncate>` inside ellipsize instead of being hard-cut. Only bites when the Stack is itself an item of a **row** flex container (or a grid item) that clips — what decides is the PARENT's main axis, not the Stack's own direction: a two-line label beside a fixed badge, a detail column in a squeezed toolbar. **No-op** inside another `Stack`, a plain block, or a table cell — and note a table cell is a no-op for a different reason than it looks: auto table layout floors the cell at its content's min-content width regardless, so what makes text truncate there is `table-layout: fixed` or a `max-width` on the cell (that is what `<Table.Cell truncate>` does), not this prop. **Opt-in on purpose:** a container that can shrink also _volunteers_ for shrink, so setting it where the content is NOT truncatable (buttons, badges, icons) lets that content be clipped instead.
