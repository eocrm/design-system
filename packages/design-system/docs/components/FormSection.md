# `<FormSection>` — titled group of fields

```tsx
<FormSection title="Profile" description="Basic contact details.">
  <FormRow>
    <Field label="First name" required>
      <Input />
    </Field>
    <Field label="Last name" required>
      <Input />
    </Field>
  </FormRow>
  <Field label="Work email" required>
    <Input type="email" />
  </Field>
</FormSection>
```

- Heading (`title`, level via `titleOrder`, default 2) + `description` over a stack of fields.
- Consecutive `<FormSection>`s get an automatic divider (adjacency, no margin).
- Layout-family primitive — arranges its own children only. ❌ Not a `<Card>` (no surface), ❌ not a `<PageHeader>`.
