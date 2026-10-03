# `<OptionsPicker>` — filter picker (multi/single, grouped, searchable)

**Use for filter UX, not form fields.** A compound picker that opens a Popover
with a search input and grouped/flat checkbox (multi) or radio (single) options.
Multi mode buffers a draft until Apply; single mode commits per click.

```tsx
<OptionsPicker selected={events} onApply={setEvents}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">
      Events <ChevronDown size={14} />
    </Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter events"
    groups={catalogGroups} // OR `options={flatOptions}` — XOR
  />
</OptionsPicker>
```

<!-- props:start -->

## Props

### `OptionsPickerProps`

| Prop           | Type                                                         | Required | Default | Description |
| -------------- | ------------------------------------------------------------ | -------- | ------- | ----------- |
| `mode`         | `"multi" \| "single"`                                        | no       | —       |             |
| `selected`     | `string[] \| string \| null`                                 | yes      | —       |             |
| `onApply`      | `(next: string[]) => void \| (next: string \| null) => void` | yes      | —       |             |
| `onCancel`     | `(() => void)`                                               | no       | —       |             |
| `open`         | `boolean`                                                    | no       | —       |             |
| `onOpenChange` | `((open: boolean) => void)`                                  | no       | —       |             |
| `children`     | `ReactNode`                                                  | yes      | —       |             |

### `OptionsPickerContentProps`

| Prop          | Type                                               | Required | Default | Description                                                                                                                                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`     | `OptionsPickerOption[]`                            | no       | —       |                                                                                                                                                                                                                                                                                                                                               |
| `groups`      | `OptionsPickerGroup[]`                             | no       | —       |                                                                                                                                                                                                                                                                                                                                               |
| `label`       | `string`                                           | yes      | —       | Accessible label on the panel (the dialog's `aria-label`).                                                                                                                                                                                                                                                                                    |
| `emptyState`  | `ReactNode`                                        | no       | —       | Rendered when search produces zero matches. Defaults to the `optionsPicker.noMatches` i18n string (en: `'No matches'`). An EMPTY string counts as unset, matching every other label override in the library. There is no way to suppress the message entirely — a blank listbox reads as a broken filter rather than as a deliberate silence. |
| `footerCount` | `((selected: number, total: number) => ReactNode)` | no       | —       | Footer count formatter (multi only). Default `'${selected} of ${total}'`.                                                                                                                                                                                                                                                                     |
| `searchable`  | `boolean`                                          | no       | —       | Whether to render the search bar at the top of the panel. Defaults to `true`. Hide it (`false`) for small/curated option lists where typing filters would just be noise — the selection-count header is hidden alongside the search input (the footer's `N of TOTAL` text still shows in multi mode).                                         |
| `className`   | `string`                                           | no       | —       |                                                                                                                                                                                                                                                                                                                                               |

### `OptionsPickerTriggerProps`

| Prop       | Type                                                          | Required | Default | Description                                                          |
| ---------- | ------------------------------------------------------------- | -------- | ------- | -------------------------------------------------------------------- |
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes      | —       | Must be a single React element that accepts a ref (e.g. `<Button>`). |

<!-- props:end -->

`mode="single"` for single-select: `selected: string | null`, `onApply(value | null)`, no Apply/Cancel footer.

Don't use for form selects (use `<Select>`), action menus (use `<DropdownMenu>`),
or single boolean toggles (use `<Checkbox>` or `<Switch>`).
