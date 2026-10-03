# `<RadioGroup>` — fieldset wrapper for related radios

```tsx
<RadioGroup name="size" defaultValue="md" label="T-shirt size">
  <Radio value="sm" label="Small" />
  <Radio value="md" label="Medium" />
  <Radio value="lg" label="Large" />
</RadioGroup>
```

- Renders `<fieldset>` + optional `<legend>` for AT grouping. Children should be `<Radio>`s.
- `name` (required) — shared by all radio children via context.
- `value` + `onChange(value, event)` for controlled; `defaultValue` for uncontrolled.
- `size`, `disabled`, `invalid`, `required` propagate to children as defaults — per-child explicit prop still wins.
- `orientation`: `'vertical'` (default) / `'horizontal'`. Vertical uses Stack-like gap; horizontal wraps with a wider gap.
- `FormData.get(name)` returns the selected value on native `<form>` submit.
- The group's `value` drives each child's `checked` — don't set `checked` per-child inside a group (the group already does it).
- Per-child `onChange` fires BEFORE the group's `onChange` (both run on every selection — `preventDefault` does NOT gate the group's state update). Use per-child handlers for side-effects scoped to one option; the group's handler is the single source of truth for the selected value.
