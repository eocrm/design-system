import { Cluster, IconTile, PALETTE_COLORS, Stack, Text } from '@eocrm/design-system';
import { Shapes, MailPlus, Check } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function IconTileDemo() {
  return (
    <DemoLayout
      name="IconTile"
      componentName="IconTile"
      description="A small decorative tile that frames an icon, tinted by a Palette color. For a person use Avatar; for text/status use Badge."
      files={getComponentFiles('IconTile')}
    >
      <Example
        title="Palette colors"
        description="color is one of the 30 categorical Palette colors (default 'slate'). Categorical, not semantic."
        code={`{PALETTE_COLORS.map((c) => (
  <IconTile key={c} color={c} label={c} icon={<Shapes size={16} />} />
))}`}
      >
        <Cluster gap="sm">
          {PALETTE_COLORS.map((c) => (
            <IconTile key={c} color={c} label={c} icon={<Shapes size={16} />} />
          ))}
        </Cluster>
      </Example>

      <Example
        title="Sizes"
        description="sm 24 / md 32 / lg 40 — sizes the tile box; size your icon to match."
        code={`<IconTile color="blue" size="sm" icon={<Shapes size={14} />} />
<IconTile color="blue" size="md" icon={<Shapes size={16} />} />
<IconTile color="blue" size="lg" icon={<Shapes size={20} />} />`}
      >
        <Cluster gap="md" align="center">
          <IconTile color="blue" size="sm" icon={<Shapes size={14} />} />
          <IconTile color="blue" size="md" icon={<Shapes size={16} />} />
          <IconTile color="blue" size="lg" icon={<Shapes size={20} />} />
        </Cluster>
      </Example>

      <Example
        title="Shape"
        description="square (default) or circle."
        code={`<IconTile color="amber" shape="square" icon={<MailPlus size={16} />} />
<IconTile color="amber" shape="circle" icon={<MailPlus size={16} />} />`}
      >
        <Cluster gap="md" align="center">
          <IconTile color="amber" shape="square" icon={<MailPlus size={16} />} />
          <IconTile color="amber" shape="circle" icon={<MailPlus size={16} />} />
        </Cluster>
      </Example>

      <Example
        title="Decorative vs labelled"
        description="Decorative by default (aria-hidden) beside text; pass a label when the icon stands alone."
        code={`// decorative — text nearby carries meaning
<Cluster gap="sm" align="center">
  <IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
  <Text>alex@acme.co</Text>
</Cluster>

// standalone + meaningful → label
<IconTile color="green" label="Verified" icon={<Check size={16} />} />`}
      >
        <Stack gap="md">
          <Cluster gap="sm" align="center">
            <IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
            <Text>alex@acme.co</Text>
          </Cluster>
          <IconTile color="green" label="Verified" icon={<Check size={16} />} />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
