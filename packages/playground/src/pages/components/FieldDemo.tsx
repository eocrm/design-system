import { useState } from 'react';
import { Field, Input, Radio, RadioGroup } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function FieldDemo() {
  const [email, setEmail] = useState('');
  const emailError =
    email.length > 0 && !email.includes('@') ? 'Enter a valid email address.' : undefined;

  return (
    <DemoLayout
      name="Field"
      description="Labeled-control unit — wires label, help, error, the required marker, and id/aria-describedby/invalid onto any control. No validation or state of its own."
      files={getComponentFiles('Field')}
    >
      <Example
        title="Label + description"
        description="Label associated to the control; helper text linked via aria-describedby."
        code={`<Field label="Work email" description="We only use this for sign-in.">
  <Input type="email" placeholder="you@company.com" />
</Field>`}
      >
        <Field label="Work email" description="We only use this for sign-in.">
          <Input type="email" placeholder="you@company.com" />
        </Field>
      </Example>

      <Example
        title="Required + live error"
        description="error replaces the description, flips the control to invalid, and links the message. Type a value without an '@'."
        code={`<Field label="Email" required error={emailError}>
  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
</Field>`}
      >
        <Field label="Email" required error={emailError}>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </Example>

      <Example
        title="Optional + horizontal orientation"
        description="orientation='horizontal' places the label beside the control — the Settings-row layout."
        code={`<Field label="Display name" optional orientation="horizontal">
  <Input placeholder="Ada Lovelace" />
</Field>`}
      >
        <Field label="Display name" optional orientation="horizontal">
          <Input placeholder="Ada Lovelace" />
        </Field>
      </Example>

      <Example
        title="Group mode (radio set)"
        description="asGroup renders the label as a role=group caption (no htmlFor) and wires the group's aria-labelledby / error."
        code={`<Field asGroup label="Notify me" error="Pick one option.">
  <RadioGroup name="notify">
    <Radio value="all" label="All activity" />
    <Radio value="mentions" label="Only mentions" />
  </RadioGroup>
</Field>`}
      >
        <Field asGroup label="Notify me" error="Pick one option.">
          <RadioGroup name="notify-demo">
            <Radio value="all" label="All activity" />
            <Radio value="mentions" label="Only mentions" />
          </RadioGroup>
        </Field>
      </Example>
    </DemoLayout>
  );
}
