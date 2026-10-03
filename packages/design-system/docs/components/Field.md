# `<Field>` — labeled-control unit

```tsx
<Field label="Work email" error={errors.email} required>
  <Input type="email" />
</Field>

// wrapped / native control → render-prop, spread `field`:
<Field label="Email" error={errors.email}>
  {(field) => <input type="email" {...field} />}
</Field>
```

- Wraps ONE control with its label + help/error + required marker, and auto-wires
  `id` / `aria-labelledby` / `aria-describedby` / `invalid` (controls map `invalid → aria-invalid`).
- When a `label` is present, Field injects `aria-labelledby` onto the cloned child, so
  composite controls that forward ARIA props (`Select`, `Slider`, `ColorPicker`,
  `IconPicker`, `FileUpload`, `TimeField`) get an accessible name for free. The render-prop `field`
  object also carries `aria-labelledby` for wrapped/nested DOM.
- `error` replaces `description` and flips the control invalid. `required` shows `*`;
  `optional` shows `(optional)`. `orientation="horizontal"` = label beside control.
- Field owns the control `id` — to set one, use `<Field id>`, not the control.
- Groups: `<Field asGroup>` around `<RadioGroup>` → label becomes a `role="group"` caption.
- ❌ Don't wrap a single `<Checkbox>`/`<Switch>` (they self-label). ❌ No validation/state — pass `error` from your form layer.
