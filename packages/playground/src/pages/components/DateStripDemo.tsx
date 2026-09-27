import { useState } from 'react';
import { DateStrip, Stack, Text, type DateStripDay } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
import { ResizablePreview } from './ResizablePreview';

const INITIAL_WEEK = '2026-10-05';
const PATTERN = [3, 1, 9, 0, 2, 0, 4];

const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

function weekDays(weekStart: string, weekIndex: number): DateStripDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    free: PATTERN[(i + weekIndex) % 7],
  }));
}

const MONTH_BOUNDARY_WEEK: DateStripDay[] = Array.from({ length: 7 }, (_, i) => ({
  date: addDays('2026-09-28', i),
  free: PATTERN[i],
}));

export function DateStripDemo() {
  const [weekStart, setWeekStart] = useState(INITIAL_WEEK);
  const [weekIndex, setWeekIndex] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const days = weekDays(weekStart, weekIndex);

  const [boundaryDay, setBoundaryDay] = useState<string | null>(null);

  return (
    <DemoLayout
      name="DateStrip"
      componentName="DateStrip"
      description="One week of selectable day tiles under a month heading, with previous/next week buttons. Each tile shows the free-time count; a day with none is disabled."
      files={getComponentFiles('DateStrip')}
    >
      <Example
        title="Booking week"
        description="Stateful week of 7 days with a free-time count per day. Previous is disabled on the first week, Next after 4 weeks."
        code={`import { useState } from 'react';
import { DateStrip, Text, type DateStripDay } from '@eocrm/design-system';

const PATTERN = [3, 1, 9, 0, 2, 0, 4];
const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

function weekDays(weekStart: string, weekIndex: number): DateStripDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    free: PATTERN[(i + weekIndex) % 7],
  }));
}

export function Demo() {
  const [weekStart, setWeekStart] = useState('2026-10-05');
  const [weekIndex, setWeekIndex] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const days = weekDays(weekStart, weekIndex);

  return (
    <>
      <DateStrip
        days={days}
        value={day}
        onChange={setDay}
        onPrevious={() => {
          setWeekStart(addDays(weekStart, -7));
          setWeekIndex((i) => i - 1);
        }}
        onNext={() => {
          setWeekStart(addDays(weekStart, 7));
          setWeekIndex((i) => i + 1);
        }}
        canPrevious={weekIndex > 0}
        canNext={weekIndex < 3}
      />
      <Text tone="muted">Selected: {day ?? 'none'}</Text>
    </>
  );
}`}
      >
        <Stack gap="sm">
          <DateStrip
            days={days}
            value={day}
            onChange={setDay}
            onPrevious={() => {
              setWeekStart(addDays(weekStart, -7));
              setWeekIndex((i) => i - 1);
            }}
            onNext={() => {
              setWeekStart(addDays(weekStart, 7));
              setWeekIndex((i) => i + 1);
            }}
            canPrevious={weekIndex > 0}
            canNext={weekIndex < 3}
          />
          <Text tone="muted">Selected: {day ?? 'none'}</Text>
        </Stack>
      </Example>

      <Example
        title="Month boundary"
        description="A week spanning September into October — the heading reads 'September – October 2026'."
        code={`const week = [
  { date: '2026-09-28', free: 3 },
  { date: '2026-09-29', free: 1 },
  { date: '2026-09-30', free: 9 },
  { date: '2026-10-01', free: 0 },
  { date: '2026-10-02', free: 2 },
  { date: '2026-10-03', free: 0 },
  { date: '2026-10-04', free: 4 },
];

<DateStrip
  days={week}
  value={day}
  onChange={setDay}
  onPrevious={() => {}}
  onNext={() => {}}
/>`}
      >
        <DateStrip
          days={MONTH_BOUNDARY_WEEK}
          value={boundaryDay}
          onChange={setBoundaryDay}
          onPrevious={() => {}}
          onNext={() => {}}
        />
      </Example>

      <Example
        title="Narrow container"
        description="Below 480px (a container query on the strip's own width) the per-day free-time count hides so the tiles stay legible."
        code={`<ResizablePreview initialWidth={320}>
  <DateStrip days={days} value={day} onChange={setDay} onPrevious={prev} onNext={next} />
</ResizablePreview>`}
      >
        <ResizablePreview initialWidth={320}>
          <DateStrip
            days={days}
            value={day}
            onChange={setDay}
            onPrevious={() => {
              setWeekStart(addDays(weekStart, -7));
              setWeekIndex((i) => i - 1);
            }}
            onNext={() => {
              setWeekStart(addDays(weekStart, 7));
              setWeekIndex((i) => i + 1);
            }}
            canPrevious={weekIndex > 0}
            canNext={weekIndex < 3}
          />
        </ResizablePreview>
      </Example>
    </DemoLayout>
  );
}
