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

<!-- props:start -->

## Props

### `DrawerProps`

| Prop                    | Type                             | Required | Default | Description                                                                                                                                               |
| ----------------------- | -------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                  | `boolean`                        | yes      | —       | Controlled open state. Required — Drawer has no uncontrolled mode.                                                                                        |
| `onOpenChange`          | `(open: boolean) => void`        | yes      | —       | Fired when Drawer wants to change open state — Esc, overlay click, Close, swipe, programmatic.                                                            |
| `side`                  | `DrawerSide`                     | no       | —       | Edge the drawer slides in from. Defaults to 'right'.                                                                                                      |
| `size`                  | `DrawerSize`                     | no       | —       | Size preset. Width for left/right, height for top/bottom. Defaults to 'md'.                                                                               |
| `overlay`               | `DrawerOverlayVariant`           | no       | —       | Overlay variant. 'solid' (default) \| 'blur'.                                                                                                             |
| `stackMode`             | `OverlayStackMode`               | no       | —       | How this drawer relates to other open overlays (Modals or Drawers). 'overlay' (default): parent stays visible. 'replace': parent hidden via display:none. |
| `disableEscapeClose`    | `boolean`                        | no       | —       | Disable Escape-to-close. Default false.                                                                                                                   |
| `dismissOnOverlayClick` | `boolean`                        | no       | —       | When false, overlay click does NOT close. Default true.                                                                                                   |
| `dragToClose`           | `boolean`                        | no       | —       | Enable swipe-to-close gesture on touch devices (from Header). Default true.                                                                               |
| `initialFocusRef`       | `RefObject<HTMLElement \| null>` | no       | —       | Initial focus target on open.                                                                                                                             |
| `children`              | `ReactNode`                      | yes      | —       |                                                                                                                                                           |
| `className`             | `string`                         | no       | —       |                                                                                                                                                           |
| `style`                 | `CSSProperties`                  | no       | —       |                                                                                                                                                           |
| `aria-label`            | `string`                         | no       | —       |                                                                                                                                                           |
| `aria-describedby`      | `string`                         | no       | —       |                                                                                                                                                           |

### `DrawerBodyProps`

| Prop      | Type                  | Required | Default | Description                                                                    |
| --------- | --------------------- | -------- | ------- | ------------------------------------------------------------------------------ |
| `padding` | `"none" \| "default"` | no       | —       | Override body padding. Default 'default' (--space-4). 'none' for edge-to-edge. |
| …native   |                       |          |         | plus native `<div>` attributes                                                 |

### `DrawerCloseProps`

| Prop       | Type                                                          | Required | Default | Description                                                                                                                        |
| ---------- | ------------------------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes      | —       | Exactly one React element. Close clones it to inject an onClick that closes the drawer, chained with the child's existing onClick. |

### `DrawerFooterProps`

| Prop    | Type                                  | Required | Default | Description                                 |
| ------- | ------------------------------------- | -------- | ------- | ------------------------------------------- |
| `align` | `"start" \| "end" \| "space-between"` | no       | —       | Horizontal action alignment. Default 'end'. |
| …native |                                       |          |         | plus native `<div>` attributes              |

### `DrawerHeaderProps`

| Prop          | Type      | Required | Default | Description                                     |
| ------------- | --------- | -------- | ------- | ----------------------------------------------- |
| `closeButton` | `boolean` | no       | —       | Show the built-in × close button. Default true. |
| …native       |           |          |         | plus native `<div>` attributes                  |

<!-- props:end -->

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
