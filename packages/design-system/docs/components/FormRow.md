# `<FormRow>` — fields side by side

```tsx
<FormRow>
  <Field label="First name" required><Input /></Field>
  <Field label="Last name" required><Input /></Field>
</FormRow>

<FormRow columns={3}>{/* fixed, non-reflowing */}</FormRow>
```

- Thin wrapper over `<Grid>`. Default: auto-fit, reflows to stacked when narrow
  (container-based, `minColumnWidth` default `'16rem'`). `columns={2|3}` = fixed count.
- `gap` default `'lg'`. ❌ Not for a single field; ❌ not a general tile grid (use `<Grid>`).
