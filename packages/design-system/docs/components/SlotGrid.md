# `<SlotGrid>` — grouped time-slot tiles

```tsx
<SlotGrid
  groups={[
    {
      label: 'Morning',
      slots: [
        { key: '09:00', label: '9:00' },
        { key: '09:30', label: '9:30' },
      ],
    },
    { label: 'Afternoon', slots: [{ key: '14:00', label: '14:00' }] },
  ]}
  value={slot}
  onChange={setSlot}
  empty={<Text tone="muted">No times this day — try another.</Text>} // optional
/>
```

<!-- props:start -->

## Props

| Prop         | Type                    | Required | Default | Description                                                                                                                                                                 |
| ------------ | ----------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groups`     | `SlotGridGroup[]`       | yes      | —       | Groups in display order.                                                                                                                                                    |
| `value`      | `string \| null`        | yes      | —       | Selected slot `key`, or `null`. A key not in `groups` checks nothing.                                                                                                       |
| `onChange`   | `(key: string) => void` | yes      | —       | Called with the chosen slot's `key`. Controlled — update `value` yourself.                                                                                                  |
| `empty`      | `ReactNode`             | no       | —       | Shown when no group has any slot. Default: the localized "No available times".                                                                                              |
| `titleOrder` | `TitleOrder`            | no       | —       | Heading level of each group label. Default `3`.                                                                                                                             |
| `name`       | `string`                | no       | —       | Radio group `name` (also submitted with a form). Default: a generated id.                                                                                                   |
| `invalid`    | `boolean`               | no       | false   | Marks the group `aria-invalid` (the radios themselves do not support it). Field / SettingRow inject it.                                                                     |
| `required`   | `boolean`               | no       | —       | Native `required` on the radios (the group then fails form validation until one is chosen). Field / SettingRow inject it; it used to land on the root as a stray attribute. |
| …native      |                         |          |         | plus native `<div>` attributes                                                                                                                                              |

<!-- props:end -->

- Slot `label`s are yours, formatted in the business's timezone. `key` is what `onChange` returns; keep it unique across ALL groups (one exclusive choice).
- Native radios with one `name`: one Tab stop for the whole grid, arrows move AND select in reading order (↓ goes to the next slot, not the one below). Tiles are `role="radio"` named by their label; each group is a `<fieldset>` named by its heading (`titleOrder`, default 3).
- Groups with no slots are skipped; if none has slots, `empty` renders (default: localized "No available times").
- The root is `role="group"`: in `<Field>` / `<SettingRow>` the row label names it and the error describes it; `invalid` → `aria-invalid` on the group, `required` → native `required` on the radios.
- 6 columns, 3 when the grid's own width ≤ 48rem (container query).
- ❌ No per-slot `disabled` — pass only bookable slots. ❌ Don't wrap it in your own `role="radiogroup"`.
- ❌ In an intrinsic-width context (`Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`) it renders at width 0 — `container-type: inline-size` zeroes its intrinsic-width contribution; give the parent a concrete width (e.g. `asideWidth` on a Split). It is also the containing block for absolutely-positioned descendants (layout containment).
- When NOT to use: free-form time → `<TimeField>`; a handful of options → `<ButtonGroup value>` / `<RadioGroup>`.
