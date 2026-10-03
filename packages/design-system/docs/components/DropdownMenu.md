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

<!-- props:start -->

## Props

### `DropdownMenuProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | Must contain exactly one `<DropdownMenu.Trigger>` and one `<DropdownMenu.Content>`. |
| `open` | `boolean` | no | — | Controlled open state. Provide alongside `onOpenChange` to drive open externally. Omit both to let DropdownMenu own its own state (the common case). |
| `onOpenChange` | `((open: boolean) => void)` | no | — | Fired whenever DropdownMenu wants to change open state. Required when `open` is provided. |
| `defaultOpen` | `boolean` | no | — | Default open state for uncontrolled usage. Defaults to `false`. |

### `DropdownMenuCheckboxItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `checked` | `boolean` | yes | — | Whether the item is checked. |
| `onCheckedChange` | `(checked: boolean) => void` | yes | — | Called with the new checked state when activated (click or Enter/Space). |
| `closeOnSelect` | `boolean` | no | — | Whether activating closes the entire menu chain. Defaults to `false` — checkbox items typically toggle in place inside a multi-select menu. Set to `true` for single-toggle "apply and close" patterns. |
| `disabled` | `boolean` | no | — | Disabled items don't fire `onCheckedChange`, are skipped by keyboard nav, and render dimmed. |
| `icon` | `ReactNode` | no | — | Leading icon, rendered in a fixed-size slot before the label (parity with `<DropdownMenu.Item icon>`). Prefer this over inlining an icon into `children`: typeahead derives its match string from the string children, so an inlined leading icon leaves the JSX whitespace `" "` as the first string child and breaks first-letter type-to-select. Passing the icon here keeps the typeahead label the pure label string. Mark the glyph `aria-hidden`. |
| `shortcut` | `string` | no | — | Optional trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. |
| `meta` | `ReactNode` | no | — | Trailing secondary content *about the item itself* — a region code, a count, a `<Badge>`. Distinct from `shortcut`, which is a keyboard hint and is styled (and free to evolve) as one. `ReactNode`, so a Badge or Dot can go here. It is NOT `aria-hidden`, so it joins the item's accessible name ("demo RU" rather than a second identical "demo") — which is the point when the label alone is ambiguous. It is a prop, not a child, so it stays out of the typeahead label; type-to-select still matches the pure label text. Renders before `shortcut` when both are present, keeping the keyboard hint rightmost. |
| `children` | `ReactNode` | yes | — | Item content. May include a `<DropdownMenu.ItemIndicator>` as a direct child to provide a custom indicator glyph. |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuContentProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `side` | `DropdownMenuSide` | no | — | Preferred side. Default `'bottom'`. Auto-flips on collision. |
| `align` | `DropdownMenuAlign` | no | — | Edge alignment. Default `'start'`. |
| `sideOffset` | `number` | no | — | Gap in px between trigger and menu. Default `4`. |
| `minWidth` | `string \| number` | no | — | Preferred minimum width in px or any CSS length. Defaults to the trigger's width and is reduced when necessary to keep the menu within the viewport. |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuGroupProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | Menu items (and optionally a `<DropdownMenu.Label>`) to include in the group. |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuItemIndicatorProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | no | — | Indicator content (icon, custom glyph, animated element) to render in the parent item's indicator slot. The parent — CheckboxItem or RadioItem — decides when this is rendered based on its own `checked` state. |
| …native | | | | plus native `<span>` attributes |

### `DropdownMenuItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `onSelect` | `() => void` | yes | — | Called when the item is activated (click or Enter/Space). The consumer performs the action. |
| `tone` | `DropdownMenuItemTone` | no | — | Visual tone. - `'default'` — normal action. - `'danger'` — destructive (Delete, Revoke, Remove). Reserve for irreversible operations. |
| `icon` | `ReactNode` | no | — | Leading icon. Rendered in a fixed-size slot so labels stay aligned across items. |
| `shortcut` | `string` | no | — | Trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. |
| `meta` | `ReactNode` | no | — | Trailing secondary content *about the item itself* — a region code, a count, a `<Badge>`. Distinct from `shortcut`, which is a keyboard hint and is styled (and free to evolve) as one. `ReactNode`, so a Badge or Dot can go here. It is NOT `aria-hidden`, so it joins the item's accessible name ("demo RU" rather than a second identical "demo") — which is the point when the label alone is ambiguous. It is a prop, not a child, so it stays out of the typeahead label; type-to-select still matches the pure label text. Renders before `shortcut` when both are present, keeping the keyboard hint rightmost. |
| `disabled` | `boolean` | no | — | Disabled items are skipped by keyboard nav, dimmed, and don't fire `onSelect` on click. |
| `closeOnSelect` | `boolean` | no | — | Whether to close the menu after `onSelect` fires. Defaults to `true`. Set to `false` when this item is wrapped in a Popover/ConfirmationPopover trigger — the trigger will open its panel on this click; closing the menu would unmount the popover before the user could interact with it. The menu can be dismissed separately (Escape or outside-click). |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuLabelProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | The label text content. |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuRadioGroupProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | The currently-selected value. Must match the `value` prop of one of the child RadioItems. |
| `onValueChange` | `(value: string) => void` | yes | — | Called with the new value when a `<DropdownMenu.RadioItem>` is activated. |
| `children` | `ReactNode` | yes | — | `<DropdownMenu.RadioItem>` children (and optionally `<DropdownMenu.Label>`). |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuRadioItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value this item represents. Activating sets the parent RadioGroup's value to this. |
| `closeOnSelect` | `boolean` | no | — | Whether activating closes the entire menu chain. Defaults to `true` — radio selection IS the action; the menu's job is done once a value is chosen. Set to `false` for preview-style selection where the menu stays open. |
| `disabled` | `boolean` | no | — | Disabled items don't fire `onValueChange`, are skipped by keyboard nav, and render dimmed. |
| `icon` | `ReactNode` | no | — | Leading icon, rendered in a fixed-size slot before the label (parity with `<DropdownMenu.Item icon>`). Prefer this over inlining an icon into `children`: typeahead derives its match string from the string children, so an inlined leading icon leaves the JSX whitespace `" "` as the first string child and breaks first-letter type-to-select. Passing the icon here keeps the typeahead label the pure label string. Mark the glyph `aria-hidden`. |
| `shortcut` | `string` | no | — | Optional trailing shortcut hint (e.g. `'⌘N'`). Visual cue only — does NOT register a global key handler. |
| `meta` | `ReactNode` | no | — | Trailing secondary content *about the item itself* — a region code, a count, a `<Badge>`. Distinct from `shortcut`, which is a keyboard hint and is styled (and free to evolve) as one. `ReactNode`, so a Badge or Dot can go here. It is NOT `aria-hidden`, so it joins the item's accessible name ("demo RU" rather than a second identical "demo") — which is the point when the label alone is ambiguous. It is a prop, not a child, so it stays out of the typeahead label; type-to-select still matches the pure label text. Renders before `shortcut` when both are present, keeping the keyboard hint rightmost. |
| `children` | `ReactNode` | yes | — | Item content. May include a `<DropdownMenu.ItemIndicator>` as a direct child to provide a custom indicator glyph. |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuSeparatorProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuSubContentProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `side` | `DropdownMenuSide` | no | — | Preferred side. Default `'bottom'`. Auto-flips on collision. |
| `align` | `DropdownMenuAlign` | no | — | Edge alignment. Default `'start'`. |
| `sideOffset` | `number` | no | — | Gap in px between trigger and menu. Default `4`. |
| `minWidth` | `string \| number` | no | — | Preferred minimum width in px or any CSS length. Defaults to the trigger's width and is reduced when necessary to keep the menu within the viewport. |
| …native | | | | plus native HTML attributes |

### `DropdownMenuSubProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | The submenu trigger and content to render. Should contain exactly one `<DropdownMenu.SubTrigger>` and one `<DropdownMenu.SubContent>`. |
| `open` | `boolean` | no | — | Controlled open state. When provided, `defaultOpen` is ignored. |
| `onOpenChange` | `((open: boolean) => void)` | no | — | Called when the open state changes (user opens or closes the sub). |
| `defaultOpen` | `boolean` | no | — | Initial open state when uncontrolled. Defaults to `false`. |

### `DropdownMenuSubTriggerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `disabled` | `boolean` | no | — | When `true`, the trigger renders dimmed and pointer/keyboard interaction does not open the sub. |
| `icon` | `ReactNode` | no | — | Optional leading icon. Rendered in a fixed-size slot, matching `<DropdownMenu.Item>`'s icon slot. |
| `children` | `ReactNode` | yes | — | The trigger label text. String children participate in the parent menu's typeahead. |
| …native | | | | plus native `<div>` attributes |

### `DropdownMenuTriggerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | — | Exactly one React element. The Trigger clones this element to inject a ref, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, and the pointerdown/keyboard handlers that open the menu. The child must accept a ref (i.e. use `forwardRef` if it's a custom component); a raw `<button>` or the library's `<Button>` both qualify. |

<!-- props:end -->

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

- ❌ Using DropdownMenu as a panel (a notification centre, a header with a "Mark all as read" button, rich feed rows). It is `role="menu"`, which may only hold menu items; a header button is invalid ARIA and unreachable by the menu's arrow keys. Use `Popover` + `ScrollArea`.
