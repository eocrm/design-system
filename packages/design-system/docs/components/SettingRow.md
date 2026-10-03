# `<SettingRow>` — one row of a settings screen

```tsx
<SettingRow.List dividers labelWidth="18rem">
  <SettingRow
    label="Seats"
    labelAdornment={
      <Badge tone="neutral" size="sm">
        From plan
      </Badge>
    }
    description="Member seats included for this tenant"
    controlWidth="xs"
    trailing={
      <Constrain width="xs">
        <Select options={modes} value={mode} onChange={setMode} />
      </Constrain>
    }
    footer={
      <Constrain maxWidth="sm">
        <Progress value={used} max={included} aria-label="Seats usage" />
      </Constrain>
    }
  >
    <Input type="number" />
  </SettingRow>
</SettingRow.List>
```

- Label (+ `labelAdornment`) and `description` in a shared LEFT column; control (+ `trailing`) and `footer` in the right. Wiring is `<Field>`'s — same `id` / `aria-labelledby` / `aria-describedby` / `invalid`, same render-prop `field` object.
- `error` takes over only the `aria-describedby` REFERENCE and flips the control invalid — unlike `<Field>`, the `description` stays VISIBLE, since the two sit in different columns.
- `labelAdornment` renders OUTSIDE the `<label>` on purpose: label content becomes the control's accessible name, so a badge inside makes the input announce "Seats From plan".
- `controlWidth` (`auto` default, `xs`/`sm`/`md`) SETS the control's width, capped at the column — it's no longer just a cap, so every row in a `List` with the same step lines up. It does NOT apply to `trailing` — the two are unrelated — but in a narrow column a wide step (`md`) plus `trailing` can wrap `trailing` onto a second line. Meant for controls that stretch to `width: 100%` (`Input`/`Select`). ❌ Don't wrap the control in `<Constrain>` — that makes `Constrain` the element the row wires, silently stripping the control's `id` and `aria-*`.
- `trailing` is a flex group sized to its content, not the whole row — but a control that sizes ITSELF to `width: 100%` (`Select`, `Input`, `Textarea`) still fills that entire group and pushes any other adornment (a badge, a button) onto a second line. Wrap that one child in `<Constrain width="xs">` as shown above — safe here, `trailing` is not the wired child. Same idea for `footer`, which fills the whole control column uncapped: wrap a meter in `<Constrain maxWidth="sm">`.
- ❌ Mixing control sizes in one row — a `size="sm"` adornment beside a default-`md` control renders two different heights on the same line.
- `<SettingRow.List>` owns the shared label column (`labelWidth`, default `16rem`), `spacing` (`sm`/`md`/`lg`, default `md`), `dividers` (default `false`) and `collapseBelow` (`sm`/`md`/`lg`, default `'sm'` — a container query on the list's own box that stacks each row; pass `false` to opt out of containment entirely). **Collapse only works inside a List** — a standalone `<SettingRow>` never stacks at any width.
- ❌ A `SettingRow.List` inside a shrink-to-fit parent (a `width: max-content` flex item, an inline-block, a table cell) with the default `collapseBelow` — the List is a size container by default, so its intrinsic-width contribution is zero and it collapses. Pass `collapseBelow={false}` there.
- ❌ Read-only key/value → `<DefinitionList>`. ❌ An ordinary form field → `<Field>`. ❌ `margin` on a row to space rows → that is the List.
