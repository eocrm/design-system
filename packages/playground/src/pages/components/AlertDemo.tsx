import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Alert, Button, Cluster, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function AlertDemo() {
  const [showSaved, setShowSaved] = useState(true);

  return (
    <DemoLayout
      name="Alert"
      componentName="Alert"
      description="Persistent in-flow notification. Four tones with tinted background + accent stripe. Optional title / description / icon / actions / dismiss. Use Toast for transient messages instead."
      files={getComponentFiles('Alert')}
    >
      <Example
        title="Four tones"
        description="info / success / warning / error. Default icon + accent stripe per tone. Error gets role='alert' (assertive); others use role='status' (polite)."
        code={`import { Alert, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Alert tone="info" title="Synced 5 minutes ago" />
      <Alert tone="success" title="Changes saved" />
      <Alert tone="warning" title="Storage at 85%" />
      <Alert tone="error" title="Request failed" />
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Alert tone="info" title="Synced 5 minutes ago" />
          <Alert tone="success" title="Changes saved" />
          <Alert tone="warning" title="Storage at 85%" />
          <Alert tone="error" title="Request failed" />
        </Stack>
      </Example>

      <Example
        title="Title only"
        description="The simplest form. Useful for short status messages."
        code={`import { Alert } from '@eocrm/design-system';

export function Demo() {
  return <Alert tone="info" title="Synced 5 minutes ago" />;
}`}
      >
        <Alert tone="info" title="Synced 5 minutes ago" />
      </Example>

      <Example
        title="Description only (no title)"
        description="Short text body without a heading. Reads as a sentence."
        code={`import { Alert } from '@eocrm/design-system';

export function Demo() {
  return <Alert tone="warning">Your storage is at 85% capacity.</Alert>;
}`}
      >
        <Alert tone="warning">Your storage is at 85% capacity.</Alert>
      </Example>

      <Example
        title="With actions"
        description="Pass a pre-laid-out node as `actions`. Renders below the description."
        code={`import { Alert, Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Alert
      tone="warning"
      title="Update available"
      actions={
        <Cluster gap="sm">
          <Button size="sm">Reload</Button>
          <Button size="sm" variant="ghost">Later</Button>
        </Cluster>
      }
    >
      A new version is ready. Reload to apply the latest improvements.
    </Alert>
  );
}`}
      >
        <Alert
          tone="warning"
          title="Update available"
          actions={
            <Cluster gap="sm">
              <Button size="sm">Reload</Button>
              <Button size="sm" variant="ghost">
                Later
              </Button>
            </Cluster>
          }
        >
          A new version is ready. Reload to apply the latest improvements.
        </Alert>
      </Example>

      <Example
        title="Dismissible"
        description="onDismiss callback fires when the × is clicked. The component does NOT manage hidden state — the consumer conditionally renders."
        code={`import { useState } from 'react';
import { Alert, Button, Stack } from '@eocrm/design-system';

export function Demo() {
  const [show, setShow] = useState(true);

  return (
    <Stack gap="sm">
      {show ? (
        <Alert tone="success" onDismiss={() => setShow(false)}>
          Changes saved.
        </Alert>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setShow(true)}>
          Show again
        </Button>
      )}
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          {showSaved ? (
            <Alert tone="success" onDismiss={() => setShowSaved(false)}>
              Changes saved.
            </Alert>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setShowSaved(true)}>
              Show again
            </Button>
          )}
        </Stack>
      </Example>

      <Example
        title="Custom icon + suppressed icon"
        description="Pass any ReactNode to icon for an override. icon={null} hides the icon entirely."
        code={`import { Bell } from 'lucide-react';
import { Alert, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Alert tone="info" icon={<Bell size={16} aria-hidden />} title="New mention" />
      <Alert tone="info" icon={null}>Quietly informative.</Alert>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Alert tone="info" icon={<Bell size={16} aria-hidden />} title="New mention" />
          <Alert tone="info" icon={null}>
            Quietly informative.
          </Alert>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
