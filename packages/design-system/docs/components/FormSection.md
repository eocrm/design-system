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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `ReactNode` | no | — | Section heading. |
| `description` | `ReactNode` | no | — | Secondary text under the heading. |
| `titleOrder` | `TitleOrder` | no | — | Heading level for `title`. Default `2`. |
| `children` | `ReactNode` | yes | — | The fields (usually `<Field>` / `<FormRow>`). |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- Heading + description over a stack of fields.
- Consecutive `<FormSection>`s get an automatic divider (adjacency, no margin).
- Layout-family primitive — arranges its own children only. ❌ Not a `<Card>` (no surface), ❌ not a `<PageHeader>`.
- Not for a single field (render the `<Field>`). ❌ Adding `margin` around it to separate sections — render FormSections as siblings; the adjacency divider handles it.
