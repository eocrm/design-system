# `Kbd`

Inline keyboard-shortcut display: one `<kbd>` chip per key, joined with a faint `+` separator. Use for shortcut hints in tooltips, command palettes, search inputs, and help/shortcut sheets.

```tsx
<Kbd keys={['⌘', 'K']} />
<Kbd keys={['Ctrl', 'Shift', 'P']} size="md" />
<Kbd keys={['Esc']} />
```

- `keys: string[]` — one chip per entry. Pass the literal labels you want shown — Kbd does NOT translate `Cmd` → `⌘` on macOS. App layer decides.
- `size: 'sm' | 'md'` — `sm` (default, 18px tall) matches `TopBar.Search`. `md` (24px) for standalone shortcut sheets.
- Wrapper carries `aria-label = keys.join(' + ')` (override via prop); inner `<kbd>` and `+` separator are `aria-hidden`.

**When NOT to use:** for inline code use `<Code>`; for chip-shaped text labels use `<Badge>`. `<kbd>` implies keyboard input semantically.
