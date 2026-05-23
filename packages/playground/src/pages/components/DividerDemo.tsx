import { Button, Card, Cluster, Divider, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Divider/Divider.tsx?raw';
import scssSource from '@lib-source/components/Divider/Divider.module.scss?raw';

export function DividerDemo() {
  return (
    <DemoLayout
      name="Divider"
      componentName="Divider"
      description="Thin separator primitive. Horizontal or vertical, solid or dashed, three size tiers, optional centered label."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Divider.tsx"
      scssFilename="Divider.module.scss"
    >
      <Example
        title="Horizontal default"
        description="A single thin line between two paragraphs."
        code={`<Divider />`}
      >
        <Stack gap="md">
          <p style={{ margin: 0 }}>First section content.</p>
          <Divider />
          <p style={{ margin: 0 }}>Second section content.</p>
        </Stack>
      </Example>

      <Example
        title="Variants and sizes"
        description="Solid (default) and dashed variants. Three size tiers (sm=1px, md=2px, lg=3px)."
        code={`<Divider size="sm" />
<Divider size="md" />
<Divider size="lg" />
<Divider variant="dashed" size="sm" />
<Divider variant="dashed" size="md" />
<Divider variant="dashed" size="lg" />`}
      >
        <Stack gap="md">
          <Divider size="sm" />
          <Divider size="md" />
          <Divider size="lg" />
          <Divider variant="dashed" size="sm" />
          <Divider variant="dashed" size="md" />
          <Divider variant="dashed" size="lg" />
        </Stack>
      </Example>

      <Example
        title="Labeled (auth-form pattern)"
        description="`<Divider>OR</Divider>` between two grouped actions. Switches to <div role='separator'> internally."
        code={`<Button>Sign in with email</Button>
<Divider>OR</Divider>
<Button variant="secondary">Sign in with SSO</Button>`}
      >
        <Stack gap="md">
          <Button>Sign in with email</Button>
          <Divider>OR</Divider>
          <Button variant="secondary">Sign in with SSO</Button>
        </Stack>
      </Example>

      <Example
        title="Vertical inside a Cluster (toolbar)"
        description="Use vertical dividers to separate grouped actions in a horizontal cluster."
        code={`<Cluster gap="sm" align="center">
  <Button variant="ghost" size="sm">Edit</Button>
  <Divider orientation="vertical" />
  <Button variant="ghost" size="sm">Duplicate</Button>
  <Divider orientation="vertical" />
  <Button variant="ghost" size="sm">Archive</Button>
</Cluster>`}
      >
        <Cluster gap="sm" align="center">
          <Button variant="ghost" size="sm">Edit</Button>
          <Divider orientation="vertical" />
          <Button variant="ghost" size="sm">Duplicate</Button>
          <Divider orientation="vertical" />
          <Button variant="ghost" size="sm">Archive</Button>
        </Cluster>
      </Example>

      <Example
        title="Inside a Card (section break)"
        description="A header + Divider + body to clearly separate metadata from content."
        code={`<Card padding="md">
  <Stack gap="sm">
    <strong>Card heading</strong>
    <Divider />
    <p style={{ margin: 0 }}>Card body content goes here.</p>
  </Stack>
</Card>`}
      >
        <Card padding="md">
          <Stack gap="sm">
            <strong>Card heading</strong>
            <Divider />
            <p style={{ margin: 0 }}>Card body content goes here.</p>
          </Stack>
        </Card>
      </Example>

      <Example
        title="Dashed labeled"
        description="Combine variant + label for a softer visual break."
        code={`<Divider variant="dashed">SECTION 2</Divider>`}
      >
        <Divider variant="dashed">SECTION 2</Divider>
      </Example>
    </DemoLayout>
  );
}
