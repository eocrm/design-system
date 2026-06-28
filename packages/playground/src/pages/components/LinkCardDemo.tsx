import { Grid, LinkCard, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function LinkCardDemo() {
  return (
    <DemoLayout
      name="LinkCard"
      componentName="LinkCard"
      description='A clickable Card whose whole surface navigates or acts. Polymorphic like Link (as defaults to <a>; pass as={RouterLink} or as="button"). Hover lift + focus ring.'
      files={getComponentFiles('LinkCard')}
    >
      <Example
        title="As a link (default <a>)"
        description="The whole card is one anchor. Hover for the lift; tab to it for the focus ring."
        code={`import { LinkCard, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <LinkCard href="https://status.example.com">
      <Stack gap="xs">
        <Text weight="semibold">Status page</Text>
        <Text size="sm" tone="muted">All systems operational.</Text>
      </Stack>
    </LinkCard>
  );
}`}
      >
        <LinkCard href="https://status.example.com">
          <Stack gap="xs">
            <Text weight="semibold">Status page</Text>
            <Text size="sm" tone="muted">
              All systems operational.
            </Text>
          </Stack>
        </LinkCard>
      </Example>

      <Example
        title="As a button (action)"
        description={`Pass as="button" for an action instead of navigation.`}
        code={`import { LinkCard, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <LinkCard as="button" type="button" onClick={() => {}}>
      <Text weight="semibold">Import contacts</Text>
    </LinkCard>
  );
}`}
      >
        <LinkCard as="button" type="button" onClick={() => undefined}>
          <Text weight="semibold">Import contacts</Text>
        </LinkCard>
      </Example>

      <Example
        title="Index grid"
        description="The canonical use — a grid of cards each linking somewhere. padding + tone match Card."
        code={`import { Grid, LinkCard, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Grid minColumnWidth="220px" gap="md">
      <LinkCard href="https://example.com/dashboard" tone="accent">
        <Stack gap="xs">
          <Text weight="semibold">Dashboard</Text>
          <Text size="sm" tone="muted">KPIs & pipeline.</Text>
        </Stack>
      </LinkCard>
      <LinkCard href="https://example.com/deals" tone="success">
        <Stack gap="xs">
          <Text weight="semibold">Deals</Text>
          <Text size="sm" tone="muted">Kanban board.</Text>
        </Stack>
      </LinkCard>
      <LinkCard href="https://example.com/contacts">
        <Stack gap="xs">
          <Text weight="semibold">Contacts</Text>
          <Text size="sm" tone="muted">Directory.</Text>
        </Stack>
      </LinkCard>
    </Grid>
  );
}`}
      >
        <Grid minColumnWidth="220px" gap="md">
          <LinkCard href="https://example.com/dashboard" tone="accent">
            <Stack gap="xs">
              <Text weight="semibold">Dashboard</Text>
              <Text size="sm" tone="muted">
                KPIs & pipeline.
              </Text>
            </Stack>
          </LinkCard>
          <LinkCard href="https://example.com/deals" tone="success">
            <Stack gap="xs">
              <Text weight="semibold">Deals</Text>
              <Text size="sm" tone="muted">
                Kanban board.
              </Text>
            </Stack>
          </LinkCard>
          <LinkCard href="https://example.com/contacts">
            <Stack gap="xs">
              <Text weight="semibold">Contacts</Text>
              <Text size="sm" tone="muted">
                Directory.
              </Text>
            </Stack>
          </LinkCard>
        </Grid>
      </Example>
    </DemoLayout>
  );
}
