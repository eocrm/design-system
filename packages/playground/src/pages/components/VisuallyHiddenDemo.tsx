import {
  Chart,
  DashboardCanvas,
  DashboardWidget,
  Link,
  Stack,
  Table,
  Text,
  Title,
  VisuallyHidden,
  type DashboardCanvasValue,
} from '@eocrm/design-system';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const CANVAS_VALUE: DashboardCanvasValue = {
  items: [{ id: 'w', x: 0, y: 0, w: 6, h: 4 }],
  sections: [],
};

export function VisuallyHiddenDemo() {
  const [canvas, setCanvas] = useState(CANVAS_VALUE);
  return (
    <DemoLayout
      name="VisuallyHidden"
      componentName="VisuallyHidden"
      description="Content removed from the visual layout but kept in the accessibility tree — the standard 'clip' technique (no display: none / visibility: hidden, which would also remove it from assistive tech). Use for text that only screen reader users need."
      files={getComponentFiles('VisuallyHidden')}
    >
      <Example
        title="Icon-only link"
        description="The link renders only an icon — VisuallyHidden supplies its whole accessible name, including the '(opens in a new tab)' context a sighted user never sees rendered anywhere on the page."
        code={`import { Link, VisuallyHidden } from '@eocrm/design-system';
import { ExternalLink } from 'lucide-react';

export function Demo() {
  return (
    <Link href="https://example.com/docs" target="_blank" rel="noopener noreferrer">
      <ExternalLink size={16} aria-hidden="true" />
      <VisuallyHidden>Documentation (opens in a new tab)</VisuallyHidden>
    </Link>
  );
}`}
      >
        <Stack gap="xs" align="start">
          <Link href="https://example.com/docs" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            <VisuallyHidden>Documentation (opens in a new tab)</VisuallyHidden>
          </Link>
          <Text size="sm" tone="muted">
            Sighted users see only the icon. A screen reader announces "Documentation, opens in a
            new tab, link" — the text is in the accessibility tree but never painted.
          </Text>
        </Stack>
      </Example>

      <Example
        title="Hidden section heading"
        description="A landmark labelled by a heading only screen reader users perceive — sighted users infer the section from its position on the page, so painting the heading would be redundant."
        code={`import { Title, VisuallyHidden } from '@eocrm/design-system';

export function Demo() {
  return (
    <nav aria-labelledby="section-nav-heading">
      <VisuallyHidden as="div">
        <Title id="section-nav-heading" order={2}>
          Section navigation
        </Title>
      </VisuallyHidden>
      {/* visible nav links */}
    </nav>
  );
}`}
      >
        <Stack gap="xs" align="start">
          <nav aria-labelledby="demo-section-nav-heading">
            <VisuallyHidden as="div">
              <Title id="demo-section-nav-heading" order={2}>
                Section navigation
              </Title>
            </VisuallyHidden>
            <Text size="sm">Overview · Settings · Members</Text>
          </nav>
          <Text size="sm" tone="muted">
            The "Section navigation" heading is never rendered visually, but a screen reader
            announces it on reaching the landmark — that's what aria-labelledby points at.
          </Text>
        </Stack>
      </Example>
      <Example
        title="Contained in tables and scrolling cells"
        description="A hidden label in a table header, and a Chart (hidden data table and summary) in a scrolling widget body, neither widens the page nor adds a second scrollbar."
        code={`<Table.HeaderCell><VisuallyHidden>Actions</VisuallyHidden></Table.HeaderCell>`}
      >
        <Stack gap="md">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Email address</Table.HeaderCell>
                <Table.HeaderCell>Company name</Table.HeaderCell>
                <Table.HeaderCell>Last activity</Table.HeaderCell>
                <Table.HeaderCell>
                  <VisuallyHidden>Actions</VisuallyHidden>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                <Table.Cell>Acme</Table.Cell>
                <Table.Cell>someone@example.com</Table.Cell>
                <Table.Cell>Acme Incorporated</Table.Cell>
                <Table.Cell>Yesterday at 4:30 PM</Table.Cell>
                <Table.Cell>Edit</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
          <DashboardCanvas
            value={canvas}
            onChange={setCanvas}
            renderItem={() => (
              <DashboardWidget title="Tall body">
                <Stack gap="md">
                  <div style={{ height: 450 }}>Tall content</div>
                  <Chart
                    type="bar"
                    label="Calls per day"
                    categories={['Mon', 'Tue', 'Wed']}
                    series={[{ key: 'calls', label: 'Calls', values: [3, 5, 4] }]}
                    formatValue={(n) => String(n)}
                  />
                </Stack>
              </DashboardWidget>
            )}
          />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
