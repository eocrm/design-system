import { Field, FormRow, Input } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function FormRowDemo() {
  return (
    <DemoLayout
      name="FormRow"
      description="Lays form fields side by side. Thin wrapper over Grid — responsive auto-fit by default (reflows to stacked when narrow), or a fixed column count."
      files={getComponentFiles('FormRow')}
    >
      <Example
        title="Responsive (default)"
        description="Two fields sit side by side and drop to stacked as the container narrows — resize the window to see it reflow."
        code={`<FormRow>
  <Field label="First name" required><Input placeholder="Ada" /></Field>
  <Field label="Last name" required><Input placeholder="Lovelace" /></Field>
</FormRow>`}
      >
        <FormRow>
          <Field label="First name" required>
            <Input placeholder="Ada" />
          </Field>
          <Field label="Last name" required>
            <Input placeholder="Lovelace" />
          </Field>
        </FormRow>
      </Example>

      <Example
        title="Fixed columns"
        description="columns={3} keeps an exact three-up layout at any width."
        code={`<FormRow columns={3}>
  <Field label="City"><Input placeholder="London" /></Field>
  <Field label="State / Region"><Input placeholder="England" /></Field>
  <Field label="Postcode"><Input placeholder="SW1A" /></Field>
</FormRow>`}
      >
        <FormRow columns={3}>
          <Field label="City">
            <Input placeholder="London" />
          </Field>
          <Field label="State / Region">
            <Input placeholder="England" />
          </Field>
          <Field label="Postcode">
            <Input placeholder="SW1A" />
          </Field>
        </FormRow>
      </Example>
    </DemoLayout>
  );
}
