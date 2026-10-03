# `<Popover>` — non-modal floating panel for interactive content

```tsx
<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Filters</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Filter results</Popover.Heading>
      {/* …form controls… */}
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm" onClick={apply}>
            Apply
          </Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>
```

- Compound API: `<Popover>` is the provider; `<Popover.Trigger>` clones its single child to inject ARIA + click; `<Popover.Content>` portals to `document.body` and positions via Floating UI; `<Popover.Heading>` (optional) wires `aria-labelledby`; `<Popover.Close>` clones its child to inject a close-onClick.
- `<Popover.Anchor>` positions Content against its child by injecting ONLY the floating ref — no `onClick`, no keyboard handler, and no `aria-haspopup`/`aria-expanded`/`aria-controls`. Use it (instead of `Popover.Trigger`) for a CONTROLLED popover whose anchor already owns its own toggle + ARIA — e.g. an interactive `FilterChip` whose body `<button>` self-manages `aria-haspopup`/`aria-expanded` via `onActivate`/`expanded`; wrapping it in `Popover.Trigger` would redundantly stamp that ARIA onto the chip's `role="group"` root, whereas `Popover.Anchor` leaves the ARIA solely on the body button.
- Trigger child must accept a ref (`forwardRef`). `<Button>` does.
- **Non-modal**: focus moves to the panel on open; Tab traverses INTO content, then OUT to the page behind. Click-outside or Escape dismisses. Page is NOT inert.
- `<Popover.Content>` props: `side` (`'top'` | `'right'` | `'bottom'` | `'left'`, default `'bottom'`), `align` (default `'center'`), `sideOffset` (default `10`), `minWidth`, `maxWidth` (overrides the default 360px cap — pass a px number, a CSS length, `'fit-content'`, or `'none'` for wide content like calendars/tables).
- `<Popover.Heading>` props: `as` (`'h2'` – `'h6'`, default `'h3'`).
- Opens with a short scale-fade from the trigger side (140ms). Closes instantly. Respects `prefers-reduced-motion: reduce`.
- **From a DropdownMenu item.** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the `<Popover.Trigger>` child — the Item itself becomes the trigger, so the full highlighted row opens the popover. `closeOnSelect={false}` keeps the menu open while the popover is shown.
- Z-layer `--z-popover: 1050` — above dropdown, below modal/toast/tooltip.
- **Overlay host for nested floating surfaces.** A `Popover.Content` (and a `DropdownMenu` content panel) acts as an overlay host: any floating surface (`DropdownMenu` / `Popover` / `ConfirmationPopover` / `Select` / `DatePicker` / `DateRangePicker` / `TimeField` / the `Rail.Group` flyout) whose trigger sits inside it auto-elevates to `--z-overlay-floating` (1190), so a kebab menu, nested popover, or confirm dialog opened from within a Popover panel stacks ABOVE the panel instead of rendering behind it. No prop needed — it keys off the existing `[data-popover-content]` / `[data-dropdown-menu-content]` markers, plus `[data-in-overlay]` itself (elevation is transitive: a surface nested inside an elevated surface elevates too). The Popover also won't dismiss itself when you interact with such a nested surface (its content portals to `document.body`, so a click inside it would otherwise read as "outside") — so a kebab menu item or its confirm dialog stays usable without collapsing the host.
- **Escape is innermost-first across nested surfaces (#280).** When one floating surface is open inside another — a `Select` listbox inside a `Popover`, a `ConfirmationPopover` opened from a `DropdownMenu` item, etc. — the first `Escape` closes only the **innermost** surface; the outer one (and any host `Modal`/`Drawer`) survives that press. Each press peels exactly one layer. Surfaces coordinate via the shared overlay registry (`isTopFloating`) — the most-recently-opened is innermost — so no per-pair wiring is needed.
- **Tall content:** a Popover is capped at the viewport only when it holds a `<ScrollArea>` (#598). Wrap the long part (a feed, a list) in `<ScrollArea maxHeight="md">`; the header above it stays put. Without one, a tall popover runs off-screen. Recipe (notification centre): `Popover.Content minWidth={380}` → `Stack` → header `Cluster` (`Popover.Heading` + "Mark all as read" Button) + `ScrollArea maxHeight="md" aria-label="Notifications"`.
- For passive hover/focus hints → `<Tooltip>`. For lists of actions → `<DropdownMenu>`. For focus-locked dialogs → `<Modal>`.
