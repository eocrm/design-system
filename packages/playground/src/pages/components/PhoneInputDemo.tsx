import { useState } from 'react';
import { PhoneInput, isValidPhone, Stack, Cluster, Text, Code, Field } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function PhoneInputDemo() {
  const [phone, setPhone] = useState<string | null>(null);
  const [gb, setGb] = useState<string | null>('+442071838750');
  const [dv, setDv] = useState<string | null>('+12025550123');

  return (
    <DemoLayout
      name="PhoneInput"
      componentName="PhoneInput"
      description="International phone field — searchable country picker + national-number input emitting E.164. Country names via Intl.DisplayNames; metadata + validation via libphonenumber-js."
      files={getComponentFiles('PhoneInput')}
    >
      <Example
        title="Default (US)"
        description="The trigger shows just the calling code by default (compact); open the country picker — its text auto-selects — and type to search. The component emits canonical E.164; the display reconstructs from it."
        code={`import { useState } from 'react';
import { PhoneInput, isValidPhone, Stack, Text, Code } from '@eocrm/design-system';

export function Demo() {
  const [phone, setPhone] = useState<string | null>(null);
  return (
    <Stack gap="sm">
      <PhoneInput value={phone} onChange={setPhone} defaultCountry="US" />
      <Text size="sm" tone="muted">
        E.164 → <Code>{phone ?? 'null'}</Code> · valid:{' '}
        <Code>{String(isValidPhone(phone))}</Code>
      </Text>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <PhoneInput value={phone} onChange={setPhone} defaultCountry="US" />
          <Text size="sm" tone="muted">
            E.164 → <Code>{phone ?? 'null'}</Code> · valid:{' '}
            <Code>{String(isValidPhone(phone))}</Code>
          </Text>
        </Stack>
      </Example>

      <Example
        title="Seeded from an existing E.164 value"
        description="Pass an E.164 string and the picker + number field reconstruct from it (here a UK number)."
        code={`import { useState } from 'react';
import { PhoneInput } from '@eocrm/design-system';

export function Demo() {
  const [gb, setGb] = useState<string | null>('+442071838750');
  return <PhoneInput value={gb} onChange={setGb} />;
}`}
      >
        <PhoneInput value={gb} onChange={setGb} />
      </Example>

      <Example
        title="Country display formats (countryDisplay)"
        description="Controls how the SELECTED country shows in the trigger — full name+code (default), ISO+code, just the code, or emoji flag+code. The dropdown rows always show the full country name and stay searchable. Note: emoji flags don't render on Windows Chrome/Edge — prefer 'iso' there."
        code={`import { useState } from 'react';
import { PhoneInput, Stack, Cluster, Code, Text } from '@eocrm/design-system';

export function Demo() {
  const [dv, setDv] = useState<string | null>('+12025550123');
  return (
    <Stack gap="sm">
      {(['name', 'iso', 'code', 'flag'] as const).map((mode) => (
        <Cluster key={mode} gap="sm">
          <Code>{mode}</Code>
          <PhoneInput
            value={dv}
            onChange={setDv}
            countryDisplay={mode}
            aria-label={\`\${mode} display\`}
          />
        </Cluster>
      ))}
      <Text size="sm" tone="muted">
        All four share one value — editing any updates the rest, so only the trigger format
        differs.
      </Text>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          {(['name', 'iso', 'code', 'flag'] as const).map((mode) => (
            <Cluster key={mode} gap="sm">
              <Code>{mode}</Code>
              <PhoneInput
                value={dv}
                onChange={setDv}
                countryDisplay={mode}
                aria-label={`${mode} display`}
              />
            </Cluster>
          ))}
          <Text size="sm" tone="muted">
            All four share one value — editing any updates the rest, so only the trigger format
            differs.
          </Text>
        </Stack>
      </Example>

      <Example
        title="Inside a Field (label + validation)"
        description="Field injects the label association; drive invalid chrome via isValidPhone."
        code={`import { useState } from 'react';
import { PhoneInput, isValidPhone, Field } from '@eocrm/design-system';

export function Demo() {
  const [phone, setPhone] = useState<string | null>(null);
  return (
    <Field
      label="Mobile"
      error={phone && !isValidPhone(phone) ? 'Enter a valid number' : undefined}
    >
      <PhoneInput value={phone} onChange={setPhone} />
    </Field>
  );
}`}
      >
        <Field
          label="Mobile"
          error={phone && !isValidPhone(phone) ? 'Enter a valid number' : undefined}
        >
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
      </Example>

      <Example
        title="Disabled"
        description="Both controls disabled."
        code={`import { PhoneInput } from '@eocrm/design-system';

export function Demo() {
  return <PhoneInput value="+12025550123" onChange={() => {}} disabled />;
}`}
      >
        <PhoneInput value="+12025550123" onChange={() => {}} disabled />
      </Example>
    </DemoLayout>
  );
}
