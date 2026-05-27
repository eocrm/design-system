import { Card, Page, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

function Stand({ children }: { children: string }) {
  return (
    <Card padding="md">
      <Text>{children}</Text>
    </Card>
  );
}

export function PageDemo() {
  return (
    <DemoLayout
      name="Page"
      componentName="Page"
      description="Page-root layout primitive. Wraps a CRM page's top-level sections with the canonical vertical rhythm (gap='lg'). Each example shows the same three sections under a different gap setting."
      files={getComponentFiles('Page')}
    >
      <Example
        title='Default — gap="lg"'
        description="The canonical CRM page rhythm: 16px between top-level sections. Matches every shipped mockup."
        code={`<Page>
  <PageHeader>{/* … */}</PageHeader>
  <Card>{/* … */}</Card>
  <Table>{/* … */}</Table>
</Page>`}
      >
        <InputExample width="auto">
          <Page>
            <Stand>PageHeader stand-in</Stand>
            <Stand>Card / filter row</Stand>
            <Stand>Table / body section</Stand>
          </Page>
        </InputExample>
      </Example>

      <Example
        title='Compact — gap="md"'
        description="Tighter rhythm (12px). Use for dense dashboards or pages that pack many narrow sections."
        code={`<Page gap="md">
  {/* … */}
</Page>`}
      >
        <InputExample width="auto">
          <Page gap="md">
            <Stand>Section one</Stand>
            <Stand>Section two</Stand>
            <Stand>Section three</Stand>
          </Page>
        </InputExample>
      </Example>

      <Example
        title='Spacious — gap="xl"'
        description="Looser rhythm (24px). Use for overview / hero pages with few large sections."
        code={`<Page gap="xl">
  {/* … */}
</Page>`}
      >
        <InputExample width="auto">
          <Page gap="xl">
            <Stand>Section one</Stand>
            <Stand>Section two</Stand>
            <Stand>Section three</Stand>
          </Page>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
