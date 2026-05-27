import { useState } from 'react';
import { Cluster, Stack, Switch } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function SwitchDemo() {
  const [controlled, setControlled] = useState(false);
  const [asyncEnabled, setAsyncEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAsyncToggle = async (next: boolean) => {
    setSaving(true);
    setAsyncEnabled(next);
    // Fake server roundtrip.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSaving(false);
  };

  return (
    <DemoLayout
      name="Switch"
      componentName="Switch"
      description="Binary on/off toggle. Native checkbox with switch role + sliding thumb. Three tones, loading state with thumb-spinner, invalid parity with Input/Textarea."
      files={getComponentFiles('Switch')}
    >
      <Example
        title="Default + with label"
        description="Uncontrolled. Click the label or the track to toggle."
        code={`<Switch>Enable notifications</Switch>`}
      >
        <Switch>Enable notifications</Switch>
      </Example>

      <Example
        title="Three sizes"
        description="Size scales track + thumb + label font together."
        code={`<Switch size="sm">Small</Switch>
<Switch size="md">Medium (default)</Switch>
<Switch size="lg">Large</Switch>`}
      >
        <Stack gap="sm">
          <Switch size="sm">Small</Switch>
          <Switch size="md">Medium (default)</Switch>
          <Switch size="lg">Large</Switch>
        </Stack>
      </Example>

      <Example
        title="Three tones (all checked)"
        description="Tone only affects the checked-state track color. Unchecked is always neutral."
        code={`<Switch defaultChecked tone="accent">Accent (default)</Switch>
<Switch defaultChecked tone="success">Success</Switch>
<Switch defaultChecked tone="danger">Danger</Switch>`}
      >
        <Stack gap="sm">
          <Switch defaultChecked tone="accent">
            Accent (default)
          </Switch>
          <Switch defaultChecked tone="success">
            Success
          </Switch>
          <Switch defaultChecked tone="danger">
            Danger
          </Switch>
        </Stack>
      </Example>

      <Example
        title="Controlled"
        description="onChange receives (nextBool, event). The component is otherwise dumb — consumer drives the state."
        code={`const [enabled, setEnabled] = useState(false);

<Switch checked={enabled} onChange={(next) => setEnabled(next)}>
  Marketing emails
</Switch>`}
      >
        <Switch checked={controlled} onChange={(next) => setControlled(next)}>
          Marketing emails ({controlled ? 'ON' : 'OFF'})
        </Switch>
      </Example>

      <Example
        title="Loading (async toggle with optimistic update)"
        description="The button fakes a 1.5s server roundtrip. The switch updates immediately (optimistic), spins while saving, and would rollback on error. loading={true} disables the input."
        code={`const [enabled, setEnabled] = useState(false);
const [saving, setSaving] = useState(false);

const handleToggle = async (next: boolean) => {
  setSaving(true);
  setEnabled(next);
  await api.save(next);  // ...with try/catch + rollback in real code
  setSaving(false);
};

<Switch checked={enabled} loading={saving} onChange={handleToggle}>
  Two-factor auth
</Switch>`}
      >
        <Switch checked={asyncEnabled} loading={saving} onChange={handleAsyncToggle} tone="success">
          Two-factor auth ({saving ? 'saving…' : asyncEnabled ? 'ON' : 'OFF'})
        </Switch>
      </Example>

      <Example
        title="Invalid state"
        description="aria-invalid + danger-tone border on the track. Use when validation has surfaced an error."
        code={`<Switch invalid aria-describedby="terms-error">
  I agree to the terms
</Switch>
<p id="terms-error" style={{ color: 'var(--color-danger)' }}>
  You must agree to the terms before continuing.
</p>`}
      >
        <Stack gap="sm">
          <Switch invalid aria-describedby="terms-error">
            I agree to the terms
          </Switch>
          <p
            id="terms-error"
            style={{
              color: 'var(--color-danger)',
              margin: 0,
              fontSize: 'var(--font-size-sm)',
            }}
          >
            You must agree to the terms before continuing.
          </p>
        </Stack>
      </Example>

      <Example
        title="Disabled"
        description="Native disabled attribute. Unchecked and checked variants shown."
        code={`<Switch disabled>Disabled (off)</Switch>
<Switch disabled defaultChecked>Disabled (on)</Switch>`}
      >
        <Cluster gap="md">
          <Switch disabled>Disabled (off)</Switch>
          <Switch disabled defaultChecked>
            Disabled (on)
          </Switch>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
