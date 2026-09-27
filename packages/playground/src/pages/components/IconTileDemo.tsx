import {
  Badge,
  Cluster,
  EntityChip,
  IconTile,
  PALETTE_COLORS,
  Stack,
  Text,
} from '@eocrm/design-system';
import { Shapes, MailPlus, Check, ListTodo, ChevronsUp } from 'lucide-react';
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
        code={`import { Shapes } from 'lucide-react';
import { Cluster, IconTile, PALETTE_COLORS } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm">
      {PALETTE_COLORS.map((c) => (
        <IconTile key={c} color={c} label={c} icon={<Shapes size={16} />} />
      ))}
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm">
          {PALETTE_COLORS.map((c) => (
            <IconTile key={c} color={c} label={c} icon={<Shapes size={16} />} />
          ))}
        </Cluster>
      </Example>

      <Example
        title="Sizes"
        description="xs 20 / sm 24 / md 32 / lg 40 — sizes the tile box; size your icon to match. xs keeps a 14px glyph and fits inside a text or Badge row without growing it."
        code={`import { Shapes } from 'lucide-react';
import { Cluster, IconTile } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <IconTile color="blue" size="xs" icon={<Shapes size={14} />} />
      <IconTile color="blue" size="sm" icon={<Shapes size={14} />} />
      <IconTile color="blue" size="md" icon={<Shapes size={16} />} />
      <IconTile color="blue" size="lg" icon={<Shapes size={20} />} />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <IconTile color="blue" size="xs" icon={<Shapes size={14} />} />
          <IconTile color="blue" size="sm" icon={<Shapes size={14} />} />
          <IconTile color="blue" size="md" icon={<Shapes size={16} />} />
          <IconTile color="blue" size="lg" icon={<Shapes size={20} />} />
        </Cluster>
      </Example>

      <Example
        title="Shape"
        description="square (default) or circle."
        code={`import { MailPlus } from 'lucide-react';
import { Cluster, IconTile } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="center">
      <IconTile color="amber" shape="square" icon={<MailPlus size={16} />} />
      <IconTile color="amber" shape="circle" icon={<MailPlus size={16} />} />
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="center">
          <IconTile color="amber" shape="square" icon={<MailPlus size={16} />} />
          <IconTile color="amber" shape="circle" icon={<MailPlus size={16} />} />
        </Cluster>
      </Example>

      <Example
        title="Decorative vs labelled"
        description="Decorative by default (aria-hidden) beside text; pass a label when the icon stands alone."
        code={`import { Check, MailPlus } from 'lucide-react';
import { Cluster, IconTile, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      {/* decorative — text nearby carries meaning */}
      <Cluster gap="sm" align="center">
        <IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
        <Text>alex@acme.co</Text>
      </Cluster>
      {/* standalone + meaningful → label */}
      <IconTile color="green" label="Verified" icon={<Check size={16} />} />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Cluster gap="sm" align="center">
            <IconTile color="amber" shape="circle" icon={<MailPlus size={14} />} />
            <Text>alex@acme.co</Text>
          </Cluster>
          <IconTile color="green" label="Verified" icon={<Check size={16} />} />
        </Stack>
      </Example>
      <Example
        title="Inline with text"
        description="The `inline` size is a 1em tile that follows the surrounding font size and sizes its own glyph (0.75em). For EntityChip icon/trailing, Badge rows and running text, where even `xs` towers over the capitals."
        code={`import { ChevronsUp, ListTodo } from 'lucide-react';
import { Badge, EntityChip, IconTile, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
    <EntityChip
      prefix="ENG-15"
      label="Migrate billing exports"
      icon={<IconTile size="inline" color="violet" icon={<ListTodo />} />}
      trailing={
        <>
          <IconTile size="inline" color="red" icon={<ChevronsUp />} />
          <Badge tone="warning">In progress</Badge>
        </>
      }
    />
    <Text size="sm">
      Blocked by <IconTile size="inline" color="violet" icon={<ListTodo />} /> ENG-12
    </Text>
    <Text size="xl">
      Blocked by <IconTile size="inline" color="violet" icon={<ListTodo />} /> ENG-12
    </Text>
  </Stack>
  );
}`}
      >
        <Stack gap="md">
          <EntityChip
            prefix="ENG-15"
            label="Migrate billing exports"
            icon={<IconTile size="inline" color="violet" icon={<ListTodo />} />}
            trailing={
              <>
                <IconTile size="inline" color="red" icon={<ChevronsUp />} />
                <Badge tone="warning">In progress</Badge>
              </>
            }
          />
          <Text size="sm">
            Blocked by <IconTile size="inline" color="violet" icon={<ListTodo />} /> ENG-12
          </Text>
          <Text size="xl">
            Blocked by <IconTile size="inline" color="violet" icon={<ListTodo />} /> ENG-12
          </Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
