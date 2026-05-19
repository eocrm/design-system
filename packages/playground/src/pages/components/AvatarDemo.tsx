import { Avatar } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Avatar/Avatar.tsx?raw';
import scssSource from '@lib-source/components/Avatar/Avatar.module.scss?raw';

export function AvatarDemo() {
  return (
    <DemoLayout
      name="Avatar"
      description="Circular profile element. Renders an image if src is provided, otherwise the person's initials on a deterministic color background — the same name always gets the same color."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Avatar.tsx"
      scssFilename="Avatar.module.scss"
    >
      <Example
        title="Sizes"
        description="Three sizes. sm (24px) for table rows and dense UI, md (32px) for general use, lg (40px) for detail page headers."
        code={`<Avatar name="Alex Rivera" size="sm" />
<Avatar name="Alex Rivera" size="md" />
<Avatar name="Alex Rivera" size="lg" />`}
      >
        <Cluster gap="md" align="center">
          <Avatar name="Alex Rivera" size="sm" />
          <Avatar name="Alex Rivera" size="md" />
          <Avatar name="Alex Rivera" size="lg" />
        </Cluster>
      </Example>

      <Example
        title="Deterministic color"
        description="The color is computed from the name's hash, so a given user keeps the same avatar color across every page. Six colors in the palette."
        code={`<Avatar name="Alex Rivera" />
<Avatar name="Maya Owens" />
<Avatar name="Sam Chen" />
// …same name → same color, always`}
      >
        <Cluster gap="sm">
          {[
            'Alex Rivera',
            'Aki Tanaka',
            'Jordan Park',
            'Sam Chen',
            'Maya Owens',
            'Priya Shah',
            'Lena Ivanova',
            'Diana Okafor',
          ].map((name) => (
            <Stack key={name} gap="xs" align="center">
              <Avatar name={name} />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-subtle)' }}>
                {name.split(' ')[0]}
              </span>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="With image"
        description="Pass src for a real photo. The name prop stays required and becomes the accessible label."
        code={`<Avatar name="Alex Rivera" src="https://i.pravatar.cc/120?u=alex" />`}
      >
        <Cluster gap="md" align="center">
          <Avatar name="Alex Rivera" src="https://i.pravatar.cc/64?u=alex" size="sm" />
          <Avatar name="Maya Owens" src="https://i.pravatar.cc/96?u=maya" size="md" />
          <Avatar name="Sam Chen" src="https://i.pravatar.cc/120?u=sam" size="lg" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
