# `<RadioGroup>` — fieldset wrapper for related radios

```tsx
<RadioGroup name="size" defaultValue="md" label="T-shirt size">
  <Radio value="sm" label="Small" />
  <Radio value="md" label="Medium" />
  <Radio value="lg" label="Large" />
</RadioGroup>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes | — | Form `name` shared by all radio children. Required. |
| `value` | `string` | no | — | Controlled selected value. Pair with `onChange`. |
| `defaultValue` | `string` | no | — | Initial selected value for uncontrolled use. |
| `onChange` | `((value: string, event: ChangeEvent<HTMLInputElement, Element>) => void)` | no | — | Fires when the user selects a different radio. Receives the new value AND the native event so consumers can read modifier keys, etc. |
| `label` | `ReactNode` | no | — | Optional group label, rendered as `<legend>`. |
| `size` | `RadioSize` | no | — | Default size for child radios. Per-child explicit `size` wins. Defaults to `'md'`. |
| `orientation` | `RadioGroupOrientation` | no | — | Layout direction. `'vertical'` (default) / `'horizontal'`. |
| `disabled` | `boolean` | no | — | Disable every child. Per-child explicit `disabled` wins. |
| `invalid` | `boolean` | no | — | Apply the invalid visual to every child + set `aria-invalid` on the fieldset. |
| `required` | `boolean` | no | — | Mark every child as required (HTML form validation). |
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<FieldSet>` attributes |

<!-- props:end -->

- Renders `<fieldset>` + optional `<legend>` for AT grouping. Children should be `<Radio>`s.
- `name` (required) — shared by all radio children via context.
- `value` + `onChange(value, event)` for controlled; `defaultValue` for uncontrolled.
- `size`, `disabled`, `invalid`, `required` propagate to children as defaults — per-child explicit prop still wins.
- `orientation`: `'vertical'` (default) / `'horizontal'`. Vertical uses Stack-like gap; horizontal wraps with a wider gap.
- `FormData.get(name)` returns the selected value on native `<form>` submit.
- The group's `value` drives each child's `checked` — don't set `checked` per-child inside a group (the group already does it).
- Per-child `onChange` fires BEFORE the group's `onChange` (both run on every selection — `preventDefault` does NOT gate the group's state update). Use per-child handlers for side-effects scoped to one option; the group's handler is the single source of truth for the selected value.

```tsx
// Controlled
const [plan, setPlan] = useState('free');
<RadioGroup name="plan" value={plan} onChange={setPlan} label="Plan">
  <Radio value="free" label="Free" />
  <Radio value="pro" label="Pro" />
</RadioGroup>

// Horizontal layout
<RadioGroup name="orientation" defaultValue="left" orientation="horizontal">
  <Radio value="left" label="Left" />
  <Radio value="center" label="Center" />
</RadioGroup>
```

**When NOT to use:** 10+ options — `<Select>`; multi-select — a list of `<Checkbox>`es (no group component yet).

- ❌ Setting `checked` on the child `<Radio>`s — the group handles that.
- ❌ Setting a per-radio `name` inside a group — overridden by the group's `name`.
