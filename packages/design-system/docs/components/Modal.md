# `<Modal>` — focus-locked dialog

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Edit contact</Button>

<Modal open={open} onOpenChange={setOpen} size="md">
  <Modal.Header>Edit contact</Modal.Header>
  <Modal.Body>
    <Stack gap="md">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
    </Stack>
  </Modal.Body>
  <Modal.Footer>
    <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
    <Button onClick={save}>Save</Button>
  </Modal.Footer>
</Modal>
```

<!-- props:start -->

## Props

### `ModalProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `open` | `boolean` | yes | — | Controlled open state. Required. |
| `onOpenChange` | `(open: boolean) => void` | yes | — | Fired when Modal wants to change open state — Esc, overlay click, Close button, programmatic. |
| `size` | `ModalSize` | no | 'md' | Size preset. Defaults to `'md'`. - `'sm'` (400px) — confirms and short prompts. - `'md'` (560px) — the default; typical forms. - `'lg'` (800px) — wide forms, tables, previews. - `'full'` (95vw × 90dvh, fixed height) — long documents, e.g. an HTML email. See {@link ModalSize}. |
| `overlay` | `ModalOverlayVariant` | no | — | Overlay variant. 'solid' (default) paints a dark dimming layer. 'blur' uses a light tinted background plus `backdrop-filter: blur(4px)` for a frosted-glass effect. 'blur' costs an extra compositor layer — fine for normal use; avoid stacking three blurred modals at once. |
| `stackMode` | `OverlayStackMode` | no | — | How this modal relates to existing modals in the stack when it opens. - `'overlay'` (default): if there's a modal below this one, it stays visible underneath. This modal's own overlay paints transparent so the parent's dim shows through. Only the bottom modal (depth 0) paints the actual dim/blur. The user sees the parent's context behind the active modal. - `'replace'`: any modals below this one are hidden via `display: none` (React state preserved). This modal paints its own overlay normally. Best for forced-step modals where the parent context is irrelevant. Has no effect when this is the only open modal. |
| `disableEscapeClose` | `boolean` | no | — | Disable Escape-to-close. Default false. Combined with `dismissOnOverlayClick: false` and omitting `<Modal.Close>` produces a fully forced step. |
| `dismissOnOverlayClick` | `boolean` | no | — | When false, clicking the overlay backdrop does NOT close the modal. Default true. |
| `initialFocusRef` | `RefObject<HTMLElement \| null>` | no | — | Initial focus target on open. Default: the dialog container itself. Pass a ref to override (e.g. focus the first input in a form). |
| `returnFocusRef` | `RefObject<HTMLElement \| null>` | no | — | Where focus goes when the modal closes. Default: back to whatever was focused when it opened. That default breaks whenever the opener is gone by close time — a row's "⋯" trigger whose row was just deleted, or a button that unmounts in the same commit that opens the modal (the capture then snapshots `<body>`). Focus lands on `<body>` and a keyboard user loses their place. The ref is read **at close time**, not at open time, so it may be pointed at whatever still exists once the work is done — the next row's trigger, the empty state's first button. If it is empty or its element has also left the document, Modal falls back to the captured opener, and then to doing nothing, exactly as before this prop existed. The target is scrolled into view (`block: 'nearest'`) after focus; the captured opener is not. |
| `children` | `ReactNode` | yes | — | Compound children: Header / Body / Footer / Close + any consumer JSX. |
| `className` | `string` | no | — | className passes through to the dialog container. |
| `style` | `CSSProperties` | no | — | style passes through to the dialog container. |
| `aria-label` | `string` | no | — | Required for a11y when no Modal.Header is rendered. When Header IS rendered, aria-labelledby auto-binds to the heading id; this prop is then ignored. |
| `aria-describedby` | `string` | no | — | Optional id of an external descriptor element; sets aria-describedby on the dialog. |

### `ModalBodyProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `padding` | `"none" \| "default"` | no | — | Override body's padding. Default 'default' (--space-4). 'none' for edge-to-edge content. |
| …native | | | | plus native `<div>` attributes |

### `ModalCloseProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | Exactly one React element. Close clones this element to inject an `onClick` that closes the modal, chained with the child's existing `onClick` (consumer runs first). |

### `ModalFooterProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `align` | `"start" \| "end" \| "space-between"` | no | — | Horizontal action alignment. Default 'end'. |
| …native | | | | plus native `<div>` attributes |

### `ModalHeaderProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `closeButton` | `boolean` | no | — | Show the built-in × close button on the right edge. Default true. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- **Controlled-only.** Pass `open` + `onOpenChange` always. There is no `<Modal.Trigger>` — wire your own button(s).
- **Four sizes:** `sm` (400px), `md` (560px, default), `lg` (800px) size to their content; `full` is a near-full-screen reader, a **fixed** 95vw × 90dvh by default (tokens `--modal-content-width-full` / `--modal-content-height-full`) with Body scrolling between a pinned Header/Footer. Use it for long documents like an HTML email, not for short forms, which float in a mostly empty box. Below 640px every size goes fullscreen.
- **Overlay variant:** `overlay="solid"` (default, dark dim) or `overlay="blur"` (frosted-glass effect — light tint + `backdrop-filter: blur(4px)`). Avoid stacking three blurred modals — extra compositor cost per layer.
- **`<Modal.Header>` auto-wires `aria-labelledby`.** Pass `closeButton={false}` to hide the built-in × button (e.g. forced-step modals). The Header's children become the dialog title.
- **`<Modal.Body>` scrolls** when content overflows. `padding="none"` for edge-to-edge children (e.g. a tabs strip).
- **`<Modal.Footer>` defaults to right-aligned actions.** Use `align="space-between"` to split a danger action away from save/cancel.
- **`<Modal.Close>`** wraps a clickable child and fires `onOpenChange(false)` on click. Chains with the child's existing `onClick`.
- **Forced step:** combine `disableEscapeClose`, `dismissOnOverlayClick={false}`, omit `<Modal.Close>`, and pass `<Modal.Header closeButton={false}>` to lock the user into the modal until they resolve it programmatically.
- **Stacked modals.** Default `stackMode="overlay"`: the parent stays visible underneath and the inner overlay paints transparent so the parent's dim shows through (one effective dim layer for the stack). Use `stackMode="replace"` to hide the parent via `display: none` (React state preserved) — best for forced steps where the parent context is irrelevant. Escape still closes only the topmost — and yields to any open floating surface first (Select/Popover/menu/date-time popover: the first press closes the surface, the next closes the modal); body scroll stays locked across the whole stack.
- **Initial focus:** pass `initialFocusRef` to focus a specific element (e.g. the first input). Otherwise the dialog container receives focus and the focus trap takes over.
- **Return focus:** on close, focus goes back to whatever was focused when the modal opened. When that element will not survive the modal — a deleted row's `⋯` trigger, or a button that unmounts in the same commit that opens the modal — pass `returnFocusRef` and point it at something that still exists. It is read at CLOSE time, so you can set `returnFocusRef.current` after the work finishes (next row's trigger, or the empty state's first button). If it is empty or detached, Modal falls back to the captured opener, then to doing nothing. A `returnFocusRef` target is scrolled into view (`{ block: 'nearest' }`) since it may be far from where the user was; the captured opener is not scrolled. A Modal unmounted while still open (e.g. `{row && <Modal open …/>}`) restores the same way, but only if focus was lost — an element your code focused after the unmount keeps it.

**Anti-patterns:**

- ❌ Rendering a Modal as a child of another component that itself uses `position: fixed` — the portal escapes that container anyway, so the fixed positioning is dead code. Just render `<Modal>` at any level; it portals to `document.body`.
- ❌ Calling `onOpenChange={() => {}}` AND providing `<Modal.Close>` — the Close button calls `onOpenChange(false)` which then no-ops. Use `disableEscapeClose + dismissOnOverlayClick={false}` + omit Close for forced steps.
- ❌ Mutating an `initialFocusRef.current` value after open — Modal reads the ref when the modal opens AND whenever it becomes the top of the stack again (e.g., after a nested modal closes). Don't rely on a specific number of reads; instead, ensure the ref points at a stable element while the modal is open.
- ❌ Moving focus yourself in an effect after `onOpenChange(false)` — you race Modal's own restore, which runs in a layout effect. Pass `returnFocusRef` instead.
- ❌ Using `<Modal>` for popovers or non-blocking notifications. Use `<Popover>`, `<DropdownMenu>`, or wait for `<Toast>`.

- **`<Modal.Footer>`** is `role="group"` so screen readers announce the action set as a unit.
- **`<Modal.Close>`** requires exactly one React element child (it throws otherwise).
- ❌ Long scrollable forms with sticky footers containing additional sticky elements inside Body — flexbox + sticky compose badly. Use `<Modal.Footer>` for the actions and let Body scroll.
- ❌ Opening a modal from inside another modal without using `<Modal>` itself (e.g. a custom div with `position: fixed`) — skipping the stack registry breaks Esc routing and z-index ordering.
- ❌ Passing neither a `<Modal.Header>` nor an `aria-label` — warns in development; screen-reader users get no announcement on open.
- ❌ Inline confirms attached to a button — use `<ConfirmationPopover>`.

**See also:** `<Drawer>` for edge-anchored variant.
