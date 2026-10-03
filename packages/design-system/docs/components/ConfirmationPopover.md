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
```

- Built on top of `<Popover>`. Declarative: `title` / `description` / `confirmLabel` / `cancelLabel` / `variant` / `onConfirm` / `onCancel`.
- `variant`: `'default'` (Confirm is primary) | `'danger'` (Confirm is danger).
- **Initial focus on Cancel** for both variants — keyboard Enter never accidentally confirms. Tab once to Confirm.
- **`initialFocusRef`** (`RefObject<HTMLElement | null>`) overrides the Cancel default: directs initial focus into the `description` content instead — e.g. an `<Input>` rendered there for a rename flow. The component focuses `initialFocusRef.current` after the panel mounts (mirrors `<Modal>`'s `initialFocusRef`). Tip: add `onFocus={(e) => e.currentTarget.select()}` to a text input so its contents are selected on open and the user can type a replacement immediately.
- **Async-aware** `onConfirm`. May return a Promise. While pending, both buttons take `aria-disabled` (NOT the native `disabled`, which would drop them from the tab order and blow away focus mid-operation), their handlers no-op, Confirm shows a spinner, the pending state is announced, and Escape / click-outside are blocked.
- **Failure mode**: on reject, popover stays open and buttons re-enable. Consumer surfaces the error externally — ConfirmationPopover does NOT render inline errors.
- **Return focus** (`returnFocusRef`): on Confirm, Cancel and Escape focus returns to `returnFocusRef` when it is connected, otherwise to the trigger. Unlike `<Modal>`, an outside click never restores focus — it stays wherever the user clicked. `returnFocusRef` is read at CLOSE time. A statically-set ref also fires when the user closes by clicking the trigger again; to apply it only after a successful confirm, set it in `onConfirm` and clear it in `onOpenChange(true)`. A named target is scrolled into view with `{ block: 'nearest' }`.
- Anchors above the trigger by default (`side="top"`).
- **From a DropdownMenu item (kebab Delete pattern).** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the trigger — clicking anywhere on the row opens the confirmation. The menu stays open until the user dismisses it (Escape or click outside). To close the menu after the action resolves, drive `DropdownMenu`'s `open` state externally and call `setMenuOpen(false)` inside `onConfirm` — and pass `returnFocusRef={kebabTriggerRef}` (the menu's trigger), because closing the menu unmounts the item that is the popover's trigger, so focus would otherwise drop to `<body>`.
