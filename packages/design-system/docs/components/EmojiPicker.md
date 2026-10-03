# `<EmojiPicker>` — searchable emoji grid (reactions + input)

**Use to let the user pick an emoji** — a reaction chip, an inline insert into a
message/comment. Searchable, category-sectioned, keyboard-navigable 8-column grid
over a **curated common set** (not the full ~1900-emoji Unicode catalog;
skin-tone / ZWJ variants are out). It's the chooser only — calls
`onSelect(emoji: string)` on click or Enter/Space; it has no notion of which
emoji are already chosen or their counts. The bare picker is a surface — pair it
with a `Popover` (or use `EmojiPickerPopover`).

```tsx
// Inside a Popover you control (e.g. an "add reaction" button on a comment):
<Popover>
  <Popover.Trigger>
    <Button iconOnly variant="ghost" aria-label="Add reaction">
      <Smile size={16} />
    </Button>
  </Popover.Trigger>
  <Popover.Content>
    <EmojiPicker onSelect={(emoji) => addReaction(emoji)} />
  </Popover.Content>
</Popover>

// Batteries-included wrapper — owns the Popover, closes on select:
<EmojiPickerPopover
  trigger={<Button variant="secondary" size="sm">Add reaction</Button>}
  onSelect={(emoji) => appendToDraft(emoji)}
/>
```

<!-- props:start -->

## Props

### `EmojiPickerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `invalid` | `boolean` | no | Consumed so a Field / SettingRow wrapping the picker cannot leak it onto the root div. The picker has no value to validate, so it renders nothing. |
| `required` | `boolean` | no | Consumed for Field / SettingRow composition; the picker has no value, so nothing is forwarded. |
| `onSelect` | `(emoji: string) => void` | yes | Fired with the chosen emoji character (e.g. `'👍'`) when the user clicks a cell or presses Enter/Space on a focused cell. This is the picker's single output — wire it to insert into an editor, set a reaction, etc. |
| `recent` | `string[]` | no | Recently-used emoji characters (e.g. `['👍', '🎉', '❤️']`), most-recent first. When provided, a "Recently used" section renders at the top of the grid (only while not searching). The consumer owns persistence — keep the list yourself (e.g. in localStorage), update it in `onSelect`, and pass it back. Duplicates are de-duped; a char outside the curated set still renders (labelled by the char). Omit or pass `[]` for no recent section. |
| …native | | | plus native `<div>` attributes |

### `EmojiPickerPopoverProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `trigger` | `ReactNode` | yes | The element that opens the picker. Must be a single element that accepts a ref (this library's `<Button>` or a raw `<button>`); the open/close + ARIA wiring is injected by `Popover.Trigger`. |
| `onSelect` | `(emoji: string) => void` | yes | Fired with the chosen emoji character. Selecting always closes the popover (both controlled and uncontrolled). |
| `recent` | `string[]` | no | Recently-used emoji chars shown in a top "Recently used" section — see `EmojiPicker`. |
| `open` | `boolean` | no | Controlled open state. Provide alongside `onOpenChange` to drive open externally. Omit both to let the wrapper own its state (the common case). |
| `onOpenChange` | `((open: boolean) => void)` | no | Fired whenever the popover wants to change open state. Required when `open` is provided. |
| `defaultOpen` | `boolean` | no | Initial open state for uncontrolled usage. Defaults to `false`. |

<!-- props:end -->

`EmojiPickerPopover` takes `trigger` + `onSelect`, plus the standard
controlled-open contract (`open` / `onOpenChange` / `defaultOpen`).

`recent?: string[]` (on both) pins a "Recently used" section at the top (shown only
while not searching). The consumer owns persistence — keep the list (e.g.
localStorage), update it in `onSelect` (move-to-front + de-dupe + cap), pass it back.

**When NOT to use:** a small fixed reaction set (👍 ❤️ 🎉) → render a `Cluster`
of `Button`s; a searchable grid is overkill for 3-6 choices. Also not for inline
`:smile`-style autocomplete (the editor's suggestion engine owns that) or for
rendering existing reaction counts (the consumer builds that display).

```tsx
// Controlled wrapper
const [open, setOpen] = useState(false);
<EmojiPickerPopover open={open} onOpenChange={setOpen} trigger={<Button>Emoji</Button>} onSelect={setEmoji} />

// Reaction toggle on a comment
<EmojiPickerPopover
  trigger={<Button size="sm" variant="secondary">React</Button>}
  onSelect={(char) => toggleReaction(commentId, char)}
/>
```

❌ Expecting it to show which emoji a message already has or how many times — it only chooses.
