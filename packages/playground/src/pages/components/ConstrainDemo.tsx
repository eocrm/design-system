import { Button, Cluster, Constrain, Input, Progress, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ConstrainDemo() {
  return (
    <DemoLayout
      name="Constrain"
      componentName="Constrain"
      description="Width / flex constraint primitive — the one place layout-sizing props live (Stack/Cluster/Grid are spacing-only). Caps widths and lets a box fill a flex row."
      files={getComponentFiles('Constrain')}
    >
      <Example
        title="maxWidth scale"
        description="A named scale (xs 200 / sm 320 / md 448 / lg 640 / xl 800 / full) mapped to --measure-* tokens. Here, capping a full-width Input."
        code={`import { Constrain, Input, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Constrain maxWidth="xs">
        <Input placeholder="maxWidth xs (200)" />
      </Constrain>
      <Constrain maxWidth="sm">
        <Input placeholder="maxWidth sm (320)" />
      </Constrain>
      <Constrain maxWidth="md">
        <Input placeholder="maxWidth md (448)" />
      </Constrain>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Constrain maxWidth="xs">
            <Input placeholder="maxWidth xs (200)" />
          </Constrain>
          <Constrain maxWidth="sm">
            <Input placeholder="maxWidth sm (320)" />
          </Constrain>
          <Constrain maxWidth="md">
            <Input placeholder="maxWidth md (448)" />
          </Constrain>
        </Stack>
      </Example>

      <Example
        title="flex='grow' — fill a row"
        description="Inside a Cluster, flex='grow' makes the box take the remaining space next to a fixed-size sibling."
        code={`import { Button, Cluster, Constrain, Progress } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster wrap={false} gap="sm">
      <Constrain flex="grow">
        <Progress value={62} />
      </Constrain>
      <Button variant="secondary" size="sm">
        Upgrade plan
      </Button>
    </Cluster>
  );
}`}
      >
        <Cluster wrap={false} gap="sm">
          <Constrain flex="grow">
            <Progress value={62} />
          </Constrain>
          <Button variant="secondary" size="sm">
            Upgrade plan
          </Button>
        </Cluster>
      </Example>

      <Example
        title="minWidth floor"
        description="minWidth keeps a box from collapsing below a step."
        code={`import { Constrain, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Constrain minWidth="sm">
      <Text>I'm at least 320px wide.</Text>
    </Constrain>
  );
}`}
      >
        <Constrain minWidth="sm">
          <Text>I'm at least 320px wide.</Text>
        </Constrain>
      </Example>
    </DemoLayout>
  );
}
