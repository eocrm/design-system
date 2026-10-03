# `<DropdownMenu>` — action menus from a trigger

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={remove} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```

- Compound API: `<DropdownMenu>` is the provider; `<Trigger>` clones its single child to inject ARIA + handlers; `<Content>` portals to `document.body` and positions itself with Floating UI; `<Item>` renders a `menuitem`; `<Separator>` renders a divider.
- Trigger child must accept a ref via `forwardRef`. `<Button>` does.
- `<Item>` props: `onSelect` (required), `disabled`, `tone` (`'default'` | `'danger'`), `icon`, `shortcut`, `meta`, `closeOnSelect` (default `true`; set to `false` when wrapping the Item in a `<Popover.Trigger>` or `<ConfirmationPopover>` — otherwise the menu close would unmount the popover before it can render).
- `<Content>` props: `side` (`'top'` | `'bottom'`, default `'bottom'`), `align` (`'start'` | `'center'` | `'end'`, default `'start'`), `sideOffset` (default `4`), `minWidth`.
- Keyboard: Enter/Space/ArrowDown on trigger opens with first item active; ArrowUp opens with last; Arrow/Home/End navigate skipping disabled and separators; Enter/Space activates; Escape closes and returns focus to trigger; Tab closes and returns focus to trigger (then continues normal traversal); typeahead jumps to first matching label (500ms debounce).
- Opens with a short scale-fade from the trigger side (140 ms `ease-out`). Closes instantly by design — menu close should feel like "get out of the way", not "play a transition". Respects `prefers-reduced-motion: reduce`.
- For value selection (pick a status, country, etc.), use `<Select>` (not yet shipped) — DropdownMenu is for actions, not form values.
- **Overlay host (like Popover).** A `DropdownMenu` content panel is also an overlay host: a `Popover` / `ConfirmationPopover` / `Select` / date-time popover (`DatePicker` / `DateRangePicker` / `TimeField`) opened from a `DropdownMenu.Item` auto-elevates to `--z-overlay-floating` (1190) so it floats above the menu (and above any Popover the menu itself lives in). Normal submenus are unaffected — they inherit the root trigger's overlay state.

#### v2 — submenus, checkboxes, radios, groups

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Filters</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Status</DropdownMenu.Label>
      <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
        Active
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
        Pending
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <DropdownMenu.Group>
      <DropdownMenu.Label>Sort by</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={exportCsv}>Export CSV</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={exportJson}>Export JSON</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu>
```

- `<CheckboxItem>` — `role="menuitemcheckbox"`, `aria-checked`. Default `closeOnSelect={false}` (multi-select friendly). Pass `closeOnSelect` to override. Checked items render an info-tinted row + 2px left accent (no glyph by default).
- `<RadioGroup>` + `<RadioItem>` — `role="radiogroup"` / `role="menuitemradio"`. Default `closeOnSelect={true}` (radio = the selection IS the action). Selected item gets the same info-tinted-row treatment as checked CheckboxItem.
- **Leading `icon` on `CheckboxItem` / `RadioItem`** (parity with `<Item icon>`) — pass a per-row glyph via the `icon` prop, **not** inlined into `children`. Typeahead derives its match string from the string children, so an inlined leading icon leaves the JSX whitespace `" "` as the first string child and kills first-letter type-to-select; the `icon` prop keeps the typeahead label the pure string. Mark the glyph `aria-hidden`. `icon={<Moon size={14} aria-hidden />}`.
- `<Group>` + `<Label>` — wrap a section. Group is `role="group"` with `aria-labelledby` to the Label. Label outside Group still renders, no aria wiring.
- `<Sub>` + `<SubTrigger>` + `<SubContent>` — nested menu. SubTrigger registers in the parent menu; SubContent is its own portaled panel. Opens on click, hover (100ms delay), Enter, or ArrowRight. Closes on ArrowLeft (level-only), Escape (level-only), click-outside (all levels), or selecting an item with `closeOnSelect=true` (all levels — cascading close).
- `<ItemIndicator>` — optional slot child of CheckboxItem/RadioItem that adds a custom indicator glyph alongside the tinted-row treatment. Omit entirely when the row tint is sufficient (the common case). Detection is shallow: must be a direct child.
- Per WAI-ARIA, mixing CheckboxItem and RadioItem in the same RadioGroup is invalid; CheckboxItems live outside RadioGroup.
- **Trailing `meta` on `Item` / `CheckboxItem` / `RadioItem`** — secondary content _about the item itself_ (a region code, a count, a `<Badge>`). `ReactNode`. It is **not** `shortcut`: `shortcut` is a keyboard hint, styled as one, and free to become a `<Kbd>` key cap. Two rows whose labels legitimately collide (two workspaces both named `demo`) are disambiguated with `meta`, not `shortcut`.

  ```tsx
  <DropdownMenu.RadioGroup value={workspace} onValueChange={setWorkspace}>
    <DropdownMenu.RadioItem value="demo-eu" meta="EU">
      demo
    </DropdownMenu.RadioItem>
    <DropdownMenu.RadioItem value="demo-ru" meta="RU">
      demo
    </DropdownMenu.RadioItem>
  </DropdownMenu.RadioGroup>
  ```

  `meta` renders after the label and before `shortcut` (the keyboard hint stays rightmost). It carries no `aria-hidden`, so it **joins the accessible name** — a screen reader announces "demo RU". Because it is a prop and not a child, it stays **out of the typeahead label**: type-to-select still matches the bare label.

- ❌ Using DropdownMenu as a panel (a notification centre, a header with a "Mark all as read" button, rich feed rows). It is `role="menu"`, which may only hold menu items; a header button is invalid ARIA and unreachable by the menu's arrow keys. Use `Popover` + `ScrollArea` (#598).
