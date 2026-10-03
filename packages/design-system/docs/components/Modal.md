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

**See also:** `<Drawer>` for edge-anchored variant.
