import { useState } from 'react';
import { ColorPicker } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/ColorPicker/ColorPicker.tsx?raw';
import scssSource from '@lib-source/components/ColorPicker/ColorPicker.module.scss?raw';

const BRAND_PRESETS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

function InlineNoPresets() {
  const [hex, setHex] = useState('#4F46E5');
  return (
    <Stack gap="sm">
      <ColorPicker.Panel value={hex} onChange={setHex} />
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function PopoverDefaultTrigger() {
  const [hex, setHex] = useState('#10B981');
  return (
    <Stack gap="sm" align="start">
      <ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function PopoverCustomTrigger() {
  const [hex, setHex] = useState('#F59E0B');
  return (
    <Stack gap="sm" align="start">
      <ColorPicker value={hex} onChange={setHex}>
        <ColorPicker.Trigger asChild>
          <Button variant="secondary">Pick a color ({hex})</Button>
        </ColorPicker.Trigger>
      </ColorPicker>
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function InlineWithPresets() {
  const [hex, setHex] = useState('#4F46E5');
  return (
    <Stack gap="sm">
      <ColorPicker.Panel value={hex} onChange={setHex} presets={BRAND_PRESETS} />
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function DisabledDemo() {
  const [hex, setHex] = useState('#4F46E5');
  return (
    <Cluster gap="md" align="start">
      <ColorPicker.Panel value={hex} onChange={setHex} disabled />
      <ColorPicker value={hex} onChange={setHex} disabled triggerLabel="Locked" />
    </Cluster>
  );
}

export function ColorPickerDemo() {
  return (
    <DemoLayout
      name="ColorPicker"
      description="Controlled HEX color picker with two distribution shapes — compact popover trigger for form fields, and an inline <ColorPicker.Panel> for theme builders. Hand-rolled SV square + hue slider + HEX input. Consumer-supplied preset swatches."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="ColorPicker.tsx"
      scssFilename="ColorPicker.module.scss"
      componentName="ColorPicker"
    >
      <Example
        title="Inline panel, no presets"
        description="The bare picker — <ColorPicker.Panel> renders directly without a popover wrapping. Use this for theme builders and settings rows where the picker is always visible."
        code={`function InlineNoPresets() {
  const [hex, setHex] = useState('#4F46E5');
  return <ColorPicker.Panel value={hex} onChange={setHex} />;
}`}
      >
        <InlineNoPresets />
      </Example>

      <Example
        title="Popover with default trigger"
        description="The canonical CRM form-field shape. Default trigger is an input-styled button with a 16×16 color swatch and the uppercase HEX. triggerLabel customizes the accessible label."
        code={`<ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />`}
      >
        <PopoverDefaultTrigger />
      </Example>

      <Example
        title="Popover with custom trigger"
        description="Override the default trigger via <ColorPicker.Trigger asChild>. The child must forwardRef — <Popover.Trigger> clones it to inject the click handler + aria-*."
        code={`<ColorPicker value={hex} onChange={setHex}>
  <ColorPicker.Trigger asChild>
    <Button variant="secondary">Pick a color ({hex})</Button>
  </ColorPicker.Trigger>
</ColorPicker>`}
      >
        <PopoverCustomTrigger />
      </Example>

      <Example
        title="Inline with consumer-supplied presets"
        description="Pass `presets={[...]}` to render a swatch grid below the hue slider. Clicking a swatch commits the color (fires both onChange and onChangeEnd). Selected swatch gets an inset ring + check overlay."
        code={`<ColorPicker.Panel
  value={hex}
  onChange={setHex}
  presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6']}
/>`}
      >
        <InlineWithPresets />
      </Example>

      <Example
        title="Disabled — both variants"
        description="Inline panel: dimmed, SV pad has aria-disabled and tabIndex=-1, slider + input + presets are all non-interactive. Popover: trigger is disabled, click doesn't open the panel."
        code={`<ColorPicker.Panel value={hex} onChange={setHex} disabled />
<ColorPicker value={hex} onChange={setHex} disabled triggerLabel="Locked" />`}
      >
        <DisabledDemo />
      </Example>
    </DemoLayout>
  );
}
