import { Dot, Cluster, Stack, Text, PALETTE_COLORS } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const TONES = ['neutral', 'info', 'success', 'warning', 'danger', 'purple'] as const;

export function DotDemo() {
  return (
    <DemoLayout
      name="Dot"
      description="A bare, background-less colored circle (6px) for color-coding affordances — a leading dot on a filter, a status indicator, a legend swatch. Decorative (aria-hidden); always pair it with a visible label."
      files={getComponentFiles('Dot')}
      componentName="Dot"
    >
      <Example
        title="Semantic tones"
        description="Pass `tone` for one of the 6 semantic BadgeTones. Matches the Badge tone palette so a dot legend lines up with status badges. `neutral` is the default when neither `tone` nor `color` is set."
        code={`<Dot tone="neutral" />
<Dot tone="info" />
<Dot tone="success" />
<Dot tone="warning" />
<Dot tone="danger" />
<Dot tone="purple" />`}
      >
        <Cluster gap="md" align="center">
          {TONES.map((tone) => (
            <Cluster key={tone} gap="xs" align="center">
              <Dot tone={tone} />
              <Text as="span" size="sm">
                {tone}
              </Text>
            </Cluster>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Palette colors (categorical)"
        description="Pass `color` for any of the 30 categorical PaletteColors. The dot paints with that color's saturated `--color-palette-<name>-fg` token — the same color OptionsPicker groups and palette Badges use, so a color-coded filter dot matches its source exactly. `color` wins over `tone` when both are set."
        code={`<Dot color="violet" />
<Dot color="teal" />
<Dot color="amber" />
<Dot color="rose" />`}
      >
        <Cluster gap="md" align="center" wrap>
          {PALETTE_COLORS.map((color) => (
            <Cluster key={color} gap="xs" align="center">
              <Dot color={color} />
              <Text as="span" size="sm">
                {color}
              </Text>
            </Cluster>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Color-coding a filter (realistic)"
        description="The canonical use: a small leading dot beside a label to color-code a category — e.g. an audit-log event-source legend or a per-team filter row. The dot is decorative; the text is the accessible label."
        code={`<Stack gap="xs">
  <Cluster gap="xs" align="center"><Dot color="blue" /> Authentication</Cluster>
  <Cluster gap="xs" align="center"><Dot color="emerald" /> Billing</Cluster>
  <Cluster gap="xs" align="center"><Dot color="orange" /> Permissions</Cluster>
  <Cluster gap="xs" align="center"><Dot tone="danger" /> Security alert</Cluster>
</Stack>`}
      >
        <Stack gap="xs">
          <Cluster gap="xs" align="center">
            <Dot color="blue" />
            <Text as="span" size="sm">
              Authentication
            </Text>
          </Cluster>
          <Cluster gap="xs" align="center">
            <Dot color="emerald" />
            <Text as="span" size="sm">
              Billing
            </Text>
          </Cluster>
          <Cluster gap="xs" align="center">
            <Dot color="orange" />
            <Text as="span" size="sm">
              Permissions
            </Text>
          </Cluster>
          <Cluster gap="xs" align="center">
            <Dot tone="danger" />
            <Text as="span" size="sm">
              Security alert
            </Text>
          </Cluster>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
