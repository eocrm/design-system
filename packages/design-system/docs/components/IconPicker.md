# `<IconPicker>` — choose one glyph from a consumer catalog

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

| Prop               | Type                         | Required | Default        | Description                                                                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`            | `string`                     | yes      | —              | Currently selected option value. Controlled — required.                                                                                                                                                                                                                                            |
| `options`          | `IconPickerOption[]`         | yes      | —              | Consumer-curated icons rendered in the supplied order. Values must be stable and unique. An empty list disables the trigger.                                                                                                                                                                       |
| `onChange`         | `(value: string) => void`    | yes      | —              | Fires exactly once with the chosen option value, including when it equals the controlled `value`, then closes the popover.                                                                                                                                                                         |
| `disabled`         | `boolean`                    | no       | false          | Disables the trigger, prevents opening and selection, and closes an open picker.                                                                                                                                                                                                                   |
| `invalid`          | `boolean`                    | no       | false          | Marks the focusable trigger invalid for Field composition.                                                                                                                                                                                                                                         |
| `required`         | `boolean`                    | no       | false          | Consumed for Field composition so Field can render its visible required marker. Native buttons do not support `aria-required`, so this does not add required semantics to the trigger.                                                                                                             |
| `popoverPlacement` | `IconPickerPopoverPlacement` | no       | 'bottom-start' | Preferred popover placement. Floating UI may flip it to remain visible. - `'top'` — above, centered. - `'top-start'` — above, start-aligned. - `'top-end'` — above, end-aligned. - `'bottom'` — below, centered. - `'bottom-start'` — below, start-aligned. - `'bottom-end'` — below, end-aligned. |
| `aria-label`       | `string`                     | no       | —              | Accessible picker purpose. It names the trigger with the selected icon appended and names the dialog plus radiogroup without that suffix. Defaults to the localized `iconPicker.triggerLabel` value when omitted OR empty — an empty string is not an explicit name, so it takes the default too.  |
| `aria-labelledby`  | `string`                     | no       | —              | Id(s) of external elements that provide the picker purpose. They name the dialog and radiogroup directly. The trigger also references hidden selected-option text so its name remains the visible purpose plus the current selection.                                                              |
| `aria-describedby` | `string`                     | no       | —              | Id(s) of element(s) that describe the trigger button.                                                                                                                                                                                                                                              |
| …native            |                              |          |                | plus native `<div>` attributes                                                                                                                                                                                                                                                                     |

<!-- props:end -->

- The consumer owns icon values, labels, glyphs, ordering, and controlled state.
- `<Field label>` names the trigger with the visible label plus the selected option, and forwards description and invalid state to that button; the dialog and radiogroup use only the visible Field label. These attributes do not sit on the role-less wrapper. `required` remains a visible Field marker rather than unsupported `aria-required` on the native button.
- Use it for compact visual choices; use `Select` when visible option text matters.
- Labels must be human-readable and values unique. Do not pass icon codes as labels.
