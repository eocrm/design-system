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

`EmojiPickerPopover` takes `trigger` + `onSelect`, plus the standard
controlled-open contract (`open` / `onOpenChange` / `defaultOpen`).

`recent?: string[]` (on both) pins a "Recently used" section at the top (shown only
while not searching). The consumer owns persistence — keep the list (e.g.
localStorage), update it in `onSelect` (move-to-front + de-dupe + cap), pass it back.

**When NOT to use:** a small fixed reaction set (👍 ❤️ 🎉) → render a `Cluster`
of `Button`s; a searchable grid is overkill for 3-6 choices. Also not for inline
`:smile`-style autocomplete (the editor's suggestion engine owns that) or for
rendering existing reaction counts (the consumer builds that display).
