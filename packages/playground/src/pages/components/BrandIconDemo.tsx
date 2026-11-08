import { BrandIcon, Button, Cluster, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function BrandIconDemo() {
  return (
    <DemoLayout
      name="BrandIcon"
      componentName="BrandIcon"
      description="Official brand marks for SSO buttons and brand chrome. Ships google + yandex (full colour, brand-mandated, not themeable) and github (monochrome, follows the text colour). For generic UI glyphs use lucide-react."
      files={getComponentFiles('BrandIcon')}
    >
      <Example
        title="The marks"
        description="Each brand at a few sizes. size is pixels (default 20)."
        code={`import { BrandIcon, Cluster, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="lg" align="center">
      {(['google', 'yandex', 'github'] as const).map((name) => (
        <Stack key={name} gap="xs" align="center">
          <Cluster gap="sm" align="center">
            <BrandIcon name={name} size={16} />
            <BrandIcon name={name} size={20} />
            <BrandIcon name={name} size={32} />
          </Cluster>
          <Text size="xs" tone="muted">
            {name}
          </Text>
        </Stack>
      ))}
    </Cluster>
  );
}`}
      >
        <Cluster gap="lg" align="center">
          {(['google', 'yandex', 'github'] as const).map((name) => (
            <Stack key={name} gap="xs" align="center">
              <Cluster gap="sm" align="center">
                <BrandIcon name={name} size={16} />
                <BrandIcon name={name} size={20} />
                <BrandIcon name={name} size={32} />
              </Cluster>
              <Text size="xs" tone="muted">
                {name}
              </Text>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="In SSO buttons"
        description="The canonical use — decorative icon (aria-hidden) beside the provider name."
        code={`import { BrandIcon, Button, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="sm">
      <Button variant="secondary">
        <BrandIcon name="google" size={16} /> Continue with Google
      </Button>
      <Button variant="secondary">
        <BrandIcon name="yandex" size={16} /> Continue with Yandex
      </Button>
    </Stack>
  );
}`}
      >
        <Stack gap="sm">
          <Button variant="secondary">
            <BrandIcon name="google" size={16} /> Continue with Google
          </Button>
          <Button variant="secondary">
            <BrandIcon name="yandex" size={16} /> Continue with Yandex
          </Button>
        </Stack>
      </Example>

      <Example
        title="Labeled (standalone)"
        description="Pass title for a standalone icon — renders role=img + aria-label."
        code={`import { BrandIcon } from '@eocrm/design-system';

export function Demo() {
  return <BrandIcon name="yandex" title="Yandex" size={28} />;
}`}
      >
        <BrandIcon name="yandex" title="Yandex" size={28} />
      </Example>
    </DemoLayout>
  );
}
