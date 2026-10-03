# `<Drawer>` — edge-anchored slide-in panel

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Show filters</Button>

<Drawer open={open} onOpenChange={setOpen} side="right" size="md">
  <Drawer.Header>Filters</Drawer.Header>
  <Drawer.Body>
    <Stack gap="md">
      <Input label="Name" value={...} onChange={...} />
    </Stack>
  </Drawer.Body>
  <Drawer.Footer>
    <Drawer.Close><Button variant="secondary">Cancel</Button></Drawer.Close>
    <Button onClick={apply}>Apply</Button>
  </Drawer.Footer>
</Drawer>
```

- **Controlled-only.** `open` + `onOpenChange` always.
- **Four sides:** `left`, `right` (default), `top`, `bottom`. Each slides in from its edge.
- **Three sizes:** `sm` (320px), `md` (440px, default), `lg` (640px). Capped to `viewport - 32px` on narrow viewports; always edge-anchored, never fullscreen.
- **Drag-to-close** on mobile: swipe the Header in the dismiss direction (right drawer → swipe right, bottom → swipe down, etc.). Threshold: 40% of drawer size or 0.5 px/ms velocity. Opt out with `dragToClose={false}`.
- **Overlay variants:** `overlay="solid"` (default) or `overlay="blur"` (frosted-glass with `backdrop-filter: blur(4px)`).
- **Stacks with Modal.** Both share one overlay registry — a Drawer can open from inside a Modal (and vice versa). Escape closes the topmost regardless of type — after yielding to any open floating surface (innermost-first: the first press closes the surface, the next closes the host); body scroll lock is shared.
- **Focus return:** the element focused before the Drawer opened gets focus back on close — also when the Drawer mounts already open (`{seed && <Drawer open …/>}`) and when it unmounts while open. On unmount it only restores if focus was actually lost, so an element your own code focused after the unmount keeps focus.
- **Forced step:** combine `disableEscapeClose + dismissOnOverlayClick={false} + dragToClose={false}` + `<Drawer.Header closeButton={false}>` + omit `<Drawer.Close>`.

**Anti-patterns:**

- ❌ Same-side stacked drawers as a navigation pattern. They visually overlap — use route changes instead.
- ❌ Drag from inside `<Drawer.Body>` does not close the drawer. Only Header is draggable (so Body scroll works correctly).
- ❌ For center-anchored dialogs, use `<Modal>` not Drawer.

**See also:** `<Modal>` for center-anchored variant.
