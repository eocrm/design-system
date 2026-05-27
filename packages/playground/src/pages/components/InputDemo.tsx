import { useState } from 'react';
import { Input, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

export function InputDemo() {
  const [value, setValue] = useState('priya@acme.com');
  const [invalidValue, setInvalidValue] = useState('not-an-email');

  return (
    <DemoLayout
      name="Input"
      description="A controlled single-line text field. Renders an <input> and forwards all native props. The component is deliberately dumb — validation logic lives in your form layer."
      files={getComponentFiles('Input')}
      componentName="Input"
    >
      <Example
        title="Default"
        description="A standard text input. Always pair with a real <label>, never use placeholder as a label."
        code={`<label>
  Email
  <Input
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
  />
</label>`}
      >
        <InputExample>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="you@example.com"
          />
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes — sm (24px), md (32px, default), lg (40px). Use sm for dense toolbars, lg for hero / mobile-friendly forms."
        code={`<Input size="sm" placeholder="Filter…" />
<Input size="md" placeholder="Default" />
<Input size="lg" type="search" placeholder="Search the workspace" />`}
      >
        <InputExample>
          <Stack gap="sm">
            <Input size="sm" placeholder="Filter…" aria-label="Small input" />
            <Input size="md" placeholder="Default" aria-label="Medium input" />
            <Input
              size="lg"
              type="search"
              placeholder="Search the workspace"
              aria-label="Large input"
            />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Invalid state"
        description="Pass invalid to toggle the error visual. Pair with an external error message and aria-describedby."
        code={`<Input
  invalid
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>`}
      >
        <InputExample>
          <Input invalid value={invalidValue} onChange={(e) => setInvalidValue(e.target.value)} />
        </InputExample>
      </Example>

      <Example
        title="Disabled & readonly"
        code={`<Input value="Locked" disabled />
<Input value="Cannot edit" readOnly />`}
      >
        <InputExample>
          <Stack gap="sm">
            <Input value="Locked" disabled readOnly />
            <Input value="Cannot edit" readOnly />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Native types"
        description="Input forwards all native HTML attributes — type, inputMode, autoComplete, pattern, etc."
        code={`<Input type="email" placeholder="Email" autoComplete="email" />
<Input type="search" placeholder="Search" />
<Input type="password" placeholder="Password" />`}
      >
        <InputExample>
          <Stack gap="sm">
            <Input type="email" placeholder="Email" autoComplete="email" />
            <Input type="search" placeholder="Search" />
            <Input type="password" placeholder="Password" />
          </Stack>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
