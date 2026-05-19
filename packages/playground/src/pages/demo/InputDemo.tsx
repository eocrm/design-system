import { useState } from 'react';
import { Input } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Input/Input.tsx?raw';
import scssSource from '@lib-source/components/Input/Input.module.scss?raw';

export function InputDemo() {
  const [value, setValue] = useState('priya@acme.com');
  const [invalidValue, setInvalidValue] = useState('not-an-email');

  return (
    <DemoLayout
      name="Input"
      description="A controlled single-line text field. Renders an <input> and forwards all native props. The component is deliberately dumb — validation logic lives in your form layer."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Input.tsx"
      scssFilename="Input.module.scss"
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
        <div style={{ maxWidth: 320 }}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
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
        <div style={{ maxWidth: 320 }}>
          <Input invalid value={invalidValue} onChange={(e) => setInvalidValue(e.target.value)} />
        </div>
      </Example>

      <Example
        title="Disabled & readonly"
        code={`<Input value="Locked" disabled />
<Input value="Cannot edit" readOnly />`}
      >
        <Stack gap="sm" style={{ maxWidth: 320 }}>
          <Input value="Locked" disabled readOnly />
          <Input value="Cannot edit" readOnly />
        </Stack>
      </Example>

      <Example
        title="Native types"
        description="Input forwards all native HTML attributes — type, inputMode, autoComplete, pattern, etc."
        code={`<Input type="email" placeholder="Email" autoComplete="email" />
<Input type="search" placeholder="Search" />
<Input type="password" placeholder="Password" />`}
      >
        <Stack gap="sm" style={{ maxWidth: 320 }}>
          <Input type="email" placeholder="Email" autoComplete="email" />
          <Input type="search" placeholder="Search" />
          <Input type="password" placeholder="Password" />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
