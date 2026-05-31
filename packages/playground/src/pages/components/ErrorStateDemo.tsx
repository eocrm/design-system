import { Button, Cluster, ErrorState, Text } from '@eocrm/design-system';
import { Compass, TriangleAlert } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ErrorStateDemo() {
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
        code={`<ErrorState
  icon={<Compass size={48} aria-hidden="true" />}
  title="Page not found"
  description="We couldn't find that page. It may have been moved or deleted."
  actions={
    <Cluster gap="sm" justify="center">
      <Button>Back to dashboard</Button>
      <Button variant="secondary">Search</Button>
    </Cluster>
  }
/>`}
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
        code={`<ErrorState
  tone="danger"
  icon={<TriangleAlert size={48} aria-hidden="true" />}
  title="Something went wrong"
  description="An unexpected error occurred. We've logged it and our team is on it."
  actions={<Button>Try again</Button>}
  extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
/>`}
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
        title="Sizes"
        description="sm / md / lg (default). Pair the icon size with the state size (24 / 32 / 48)."
        code={`<ErrorState size="sm" icon={<Compass size={24} aria-hidden="true" />} title="Not found" />
<ErrorState size="md" icon={<Compass size={32} aria-hidden="true" />} title="Not found" />
<ErrorState size="lg" icon={<Compass size={48} aria-hidden="true" />} title="Not found" />`}
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
