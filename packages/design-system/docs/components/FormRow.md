# `<FormRow>` — fields side by side

```tsx
<FormRow>
  <Field label="First name" required><Input /></Field>
  <Field label="Last name" required><Input /></Field>
</FormRow>

<FormRow columns={3}>{/* fixed, non-reflowing */}</FormRow>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `columns` | `2 \| 3` | no | Fixed equal-width column count. Omit for responsive auto-fit (the default). |
| `minColumnWidth` | `string` | no | Min field width before the row reflows to stacked (auto-fit mode). Default `'16rem'`. |
| `gap` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | no | Gap between fields. Default `'lg'`. |
| `children` | `ReactNode` | yes | The fields (usually `<Field>`). |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- Thin wrapper over `<Grid>`. Default: auto-fit, reflows to stacked when narrow
  (container-based, `minColumnWidth` default `'16rem'`). `columns={2|3}` = fixed count.
- ❌ Not for a single field; ❌ not a general tile grid (use `<Grid>`).
- Not for vertical stacking of fields — that is the default flow of `<FormSection>` / `<Stack>`.
- ❌ Forcing `columns` for fields that should reflow on mobile — prefer the responsive default; reserve `columns` for rows that must stay side by side.
