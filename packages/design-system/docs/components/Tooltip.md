# `<Tooltip>` — small floating label on hover / keyboard focus

```tsx
<Tooltip content="Save the record (⌘S)">
  <Button onClick={save}>Save</Button>
</Tooltip>

<Tooltip content="Filter">
  <Button variant="ghost" aria-label="Filter">⏷</Button>
</Tooltip>

<Tooltip content={<>Save&nbsp;<kbd>⌘S</kbd></>}>
  <Button>Save</Button>
</Tooltip>
```

- Wrapper API: `<Tooltip content="…">` cloneElement's its single child to inject the ref, listeners (`pointerenter` / `pointerleave` / `focus` / `blur`), and `aria-describedby`. Child must accept a ref — `<Button>` qualifies, as does a raw `<button>`.
- Trigger MUST already have its own accessible name (visible text or `aria-label`). Tooltip is _supplementary description_ via `aria-describedby` — never the label.
- `content` prop: `ReactNode`. If `null` / `undefined` / `''`, the trigger renders as-is with no listeners and no aria. Useful for conditional UIs.
- `side` (`'top'` default) / `align` (`'center'` default) / `sideOffset` (default `6`) — Floating UI auto-flips on collision.
- `delay` — ms before hover opens. Default `400`. Keyboard focus is always immediate (a11y); close is always immediate.
- `open` / `onOpenChange` / `defaultOpen` — controlled mode, same shape as DropdownMenu.
- Dismissal: `pointerleave`, `blur`, document `pointerdown`, `Escape`. Tooltip never owns focus. On `Escape` (WCAG 1.4.13) the tooltip registers as a floating surface, so inside a `Modal`/`Drawer` the dismiss press closes only the tooltip — the host survives; the next `Escape` closes the host.
- Touch devices: a tap toggles the tooltip on a **non-interactive** trigger (`Text`, `Badge`, `IconTile`, a focusable `span`); a tap elsewhere closes it. A tap on a button/link/form control — or on anything inside one, e.g. a Badge in a row link — performs the action and opens nothing, so don't put supplementary info you want reachable on touch behind an interactive trigger's tooltip; rely on its accessible name.
- Opens with a short scale-fade (140 ms) from the trigger side. Closes instantly. Respects `prefers-reduced-motion: reduce`.
- Z-layer `--z-tooltip: 1300` is above modal and toast, so tooltips inside any host UI remain visible.
