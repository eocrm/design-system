import { useState } from 'react';
import {
  DateStrip,
  SlotGrid,
  Stack,
  Text,
  type DateStripDay,
  type SlotGridGroup,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import { ResizablePreview } from './ResizablePreview';

const timeLabel = (hour: number, minute: number) => `${hour}:${minute === 0 ? '00' : minute}`;

const GROUPED_SLOTS: SlotGridGroup[] = [
  {
    label: 'Morning',
    slots: Array.from({ length: 6 }, (_, i) => {
      const hour = 9 + i;
      return { key: `m-${hour}`, label: timeLabel(hour, 0) };
    }),
  },
  {
    label: 'Afternoon',
    slots: Array.from({ length: 8 }, (_, i) => {
      const hour = 13 + Math.floor(i / 2);
      const minute = i % 2 === 0 ? 0 : 30;
      return { key: `a-${hour}-${minute}`, label: timeLabel(hour, minute) };
    }),
  },
  {
    label: 'Evening',
    slots: Array.from({ length: 3 }, (_, i) => {
      const hour = 18 + Math.floor(i / 2);
      const minute = i % 2 === 0 ? 0 : 30;
      return { key: `e-${hour}-${minute}`, label: timeLabel(hour, minute) };
    }),
  },
];

const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

const COMBO_PATTERN = [4, 0, 2, 6, 0, 3, 5];
const COMBO_WEEK: DateStripDay[] = Array.from({ length: 7 }, (_, i) => ({
  date: addDays('2026-10-12', i),
  free: COMBO_PATTERN[i],
}));

function slotsForDay(date: string | null, days: DateStripDay[]): SlotGridGroup[] {
  const info = date ? days.find((d) => d.date === date) : undefined;
  if (!info || info.free === 0) return [];
  return [
    {
      label: 'Available',
      slots: Array.from({ length: info.free }, (_, i) => {
        const hour = 9 + i;
        return { key: `${date}T${String(hour).padStart(2, '0')}:00`, label: timeLabel(hour, 0) };
      }),
    },
  ];
}

export function SlotGridDemo() {
  const [slot, setSlot] = useState<string | null>(null);
  const [emptySlot, setEmptySlot] = useState<string | null>(null);
  const [comboDay, setComboDay] = useState<string | null>(null);
  const [comboSlot, setComboSlot] = useState<string | null>(null);

  return (
    <DemoLayout
      name="SlotGrid"
      componentName="SlotGrid"
      description="Selectable time-slot tiles grouped by part of the day, with an empty state. 6 columns, 3 on a narrow container."
      files={getComponentFiles('SlotGrid')}
    >
      <Example
        title="Grouped slots"
        description="Morning (6), Afternoon (8) and Evening (3) slots. Narrow the container to see 6 columns collapse to 3 below 768px."
        code={`import { useState } from 'react';
import { SlotGrid, type SlotGridGroup } from '@eocrm/design-system';

const groups: SlotGridGroup[] = [
  { label: 'Morning', slots: [{ key: 'm-9', label: '9:00' }, /* … 6 total */] },
  { label: 'Afternoon', slots: [{ key: 'a-13-0', label: '13:00' }, /* … 8 total */] },
  { label: 'Evening', slots: [{ key: 'e-18-0', label: '18:00' }, /* … 3 total */] },
];

export function Demo() {
  const [slot, setSlot] = useState<string | null>(null);
  return <SlotGrid groups={groups} value={slot} onChange={setSlot} />;
}`}
      >
        <ResizablePreview>
          <SlotGrid groups={GROUPED_SLOTS} value={slot} onChange={setSlot} />
        </ResizablePreview>
      </Example>

      <Example
        title="Empty"
        description="Default localized empty state above; a custom empty node (any ReactNode) below."
        code={`import { useState } from 'react';
import { SlotGrid, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  const [slot, setSlot] = useState<string | null>(null);

  return (
    <Stack gap="lg">
      <SlotGrid groups={[]} value={slot} onChange={setSlot} />
      <SlotGrid
        groups={[]}
        value={slot}
        onChange={setSlot}
        empty={<Text tone="danger">Fully booked — try another day</Text>}
      />
    </Stack>
  );
}`}
      >
        <Stack gap="lg">
          <SlotGrid groups={[]} value={emptySlot} onChange={setEmptySlot} />
          <SlotGrid
            groups={[]}
            value={emptySlot}
            onChange={setEmptySlot}
            empty={<Text tone="danger">Fully booked — try another day</Text>}
          />
        </Stack>
      </Example>

      <Example
        title="With DateStrip"
        description="The booking time step: DateStrip picks the day, SlotGrid the time. No slots render until a day is chosen."
        code={`import { useState } from 'react';
import {
  DateStrip,
  SlotGrid,
  Stack,
  Text,
  type DateStripDay,
  type SlotGridGroup,
} from '@eocrm/design-system';

const week: DateStripDay[] = [
  { date: '2026-10-12', free: 4 },
  { date: '2026-10-13', free: 0 },
  { date: '2026-10-14', free: 2 },
  { date: '2026-10-15', free: 6 },
  { date: '2026-10-16', free: 0 },
  { date: '2026-10-17', free: 3 },
  { date: '2026-10-18', free: 5 },
];

function slotsForDay(date: string | null, days: DateStripDay[]): SlotGridGroup[] {
  const info = date ? days.find((d) => d.date === date) : undefined;
  if (!info || info.free === 0) return [];
  return [
    {
      label: 'Available',
      slots: Array.from({ length: info.free }, (_, i) => {
        const hour = 9 + i;
        return { key: \`\${date}T\${String(hour).padStart(2, '0')}:00\`, label: \`\${hour}:00\` };
      }),
    },
  ];
}

export function Demo() {
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  return (
    <Stack gap="lg">
      <DateStrip
        days={week}
        value={day}
        onChange={setDay}
        onPrevious={() => {}}
        onNext={() => {}}
        canPrevious={false}
        canNext={false}
      />
      <SlotGrid
        groups={slotsForDay(day, week)}
        value={slot}
        onChange={setSlot}
        empty={<Text tone="muted">Pick a day to see times</Text>}
      />
    </Stack>
  );
}`}
      >
        <Stack gap="lg">
          <DateStrip
            days={COMBO_WEEK}
            value={comboDay}
            onChange={setComboDay}
            onPrevious={() => {}}
            onNext={() => {}}
            canPrevious={false}
            canNext={false}
          />
          <SlotGrid
            groups={slotsForDay(comboDay, COMBO_WEEK)}
            value={comboSlot}
            onChange={setComboSlot}
            empty={<Text tone="muted">Pick a day to see times</Text>}
          />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
