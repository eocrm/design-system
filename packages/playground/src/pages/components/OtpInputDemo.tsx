import { useState } from 'react';
import { Field, OtpInput, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

function ControlledDemo() {
  const [code, setCode] = useState('');
  return (
    <Stack gap="xs">
      <OtpInput value={code} onChange={setCode} aria-label="Verification code" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        value = {code || '(empty)'}
      </code>
    </Stack>
  );
}

function CompleteDemo() {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <Stack gap="xs">
      <OtpInput
        length={6}
        onChange={() => setStatus(null)}
        onComplete={(code) => setStatus(code === '123456' ? 'Verified' : 'Wrong code')}
        invalid={status === 'Wrong code'}
        aria-label="Verification code"
      />
      <Text size="sm" tone="muted">
        {status ?? 'Enter 123456 to pass.'}
      </Text>
    </Stack>
  );
}

export function OtpInputDemo() {
  return (
    <DemoLayout
      name="OtpInput"
      componentName="OtpInput"
      description="One-time-code field — a box per character, mobile SMS/email autofill, and focus that advances as you type. For verification and invite codes, not for passwords."
      files={getComponentFiles('OtpInput')}
    >
      <Example
        title="Default"
        description='Six numeric boxes. Each carries autocomplete="one-time-code", so a mobile keyboard offers the code from a just-arrived message.'
        code={`import { OtpInput } from '@eocrm/design-system';

export function Demo() {
  return <OtpInput aria-label="Verification code" />;
}`}
      >
        <InputExample>
          <OtpInput aria-label="Verification code" />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="`value` + `onChange` round-trip a single contiguous string. Try pasting a whole code into the first box — it spreads across the rest."
        code={`import { useState } from 'react';
import { OtpInput, Stack } from '@eocrm/design-system';

export function Demo() {
  const [code, setCode] = useState('');
  return (
    <Stack gap="xs">
      <OtpInput value={code} onChange={setCode} aria-label="Verification code" />
      <code>value = {code || '(empty)'}</code>
    </Stack>
  );
}`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="onComplete"
        description="Fires once when the last character lands, so you can verify without diffing lengths on every keystroke."
        code={`import { useState } from 'react';
import { OtpInput, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <Stack gap="xs">
      <OtpInput
        onChange={() => setStatus(null)}
        onComplete={(code) => setStatus(code === '123456' ? 'Verified' : 'Wrong code')}
        invalid={status === 'Wrong code'}
        aria-label="Verification code"
      />
      <Text size="sm" tone="muted">{status ?? 'Enter 123456 to pass.'}</Text>
    </Stack>
  );
}`}
      >
        <InputExample>
          <CompleteDemo />
        </InputExample>
      </Example>

      <Example
        title="Lengths and character sets"
        description='`length` sets the box count; `type="alphanumeric"` accepts Latin letters and uppercases them.'
        code={`import { OtpInput, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <OtpInput length={4} aria-label="Four-digit code" />
      <OtpInput length={8} type="alphanumeric" aria-label="Invite code" />
    </Stack>
  );
}`}
      >
        <InputExample>
          <Stack gap="sm">
            <OtpInput length={4} aria-label="Four-digit code" />
            <OtpInput length={8} type="alphanumeric" aria-label="Invite code" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="sm / md (default) / lg — the same height scale as <Input>, so a code field lines up with the fields around it."
        code={`import { OtpInput, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <OtpInput length={4} size="sm" aria-label="Small" />
      <OtpInput length={4} size="md" aria-label="Medium" />
      <OtpInput length={4} size="lg" aria-label="Large" />
    </Stack>
  );
}`}
      >
        <InputExample>
          <Stack gap="sm">
            <OtpInput length={4} size="sm" aria-label="Small" />
            <OtpInput length={4} size="md" aria-label="Medium" />
            <OtpInput length={4} size="lg" aria-label="Large" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Invalid and disabled"
        description="`invalid` paints every box and sets aria-invalid; `disabled` locks the whole group."
        code={`import { OtpInput, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <OtpInput length={4} defaultValue="1234" invalid aria-label="Rejected code" />
      <OtpInput length={4} defaultValue="1234" disabled aria-label="Locked code" />
    </Stack>
  );
}`}
      >
        <InputExample>
          <Stack gap="sm">
            <OtpInput length={4} defaultValue="1234" invalid aria-label="Rejected code" />
            <OtpInput length={4} defaultValue="1234" disabled aria-label="Locked code" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Inside a Field"
        description="Field clones the child with `id`, `aria-labelledby`, `aria-describedby` and `invalid`. Do NOT pass `asGroup` — that mode injects only invalid/required and leaves the label unwired."
        code={`import { Field, OtpInput } from '@eocrm/design-system';

export function Demo() {
  return (
    <Field label="Verification code" error="That code has expired.">
      <OtpInput />
    </Field>
  );
}`}
      >
        <InputExample>
          <Field label="Verification code" error="That code has expired.">
            <OtpInput />
          </Field>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
