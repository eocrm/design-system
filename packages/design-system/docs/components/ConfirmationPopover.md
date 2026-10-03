# `<ConfirmationPopover>` — opinionated "Are you sure?" preset

```tsx
<ConfirmationPopover
  title="Delete record?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={async () => {
    await api.deleteRecord(id);
  }}
>
  <Button variant="danger">Delete</Button>
</ConfirmationPopover>

// Default variant: lighter-weight (archive, publish, etc.)
<ConfirmationPopover
  title="Archive this contact?"
  description="You can unarchive later from the archive view."
  onConfirm={() => archive(id)}
>
  <Button variant="secondary">Archive</Button>
</ConfirmationPopover>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | The trigger element. Same forwardRef-required contract as `<Popover.Trigger>` — `<Button>` qualifies; a custom component without `forwardRef` does not. |
| `title` | `string` | yes | — | Heading text. Renders inside `<Popover.Heading>` (an `<h3>`) and wires `aria-labelledby` on the dialog automatically. |
| `description` | `ReactNode` | no | — | Optional body text below the title. When provided, wires `aria-describedby` so screen readers announce it. |
| `confirmLabel` | `string` | no | — | Confirm button label. Defaults to the i18n value at `confirmationPopover.confirm` (`'Confirm'` in English). An EMPTY string counts as unset, not as an explicit blank: this label is the confirm button's only name source (the pending spinner beside it is `aria-hidden`), so an empty one would leave the button anonymous. |
| `variant` | `ConfirmationVariant` | no | — | `'danger'` makes Confirm a danger-variant button. Defaults to `'default'` (primary). |
| `onConfirm` | `() => void \| Promise<void>` | yes | — | Async-aware confirm handler. May return a Promise; while pending, both buttons disable, the Confirm button shows a small spinner, and Escape / click-outside dismissal is blocked. - Resolve → popover closes. - Reject → popover stays open, buttons re-enable. `onCancel` is NOT fired (the user neither confirmed nor cancelled — it's an error state owned by the consumer). The consumer is expected to surface error feedback externally (toast, inline message, etc.). ConfirmationPopover does NOT render errors. |
| `onCancel` | `(() => void)` | no | — | Optional. Fires on Cancel click, Escape, or click-outside dismissal. NOT fired if `onConfirm` rejects. |
| `initialFocusRef` | `RefObject<HTMLElement \| null>` | no | — | Direct initial focus into the panel's content instead of the default Cancel button — e.g. an `<Input>` rendered in `description` for a rename flow. When provided and its `.current` is non-null on open, the component focuses this element after the panel mounts (skipping the Cancel-focus). Tip: add `onFocus={(e) => e.currentTarget.select()}` to a text input to select its contents so the user can type/replace immediately. |
| `returnFocusRef` | `RefObject<HTMLElement \| null>` | no | — | Where focus goes when the popover closes. Default: back to the trigger. That default breaks whenever the trigger is gone by close time — the confirmed action deleted the row that owned it — and focus lands on `<body>`, so a keyboard user loses their place. The ref is read **at close time**, not at open time, so it may be pointed at whatever still exists once the work is done — the next row's trigger, the empty state's first button. If it is empty or its element has left the document, focus falls back to the trigger (when it still exists). It applies when the popover closes via Confirm, Cancel or Escape. An outside click never restores focus — focus stays wherever the click put it (on a control, or `<body>` for an inert area). A ref that is set statically (not only inside `onConfirm`) ALSO fires when the user closes by clicking the trigger again, pulling focus off the trigger. To return to the trigger on Cancel / toggle and only move elsewhere after a confirm, aim the ref inside `onConfirm` and clear it in `onOpenChange(true)`. If focus is already on some other live element when the popover closes, it is left alone. The target is scrolled into view with `{ block: 'nearest' }` (a no-op when it is already visible) — it may be far from where the user was. |
| `side` | `"left" \| "right" \| "top" \| "bottom"` | no | — | Preferred side. Default `'top'` — confirmations anchor above the trigger by convention. |
| `align` | `"start" \| "end" \| "center"` | no | — | Edge alignment. Default `'center'`. |
| `sideOffset` | `number` | no | — | Gap in px between trigger and panel. Default `10`. |
| `open` | `boolean` | no | — | Controlled open state. Pair with `onOpenChange`. |
| `onOpenChange` | `((open: boolean) => void)` | no | — | Open-change callback. Required when `open` is provided. |
| `defaultOpen` | `boolean` | no | — | Default open state for uncontrolled usage. Defaults to `false`. |

<!-- props:end -->

- Built on top of `<Popover>`. Declarative: `title` / `description` / `confirmLabel` / `cancelLabel` / `variant` / `onConfirm` / `onCancel`.
- **Initial focus on Cancel** for both variants — keyboard Enter never accidentally confirms. Tab once to Confirm.
- **`initialFocusRef`** (`RefObject<HTMLElement | null>`) overrides the Cancel default: directs initial focus into the `description` content instead — e.g. an `<Input>` rendered there for a rename flow. The component focuses `initialFocusRef.current` after the panel mounts (mirrors `<Modal>`'s `initialFocusRef`). Tip: add `onFocus={(e) => e.currentTarget.select()}` to a text input so its contents are selected on open and the user can type a replacement immediately.
- **Async-aware** `onConfirm`. May return a Promise. While pending, both buttons take `aria-disabled` (NOT the native `disabled`, which would drop them from the tab order and blow away focus mid-operation), their handlers no-op, Confirm shows a spinner, the pending state is announced, and Escape / click-outside are blocked.
- **Failure mode**: on reject, popover stays open and buttons re-enable. Consumer surfaces the error externally — ConfirmationPopover does NOT render inline errors.
- **Return focus** (`returnFocusRef`): on Confirm, Cancel and Escape focus returns to `returnFocusRef` when it is connected, otherwise to the trigger. Unlike `<Modal>`, an outside click never restores focus — it stays wherever the user clicked. `returnFocusRef` is read at CLOSE time. A statically-set ref also fires when the user closes by clicking the trigger again; to apply it only after a successful confirm, set it in `onConfirm` and clear it in `onOpenChange(true)`. A named target is scrolled into view with `{ block: 'nearest' }`.
- Anchors above the trigger by default (`side="top"`).
- **From a DropdownMenu item (kebab Delete pattern).** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the trigger — clicking anywhere on the row opens the confirmation. The menu stays open until the user dismisses it (Escape or click outside). To close the menu after the action resolves, drive `DropdownMenu`'s `open` state externally and call `setMenuOpen(false)` inside `onConfirm` — and pass `returnFocusRef={kebabTriggerRef}` (the menu's trigger), because closing the menu unmounts the item that is the popover's trigger, so focus would otherwise drop to `<body>`.

#### When NOT to use

- ❌ A multi-step flow ("type the name to confirm") → `Modal`. This is for one-tap confirmations.
- ❌ A non-blocking heads-up that needs no yes/no answer → a Toast or inline UI.

#### Anti-patterns

- ❌ A hanging-forever `onConfirm` Promise. There is no timeout; the popover stays pending indefinitely, so add a timeout / abort inside your `onConfirm` if the operation may stall.
- ❌ Expecting the rejection to render inside the popover body. Surface errors via toast or page-level UI.
- ❌ Controlled `open` while relying on pending-blocks-close. With `open` / `onOpenChange` you can force-close from outside while pending; coordinate `pending` in your own code if that matters.
- ❌ Letting a confirmed delete remove the trigger with no `returnFocusRef`: focus drops to `<body>`. Aim the ref at the next row's trigger (or the empty state) inside `onConfirm`.
