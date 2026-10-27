import { Alert, Card, Constrain, List, Stack, Text, Title } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function MaybeStep({ show, children }: { show: boolean; children: string }) {
  return show ? <List.Item>{children}</List.Item> : null;
}

export function ListDemo() {
  return (
    <DemoLayout
      name="List"
      componentName="List"
      description="Semantic bulleted and numbered lists of prose items. Markers are drawn by the component, aligned to the first text line, with a hanging indent."
      files={getComponentFiles('List')}
    >
      <Example
        title="Bulleted"
        description="The default. Long items wrap under their own text, not under the marker."
        code={`import { List } from '@eocrm/design-system';

export function Demo() {
  return (
    <List>
      <List.Item>The assistant acts as you and sees only what your role allows.</List.Item>
      <List.Item>Every change it makes is recorded in the audit log under your name.</List.Item>
      <List.Item>Short item.</List.Item>
    </List>
  );
}`}
      >
        <Constrain width="sm">
          <List>
            <List.Item>The assistant acts as you and sees only what your role allows.</List.Item>
            <List.Item>
              Every change it makes is recorded in the audit log under your name.
            </List.Item>
            <List.Item>Short item.</List.Item>
          </List>
        </Constrain>
      </Example>

      <Example
        title="Numbered"
        description="Plain muted figures. Numbers follow item position."
        code={`import { List } from '@eocrm/design-system';

export function Demo() {
  return (
    <List variant="number">
      <List.Item>Open Settings and choose Integrations.</List.Item>
      <List.Item>Create a token and copy it; it is shown once.</List.Item>
      <List.Item>Paste the token into your client and save.</List.Item>
    </List>
  );
}`}
      >
        <Constrain width="sm">
          <List variant="number">
            <List.Item>Open Settings and choose Integrations.</List.Item>
            <List.Item>Create a token and copy it; it is shown once.</List.Item>
            <List.Item>Paste the token into your client and save.</List.Item>
          </List>
        </Constrain>
      </Example>

      <Example
        title="Numbered badges"
        description="numberStyle='badge' for step-by-step instructions."
        code={`import { List } from '@eocrm/design-system';

export function Demo() {
  return (
    <List variant="number" numberStyle="badge">
      <List.Item>Open Settings and choose Integrations.</List.Item>
      <List.Item>
        Create a token and copy it. It is shown once, so store it somewhere safe before you leave
        the page.
      </List.Item>
      <List.Item>Paste the token into your client and save.</List.Item>
    </List>
  );
}`}
      >
        <Constrain width="sm">
          <List variant="number" numberStyle="badge">
            <List.Item>Open Settings and choose Integrations.</List.Item>
            <List.Item>
              Create a token and copy it. It is shown once, so store it somewhere safe before you
              leave the page.
            </List.Item>
            <List.Item>Paste the token into your client and save.</List.Item>
          </List>
        </Constrain>
      </Example>

      <Example
        title="Heading steps"
        description="size='heading' centres the marker on the first line of a Title size='xl'; the badge becomes a rounded square. A List nested in a step keeps its own (body) size."
        code={`import { List, Text, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <List variant="number" numberStyle="badge" size="heading" gap="md">
      <List.Item>
        <Title order={3} size="xl">Create a token</Title>
        <Text tone="muted">Open Settings, choose Integrations and create a token.</Text>
      </List.Item>
      <List.Item>
        <Title order={3} size="xl">Connect your client</Title>
        <Text tone="muted">Paste the token into the client and save.</Text>
        <List variant="number" numberStyle="badge">
          <List.Item>Open Customize, then Connectors.</List.Item>
          <List.Item>Choose Add custom connector.</List.Item>
        </List>
      </List.Item>
    </List>
  );
}`}
      >
        <Constrain width="sm">
          <List variant="number" numberStyle="badge" size="heading" gap="md">
            <List.Item>
              <Title order={3} size="xl">
                Create a token
              </Title>
              <Text tone="muted">Open Settings, choose Integrations and create a token.</Text>
            </List.Item>
            <List.Item>
              <Title order={3} size="xl">
                Connect your client
              </Title>
              <Text tone="muted">Paste the token into the client and save.</Text>
              <List variant="number" numberStyle="badge">
                <List.Item>Open Customize, then Connectors.</List.Item>
                <List.Item>Choose Add custom connector.</List.Item>
              </List>
            </List.Item>
          </List>
        </Constrain>
      </Example>

      <Example
        title="Gap"
        description="gap='xs' for dense reference lists, 'sm' (default), 'md' for multi-line items."
        code={`import { List } from '@eocrm/design-system';

export function Demo() {
  return (
    <>
      <List gap="xs">
        <List.Item>Extra small</List.Item>
        <List.Item>Extra small</List.Item>
      </List>
      <List gap="md">
        <List.Item>Medium</List.Item>
        <List.Item>Medium</List.Item>
      </List>
    </>
  );
}`}
      >
        <Constrain width="sm">
          <Stack gap="md">
            <List gap="xs">
              <List.Item>Extra small</List.Item>
              <List.Item>Extra small</List.Item>
            </List>
            <List gap="md">
              <List.Item>Medium</List.Item>
              <List.Item>Medium</List.Item>
            </List>
          </Stack>
        </Constrain>
      </Example>

      <Example
        title="Conditional items"
        description="Numbers are CSS counters, so a wrapper that renders nothing leaves no gap: this reads 1, 2, 3."
        code={`import { List } from '@eocrm/design-system';

function MaybeStep({ show, children }: { show: boolean; children: string }) {
  return show ? <List.Item>{children}</List.Item> : null;
}

export function Demo() {
  return (
    <List variant="number" numberStyle="badge">
      <MaybeStep show>First step</MaybeStep>
      <MaybeStep show={false}>Hidden step</MaybeStep>
      <MaybeStep show>Second step</MaybeStep>
      <MaybeStep show>Third step</MaybeStep>
    </List>
  );
}`}
      >
        <Constrain width="sm">
          <List variant="number" numberStyle="badge">
            <MaybeStep show>First step</MaybeStep>
            <MaybeStep show={false}>Hidden step</MaybeStep>
            <MaybeStep show>Second step</MaybeStep>
            <MaybeStep show>Third step</MaybeStep>
          </List>
        </Constrain>
      </Example>

      <Example
        title="Nested"
        description="A List inside a List.Item indents one level. Numbering restarts per list."
        code={`import { List } from '@eocrm/design-system';

export function Demo() {
  return (
    <List variant="number">
      <List.Item>
        Response headers
        <List variant="number" gap="xs">
          <List.Item>X-RateLimit-Limit</List.Item>
          <List.Item>X-RateLimit-Remaining</List.Item>
        </List>
      </List.Item>
      <List.Item>Status codes</List.Item>
    </List>
  );
}`}
      >
        <Constrain width="sm">
          <List variant="number">
            <List.Item>
              Response headers
              <List variant="number" gap="xs">
                <List.Item>X-RateLimit-Limit</List.Item>
                <List.Item>X-RateLimit-Remaining</List.Item>
              </List>
            </List.Item>
            <List.Item>Status codes</List.Item>
          </List>
        </Constrain>
      </Example>

      <Example
        title="Inside Card and Alert"
        description="Text inherits size and colour from context."
        code={`import { Alert, Card, List } from '@eocrm/design-system';

export function Demo() {
  return (
    <>
      <Card>
        <List>
          <List.Item>Inherits the Card text colour.</List.Item>
          <List.Item>And its size.</List.Item>
        </List>
      </Card>
      <Alert tone="info">
        <List gap="xs">
          <List.Item>Also fine in an Alert body.</List.Item>
        </List>
      </Alert>
    </>
  );
}`}
      >
        <Constrain width="sm">
          <Stack gap="md">
            <Card>
              <List>
                <List.Item>Inherits the Card text colour.</List.Item>
                <List.Item>And its size.</List.Item>
              </List>
            </Card>
            <Alert tone="info">
              <List gap="xs">
                <List.Item>Also fine in an Alert body.</List.Item>
              </List>
            </Alert>
          </Stack>
        </Constrain>
      </Example>
      <Text tone="muted" size="sm">
        Key–value pairs belong in DefinitionList; rows of records in Card.List or Table.
      </Text>
    </DemoLayout>
  );
}
