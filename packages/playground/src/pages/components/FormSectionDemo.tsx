import { Field, FormSection, Input, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function FormSectionDemo() {
  return (
    <DemoLayout
      name="FormSection"
      description="Titled group of form fields — a heading + description over a vertical stack of fields. Consecutive sections are separated by a divider automatically."
      files={getComponentFiles('FormSection')}
    >
      <Example
        title="Titled group"
        description="Heading + description over a stack of fields (here a side-by-side pair plus a full-width Field)."
        code={`<FormSection title="Profile" description="Basic details that appear on the contact record.">
  <FormRow>
    <Field label="First name" required><Input placeholder="Ada" /></Field>
    <Field label="Last name" required><Input placeholder="Lovelace" /></Field>
  </FormRow>
  <Field label="Work email" required><Input type="email" placeholder="ada@example.com" /></Field>
</FormSection>`}
      >
        <FormSection title="Profile" description="Basic details that appear on the contact record.">
          <Stack gap="md">
            <Field label="First name" required>
              <Input placeholder="Ada" />
            </Field>
            <Field label="Last name" required>
              <Input placeholder="Lovelace" />
            </Field>
          </Stack>
          <Field label="Work email" required>
            <Input type="email" placeholder="ada@example.com" />
          </Field>
        </FormSection>
      </Example>

      <Example
        title="Consecutive sections get a divider"
        description="Render two sections as siblings; the divider between them is automatic."
        code={`<FormSection title="Profile" description="Public details">
  <Field label="Display name"><Input /></Field>
</FormSection>
<FormSection title="Preferences" description="Defaults for this contact">
  <Field label="Timezone" orientation="horizontal"><Input /></Field>
</FormSection>`}
      >
        <>
          <FormSection title="Profile" description="Public details">
            <Field label="Display name">
              <Input placeholder="Ada Lovelace" />
            </Field>
          </FormSection>
          <FormSection title="Preferences" description="Defaults for this contact">
            <Field label="Timezone" orientation="horizontal">
              <Input placeholder="Europe/London" />
            </Field>
          </FormSection>
        </>
      </Example>
    </DemoLayout>
  );
}
