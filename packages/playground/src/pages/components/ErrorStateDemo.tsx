import { useState } from 'react';
import { Button, Card, Cluster, ErrorState, Stack, Text } from '@eocrm/design-system';
import { Compass, TriangleAlert } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ErrorStateDemo() {
  const [failed, setFailed] = useState(false);

  return (
    <DemoLayout
      name="ErrorState"
      componentName="ErrorState"
      description="Page-level status / result block for 404 and error screens — icon, title, description, actions, and an extra slot. Sibling to EmptyState; tone drives the icon tint and (for danger) a live region."
      files={getComponentFiles('ErrorState')}
    >
      <Example
        title="Not found (neutral)"
        description="The default tone. size defaults to lg (full-page hero), headingLevel to 1."
        code={`import { Compass } from 'lucide-react';
import { Button, Cluster, ErrorState } from '@eocrm/design-system';

export function Demo() {
  return (
    <ErrorState
      icon={<Compass size={48} aria-hidden="true" />}
      title="Page not found"
      description="We couldn't find that page. It may have been moved or deleted."
      actions={
        <Cluster gap="sm" justify="center">
          <Button>Back to dashboard</Button>
          <Button variant="secondary">Search</Button>
        </Cluster>
      }
    />
  );
}`}
      >
        <ErrorState
          icon={<Compass size={48} aria-hidden="true" />}
          title="Page not found"
          description="We couldn't find that page. It may have been moved or deleted."
          actions={
            <Cluster gap="sm" justify="center">
              <Button>Back to dashboard</Button>
              <Button variant="secondary">Search</Button>
            </Cluster>
          }
        />
      </Example>

      <Example
        title="Error (danger + extra)"
        description={`tone="danger" tints the icon red and sets role="alert"; extra holds a support reference below the actions.`}
        code={`import { TriangleAlert } from 'lucide-react';
import { Button, ErrorState, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <ErrorState
      tone="danger"
      icon={<TriangleAlert size={48} aria-hidden="true" />}
      title="Something went wrong"
      description="An unexpected error occurred. We've logged it and our team is on it."
      actions={<Button>Try again</Button>}
      extra={
        <Text size="sm" tone="muted">
          Error ID: a1b2-c3d4
        </Text>
      }
    />
  );
}`}
      >
        <ErrorState
          tone="danger"
          icon={<TriangleAlert size={48} aria-hidden="true" />}
          title="Something went wrong"
          description="An unexpected error occurred. We've logged it and our team is on it."
          actions={<Button>Try again</Button>}
          extra={
            <Text size="sm" tone="muted">
              Error ID: a1b2-c3d4
            </Text>
          }
        />
      </Example>

      <Example
        title="Loading to error"
        description="This Card intentionally remains the page-level transition surface while its loading content becomes an error. Keep that one polite status region mounted; do not mount a new live region with the error or make the page-sized update assertive."
        code={`import { useState } from 'react';
import { Button, Card, ErrorState, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  const [failed, setFailed] = useState(false);

  // The Card is the existing page-level status surface for both states.
  return (
    <Stack gap="md">
      <Card role="status" aria-busy={!failed}>
        {failed ? (
          <ErrorState
            tone="danger"
            role={undefined}
            size="md"
            headingLevel={2}
            title="We couldn't load the account"
            actions={<Button onClick={() => setFailed(false)}>Try again</Button>}
          />
        ) : (
          <Text>Loading account details…</Text>
        )}
      </Card>
      <Button variant="secondary" onClick={() => setFailed(true)}>
        Simulate an error
      </Button>
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Card role="status" aria-busy={!failed}>
            {failed ? (
              <ErrorState
                tone="danger"
                role={undefined}
                size="md"
                headingLevel={2}
                title="We couldn't load the account"
                actions={<Button onClick={() => setFailed(false)}>Try again</Button>}
              />
            ) : (
              <Text>Loading account details…</Text>
            )}
          </Card>
          <Button variant="secondary" onClick={() => setFailed(true)}>
            Simulate an error
          </Button>
        </Stack>
      </Example>

      <Example
        title="Sizes"
        description="sm / md / lg (default). Pair the icon size with the state size (24 / 32 / 48)."
        code={`import { Compass } from 'lucide-react';
import { Cluster, ErrorState } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="xl" align="start">
      <ErrorState size="sm" icon={<Compass size={24} aria-hidden="true" />} title="Not found" />
      <ErrorState size="md" icon={<Compass size={32} aria-hidden="true" />} title="Not found" />
      <ErrorState size="lg" icon={<Compass size={48} aria-hidden="true" />} title="Not found" />
    </Cluster>
  );
}`}
      >
        <Cluster gap="xl" align="start">
          <ErrorState size="sm" icon={<Compass size={24} aria-hidden="true" />} title="Not found" />
          <ErrorState size="md" icon={<Compass size={32} aria-hidden="true" />} title="Not found" />
          <ErrorState size="lg" icon={<Compass size={48} aria-hidden="true" />} title="Not found" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
