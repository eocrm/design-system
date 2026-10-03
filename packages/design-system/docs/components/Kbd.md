# `Kbd`

Inline keyboard-shortcut display: one `<kbd>` chip per key, joined with a faint `+` separator. Use for shortcut hints in tooltips, command palettes, search inputs, and help/shortcut sheets.

```tsx
<Kbd keys={['⌘', 'K']} />
<Kbd keys={['Ctrl', 'Shift', 'P']} size="md" />
<Kbd keys={['Esc']} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `keys` | `string[]` | yes | — | Keys to display. Each entry renders one `<kbd>` chip. Multiple entries are joined with an inline `+` separator; a single-entry array renders no separator. Pass the literal label you want shown (`'⌘'`, `'Ctrl'`, `'Shift'`, `'K'`) — the component does NOT platform-translate. |
| `size` | `'sm' \| 'md'` | no | 'sm' | Visual size. `'sm'` is the inline-chrome size (18px tall — matches `TopBar.Search`'s hotkey hint). `'md'` is the standalone shortcut size (24px tall — for command-palette / shortcut-sheet UI). |
| `aria-label` | `string` | no | — | Accessible label for the whole shortcut, read as a single phrase by screen readers. Defaults to `keys.join(' + ')` (e.g. `'⌘ + K'`) when omitted OR empty — an empty string is not an explicit name, so it takes the default too. Override when the raw keys are unintuitive — e.g. `keys={['⌘', 'K']}` with `aria-label="Open command palette"`. |
| …native | | | | plus native `<span>` attributes |

<!-- props:end -->

- Wrapper carries `aria-label = keys.join(' + ')` (override via prop); inner `<kbd>` and `+` separator are `aria-hidden`.

**When NOT to use:** for inline code use `<Code>`; for chip-shaped text labels use `<Badge>`. `<kbd>` implies keyboard input semantically.

```tsx
<Tooltip
  content={
    <>
      Save <Kbd keys={['⌘', 'S']} />
    </>
  }
>
  <Button>Save</Button>
</Tooltip>
```

- ❌ Nesting a `<Kbd>` inside a button as its only label. Use the button's `aria-label` and render the Kbd as a separate visual hint.
