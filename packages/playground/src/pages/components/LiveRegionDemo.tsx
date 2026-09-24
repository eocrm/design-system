import { useState } from 'react';
import { Button, Cluster, LiveRegion, Stack, Switch, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function LiveRegionDemo() {
  const [message, setMessage] = useState('');
  const [saveKey, setSaveKey] = useState(0);
  const [assertive, setAssertive] = useState(false);

  return (
    <DemoLayout
      name="LiveRegion"
      componentName="LiveRegion"
      description="A visually-hidden, always-mounted announcement region for screen readers — for consumer-level outcomes that have no visible text of their own. On every message change it clears then rewrites after a short delay, so the empty-to-text transition is what triggers the announcement."
      files={getComponentFiles('LiveRegion')}
    >
      <Example
        title="Announcing an outcome"
        description="'Add authenticator' has no visible confirmation text of its own — LiveRegion announces it. 'Save' re-announces the same 'Saved' text every click by incrementing announceKey, since an unchanged string wouldn't otherwise re-fire. Toggle Assertive to switch role='alert' + aria-live='assertive'."
        code={`import { useState } from 'react';
import { Button, Cluster, LiveRegion, Stack, Switch, Text } from '@eocrm/design-system';

export function Demo() {
  const [message, setMessage] = useState('');
  const [saveKey, setSaveKey] = useState(0);
  const [assertive, setAssertive] = useState(false);

  return (
    <Stack gap="sm" align="start">
      <Cluster gap="sm" align="center">
        <Button onClick={() => setMessage('Authenticator app added')}>Add authenticator</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setMessage('Saved');
            setSaveKey((k) => k + 1);
          }}
        >
          Save
        </Button>
        <Switch checked={assertive} onChange={setAssertive}>
          Assertive
        </Switch>
      </Cluster>
      <Text size="sm" tone="muted">
        Last announced: {message || '—'}
      </Text>
      <LiveRegion politeness={assertive ? 'assertive' : 'polite'} announceKey={saveKey}>
        {message}
      </LiveRegion>
    </Stack>
  );
}`}
      >
        <Stack gap="sm" align="start">
          <Cluster gap="sm" align="center">
            <Button onClick={() => setMessage('Authenticator app added')}>Add authenticator</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setMessage('Saved');
                setSaveKey((k) => k + 1);
              }}
            >
              Save
            </Button>
            <Switch checked={assertive} onChange={setAssertive}>
              Assertive
            </Switch>
          </Cluster>
          <Text size="sm" tone="muted">
            Last announced: {message || '—'}
          </Text>
          <LiveRegion politeness={assertive ? 'assertive' : 'polite'} announceKey={saveKey}>
            {message}
          </LiveRegion>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
