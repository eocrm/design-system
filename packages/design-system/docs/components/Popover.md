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

<!-- props:start -->

## Props

### `PopoverProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | Must contain exactly one `<Popover.Trigger>` (or `<Popover.Anchor>` for a controlled popover whose anchor owns its own toggle + ARIA) and one `<Popover.Content>`. `<Popover.Heading>` and `<Popover.Close>` are optional and may appear anywhere inside `<Popover.Content>`. |
| `open` | `boolean` | no | — | Controlled open state. Provide alongside `onOpenChange` to drive open externally. Omit both to let Popover own its state (the common case). |
| `onOpenChange` | `((open: boolean) => void)` | no | — | Fired whenever Popover wants to change open state. Required when `open` is provided. |
| `defaultOpen` | `boolean` | no | — | Default open state for uncontrolled usage. Defaults to `false`. |
| `modal` | `boolean` | no | — | Reserved future hint. v1 ignores the value and always renders non-modal. Will gate focus-trap + inert-background once `<Modal>` lands. |

### `PopoverAnchorProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | Exactly one React element that accepts a ref. Unlike `Popover.Trigger`, Anchor injects ONLY the floating-positioning ref — no `onClick`, no keyboard handler, and no `aria-haspopup` / `aria-expanded` / `aria-controls`. Use it when the anchor element already owns its open-toggle and ARIA (e.g. an interactive `FilterChip` whose body `<button>` self-manages `aria-haspopup`/`aria-expanded`), and you drive the popover's open state yourself (controlled `open` + `onOpenChange`). The child must accept a ref (`forwardRef`); raw DOM elements and this library's components qualify, and it should be focusable (a `<button>` or `tabIndex` host) so Escape can return focus to it on close. |

### `PopoverCloseProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | Exactly one React element. The Close clones this element to inject an `onClick` that closes the popover, chained with the child's existing `onClick` (consumer runs first). |

### `PopoverContentProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `side` | `PopoverSide` | no | — | Preferred side. Default `'bottom'`. Auto-flips on collision via Floating UI. |
| `align` | `PopoverAlign` | no | — | Edge alignment. Default `'center'`. |
| `sideOffset` | `number` | no | — | Gap in px between trigger and panel. Default `10` (room for the arrow). |
| `minWidth` | `string \| number` | no | — | Minimum width in px or any CSS length. Defaults to the token `--size-popover-min-width` (220px) applied via SCSS. |
| `maxWidth` | `string \| number` | no | — | Maximum width in px or any CSS length, overriding the default cap (`--popover-max-width`, 360px). Use for wide content — calendars, tables — that would otherwise overflow the panel. Accepts a number (px), `'fit-content'`, `'none'` to remove the cap, or any CSS length. |
| …native | | | | plus native `<div>` attributes |

### `PopoverHeadingProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `as` | `"h2" \| "h3" \| "h4" \| "h5" \| "h6"` | no | — | Heading level. Defaults to `'h3'`. Pick the level that fits the surrounding document outline (Popover content is usually a level 3 inside a level 2 section). |
| …native | | | | plus native `<h1–h6>` attributes |

### `PopoverTriggerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | Exactly one React element that accepts a ref. The Trigger clones this element to inject `aria-haspopup`, `aria-expanded`, `aria-controls`, a click handler that toggles the popover, and a keydown handler that opens on Enter/Space. `<Button>` and raw `<button>` both qualify; a custom component without `forwardRef` does not. |
| `aria-haspopup` | `"true" \| "false" \| "dialog" \| "grid" \| "listbox" \| "menu" \| "tree"` | no | 'dialog' | Override the `aria-haspopup` value injected onto the trigger child. Defaults to `'dialog'` (matching the role of `Popover.Content`). Pass `'listbox'` for picker-style compound usages where the popover surfaces a listbox rather than a generic dialog. |

<!-- props:end -->

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
- **Escape is innermost-first across nested surfaces.** When one floating surface is open inside another — a `Select` listbox inside a `Popover`, a `ConfirmationPopover` opened from a `DropdownMenu` item, etc. — the first `Escape` closes only the **innermost** surface; the outer one (and any host `Modal`/`Drawer`) survives that press. Each press peels exactly one layer. Surfaces coordinate via the shared overlay registry (`isTopFloating`) — the most-recently-opened is innermost — so no per-pair wiring is needed.
- **Tall content:** a Popover is capped at the viewport only when it holds a `<ScrollArea>`. Wrap the long part (a feed, a list) in `<ScrollArea maxHeight="md">`; the header above it stays put. Without one, a tall popover runs off-screen. Recipe (notification centre): `Popover.Content minWidth={380}` → `Stack` → header `Cluster` (`Popover.Heading` + "Mark all as read" Button) + `ScrollArea maxHeight="md" aria-label="Notifications"`.
- For passive hover/focus hints → `<Tooltip>`. For lists of actions → `<DropdownMenu>`. For focus-locked dialogs → `<Modal>`.
