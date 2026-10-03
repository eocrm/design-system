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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `content` | `ReactNode` | yes | — | Tooltip body. ReactNode so you can include inline `<kbd>` or icons. If `null`, `undefined`, or `""`, the trigger renders as-is with no listeners and no `aria-describedby` — useful for conditional UIs. |
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | Exactly one React element that accepts a ref. Cloned to inject the tooltip's ref + listeners + aria. `<Button>` and raw `<button>` both qualify; a custom component without `forwardRef` does not. |
| `side` | `TooltipSide` | no | — | Preferred side. Default `'top'`. Auto-flips on collision via Floating UI. |
| `align` | `TooltipAlign` | no | — | Edge alignment. Default `'center'`. |
| `sideOffset` | `number` | no | — | Gap in px between trigger and tooltip. Default `6` (room for the arrow). |
| `delay` | `number` | no | — | Delay in ms before hover opens the tooltip. Default `400`. Keyboard focus is always immediate (a11y). Close is always immediate. |
| `open` | `boolean` | no | — | Controlled open state. Provide alongside `onOpenChange` to drive open externally. Omit both to let Tooltip own its state (the common case). |
| `onOpenChange` | `((open: boolean) => void)` | no | — | Fired whenever Tooltip wants to change open state. Required when `open` is provided. |
| `defaultOpen` | `boolean` | no | — | Default open state for uncontrolled usage. Defaults to `false`. |

<!-- props:end -->

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

```tsx
// Controlled open (rare — usually let Tooltip manage state):
const [open, setOpen] = useState(false);
<Tooltip content="…" open={open} onOpenChange={setOpen}>
  <Button>Edit</Button>
</Tooltip>;
```

Opens on hover (after `delay`) or immediately on keyboard focus, with a directional arrow. Hand-rolled on `@floating-ui/react-dom`.

**When NOT to use**

- Content the user must click to interact with: use `<Popover>`. Tooltips are not hoverable; moving the pointer into the tooltip body does not keep it open.
- Form-value selection: use `<Select>`.
- As the only source of essential information: tooltips are progressive enhancement. Make it visible in copy or, for icon buttons, in the trigger's `aria-label`.
- Multi-paragraph content: that is Popover territory.

**Anti-patterns**

- `<Tooltip><Button disabled>…</Button></Tooltip>`: disabled buttons fire no pointerenter or focus events in any browser. To explain _why_ a button is disabled, render it with `aria-disabled="true"` and intercept its click, or wrap the disabled element in a `<span>` and pass the span as the Tooltip child.
- A trigger child that doesn't accept a ref (`cloneElement` needs the ref contract).
