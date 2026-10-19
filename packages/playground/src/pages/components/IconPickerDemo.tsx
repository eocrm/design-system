import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  CircleDot,
  Clock,
  Equal,
  Flag,
  Flame,
  Minus,
  OctagonAlert,
  Star,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import {
  Field,
  IconPicker,
  Input,
  PALETTE_COLORS,
  Split,
  Stack,
  Text,
  type IconPickerOption,
  type PaletteColor,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const priorityIcons: IconPickerOption[] = [
  { value: 'chevrons-up', label: 'Double chevron up', icon: <ChevronsUp /> },
  { value: 'chevron-up', label: 'Chevron up', icon: <ChevronUp /> },
  { value: 'equal', label: 'Equal', icon: <Equal /> },
  { value: 'chevron-down', label: 'Chevron down', icon: <ChevronDown /> },
  { value: 'chevrons-down', label: 'Double chevron down', icon: <ChevronsDown /> },
  { value: 'arrow-up', label: 'Arrow up', icon: <ArrowUp /> },
  { value: 'arrow-down', label: 'Arrow down', icon: <ArrowDown /> },
  { value: 'minus', label: 'Minus', icon: <Minus /> },
  { value: 'flag', label: 'Flag', icon: <Flag /> },
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
  { value: 'triangle-alert', label: 'Triangle alert', icon: <TriangleAlert /> },
  { value: 'octagon-alert', label: 'Octagon alert', icon: <OctagonAlert /> },
  { value: 'clock', label: 'Clock', icon: <Clock /> },
  { value: 'circle-dot', label: 'Circle dot', icon: <CircleDot /> },
  { value: 'star', label: 'Star', icon: <Star /> },
];

const subsetColors: readonly PaletteColor[] = PALETTE_COLORS.slice(0, 6);
const sizes = ['sm', 'md', 'lg'] as const;

const exampleCode = `import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  CircleDot,
  Clock,
  Equal,
  Flag,
  Flame,
  Minus,
  OctagonAlert,
  Star,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { Field, IconPicker, Stack, Text, type IconPickerOption } from '@eocrm/design-system';

const priorityIcons: IconPickerOption[] = [
  { value: 'chevrons-up', label: 'Double chevron up', icon: <ChevronsUp /> },
  { value: 'chevron-up', label: 'Chevron up', icon: <ChevronUp /> },
  { value: 'equal', label: 'Equal', icon: <Equal /> },
  { value: 'chevron-down', label: 'Chevron down', icon: <ChevronDown /> },
  { value: 'chevrons-down', label: 'Double chevron down', icon: <ChevronsDown /> },
  { value: 'arrow-up', label: 'Arrow up', icon: <ArrowUp /> },
  { value: 'arrow-down', label: 'Arrow down', icon: <ArrowDown /> },
  { value: 'minus', label: 'Minus', icon: <Minus /> },
  { value: 'flag', label: 'Flag', icon: <Flag /> },
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
  { value: 'triangle-alert', label: 'Triangle alert', icon: <TriangleAlert /> },
  { value: 'octagon-alert', label: 'Octagon alert', icon: <OctagonAlert /> },
  { value: 'clock', label: 'Clock', icon: <Clock /> },
  { value: 'circle-dot', label: 'Circle dot', icon: <CircleDot /> },
  { value: 'star', label: 'Star', icon: <Star /> },
];

export function Demo() {
  const [value, setValue] = useState('flame');

  return (
    <Stack gap="sm">
      <Field label="Priority icon" description="Shown beside priority labels">
        <IconPicker value={value} options={priorityIcons} onChange={setValue} />
      </Field>
      <Text tone="muted">Selected: {value}</Text>
    </Stack>
  );
}`;

export function IconPickerDemo() {
  const [value, setValue] = useState('flame');
  const [colorIcon, setColorIcon] = useState('flame');
  const [color, setColor] = useState<PaletteColor>(PALETTE_COLORS[0]);
  const [subsetIcon, setSubsetIcon] = useState('flame');
  const [subsetColor, setSubsetColor] = useState<PaletteColor>(subsetColors[0]);
  const [names, setNames] = useState({ sm: '', md: '', lg: '' });
  const [sizeColors, setSizeColors] = useState<Record<'sm' | 'md' | 'lg', PaletteColor>>({
    sm: PALETTE_COLORS[0],
    md: PALETTE_COLORS[0],
    lg: PALETTE_COLORS[0],
  });
  const [sizeIcons, setSizeIcons] = useState({ sm: 'flag', md: 'flag', lg: 'flag' });

  return (
    <DemoLayout
      name="IconPicker"
      componentName="IconPicker"
      description="Controlled popover grid for choosing one icon from a consumer-curated catalog."
      files={getComponentFiles('IconPicker')}
    >
      <Example
        title="Task priority icon"
        description="The consumer owns glyphs and labels. Field names the trigger with the visible purpose plus its current selection, while the dialog and radio grid keep the visible Field label alone."
        code={exampleCode}
      >
        <Stack gap="sm">
          <Field label="Priority icon" description="Shown beside priority labels">
            <IconPicker value={value} options={priorityIcons} onChange={setValue} />
          </Field>
          <Text tone="muted">Selected: {value}</Text>
        </Stack>
      </Example>
      <Example
        title="Colour mode"
        description="Pass color + onColorChange to pick a palette colour as well. The trigger is tinted and the popover stays open while picking."
        code={`<Field label="Appearance">
  <IconPicker value={icon} options={priorityIcons} onChange={setIcon} color={color} onColorChange={setColor} />
</Field>`}
      >
        <Field label="Appearance">
          <IconPicker
            value={colorIcon}
            options={priorityIcons}
            onChange={setColorIcon}
            color={color}
            onColorChange={setColor}
          />
        </Field>
      </Example>
      <Example
        title="Beside an Input"
        description='size matches Input heights at sm, md and lg. Without a label it is still named "Pick icon and colour"; set aria-label (localized) or use Field label for a specific purpose.'
        code={`<Split
  gap="sm"
  align="center"
  aside={<IconPicker size="md" aria-label="Icon and colour" value={icon} options={priorityIcons} onChange={setIcon} color={color} onColorChange={setColor} />}
>
  <Input size="md" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
</Split>`}
      >
        <Stack gap="sm">
          {sizes.map((size) => (
            <Split
              key={size}
              gap="sm"
              align="center"
              aside={
                <IconPicker
                  size={size}
                  aria-label="Icon and colour"
                  value={sizeIcons[size]}
                  options={priorityIcons}
                  onChange={(v) => setSizeIcons((s) => ({ ...s, [size]: v }))}
                  color={sizeColors[size]}
                  onColorChange={(c) => setSizeColors((s) => ({ ...s, [size]: c }))}
                />
              }
            >
              <Input
                size={size}
                aria-label={`Name (${size})`}
                placeholder="Name"
                value={names[size]}
                onChange={(e) => setNames((n) => ({ ...n, [size]: e.target.value }))}
              />
            </Split>
          ))}
        </Stack>
      </Example>
      <Example
        title="Colour subset"
        description="colors narrows the offered palette, in the given order."
        code={`<IconPicker ... color={color} onColorChange={setColor} colors={PALETTE_COLORS.slice(0, 6)} />`}
      >
        <Field label="Appearance">
          <IconPicker
            value={subsetIcon}
            options={priorityIcons}
            onChange={setSubsetIcon}
            color={subsetColor}
            onColorChange={setSubsetColor}
            colors={subsetColors}
          />
        </Field>
      </Example>
    </DemoLayout>
  );
}
