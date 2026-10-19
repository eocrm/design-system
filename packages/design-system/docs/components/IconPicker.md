# `<IconPicker>` — choose one glyph from a consumer catalog

**TL;DR:** controlled popover grid for choosing one icon from a consumer-curated catalog. Add `color` + `onColorChange` to also pick a palette colour, and `size` to match `Input` / `Select` heights.

```tsx
const options = [
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
];
<Field label="Priority icon">
  <IconPicker value={icon} options={options} onChange={setIcon} />
</Field>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string` | yes | Currently selected option value. Controlled — required. |
| `options` | `IconPickerOption[]` | yes | Consumer-curated icons rendered in the supplied order. Values must be stable and unique. An empty list disables the trigger. |
| `onChange` | `(value: string) => void` | yes | Fires exactly once with the chosen option value, including when it equals the controlled `value`. Closes the popover in icon-only mode; colour mode keeps it open. |
| `disabled` | `boolean` | no | Disables the trigger, prevents opening and selection, and closes an open picker. Default: `false`. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Trigger size, matching the sm/md/lg field heights. Default: `'md'`. |
| `invalid` | `boolean` | no | Marks the focusable trigger invalid for Field composition. Default: `false`. |
| `required` | `boolean` | no | Consumed for Field composition so Field can render its visible required marker. Native buttons do not support `aria-required`, so this does not add required semantics to the trigger. Default: `false`. |
| `popoverPlacement` | `'top' \| 'top-start' \| 'top-end' \| 'bottom' \| 'bottom-start' \| 'bottom-end'` | no | Preferred popover placement. Floating UI may flip it to remain visible. - `'top'` — above, centered. - `'top-start'` — above, start-aligned. - `'top-end'` — above, end-aligned. - `'bottom'` — below, centered. - `'bottom-start'` — below, start-aligned. - `'bottom-end'` — below, end-aligned. Default: `'bottom-start'`. |
| `aria-label` | `string` | no | Accessible picker purpose. It names the trigger with the selected icon appended and names the dialog plus radiogroup without that suffix. Defaults to the localized `iconPicker.triggerLabel` value when omitted OR empty — an empty string is not an explicit name, so it takes the default too. In colour mode the default is `iconPicker.triggerLabelWithColor` and the trigger appends the colour name as well. |
| `aria-labelledby` | `string` | no | Id(s) of external elements that provide the picker purpose. They name the dialog and radiogroup directly. The trigger also references hidden selected-option text so its name remains the visible purpose plus the current selection. |
| `aria-describedby` | `string` | no | Id(s) of element(s) that describe the trigger button. |
| `color` | `PaletteColor` | no | Controlled palette colour. Passing it turns on colour mode. |
| `onColorChange` | `(color: PaletteColor) => void` | no | Fires with the chosen palette colour; the popover stays open. |
| `colors` | `readonly PaletteColor[]` | no | Offered colours, in order. Default: `PALETTE_COLORS`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- The consumer owns icon values, labels, glyphs, ordering, and controlled state.
- `<Field label>` names the trigger with the visible label plus the selected option, and forwards description and invalid state to that button; the dialog and radiogroup use only the visible Field label. These attributes do not sit on the role-less wrapper. `required` remains a visible Field marker rather than unsupported `aria-required` on the native button.
- Use it for compact visual choices; use `Select` when visible option text matters.
- Labels must be human-readable and values unique. Do not pass icon codes as labels.
- Controlled-only. Not for a small always-visible set of text choices (use `<RadioGroup>`) or for actions rather than a persistent value (use `<DropdownMenu>`).
- Do not place buttons, links or other focusable content inside an option glyph.

```tsx
const [icon, setIcon] = useState('flame');
<Cluster gap="sm" align="center">
  <IconPicker value={icon} options={iconOptions} onChange={setIcon} />
  <Text>{icon}</Text>
</Cluster>;
```

## Colour mode

Pass `color` + `onColorChange` (both or neither) to also pick a palette colour. The trigger is tinted, the popover shows "Colour" and "Icon" groups, and picking does not close it. `colors` defaults to all 30 palette colours; narrow it to a subset. A disabled picker keeps its tint, dimmed.

Keyboard in colour mode: Tab moves between the Colour and Icon groups, arrows move and select, picking keeps the popover open, Esc closes and returns focus to the trigger.

```tsx
<Field label="Appearance">
  <IconPicker
    value={icon}
    options={iconOptions}
    onChange={setIcon}
    color={color}
    onColorChange={setColor}
  />
</Field>
```

## Beside an Input

`size` (`sm` / `md` / `lg`, 24 / 32 / 40px) matches `Input` / `Select` heights. Without a label it is still named "Pick icon and colour"; when that is too generic, give it a specific purpose via `aria-label` or `<Field label>`.

```tsx
<Split
  gap="sm"
  align="center"
  aside={
    <IconPicker
      size="md"
      aria-label="Icon and colour" // localize this
      value={icon}
      options={iconOptions}
      onChange={setIcon}
      color={color}
      onColorChange={setColor}
    />
  }
>
  <Input size="md" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
</Split>
```

## When NOT to use

- ❌ Pairing IconPicker with a separate colour `PillMenu` / `Select` — use colour mode.
- ❌ Using it for arbitrary hex values — use `ColorPicker`.
- ❌ A picker beside a Name input left with the generic default name when a specific purpose (`aria-label` or `<Field label>`) would help.
