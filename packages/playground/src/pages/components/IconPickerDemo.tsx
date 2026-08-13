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
import { Field, IconPicker, Stack, Text, type IconPickerOption } from '@eocrm/design-system';
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
    </DemoLayout>
  );
}
