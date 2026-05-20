import { useState } from 'react';
import { Calendar, type CalendarEvent } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Calendar/Calendar.tsx?raw';
import scssSource from '@lib-source/components/Calendar/Calendar.module.scss?raw';

// ── Demo data ───────────────────────────────────────────────────────────────

const may15 = new Date(2026, 4, 15);

const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 11, 9), tone: 'accent' },
  {
    id: '2',
    title: 'Quarterly review',
    startsAt: new Date(2026, 4, 13, 14),
    endsAt: new Date(2026, 4, 13, 17),
    tone: 'success',
  },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11), tone: 'accent' },
  {
    id: '4',
    title: 'Vacation',
    startsAt: new Date(2026, 4, 18),
    endsAt: new Date(2026, 4, 22),
    tone: 'warning',
    allDay: true,
  },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27), tone: 'danger' },
];

const OVERFLOW_EVENTS: CalendarEvent[] = [
  { id: 'a', title: 'Standup', startsAt: new Date(2026, 4, 15, 9), tone: 'accent' },
  { id: 'b', title: '1:1 with Sam', startsAt: new Date(2026, 4, 15, 10), tone: 'neutral' },
  { id: 'c', title: 'Demo prep', startsAt: new Date(2026, 4, 15, 11), tone: 'success' },
  { id: 'd', title: 'Lunch', startsAt: new Date(2026, 4, 15, 12), tone: 'neutral' },
  { id: 'e', title: 'Customer call', startsAt: new Date(2026, 4, 15, 14), tone: 'warning' },
  { id: 'f', title: 'Triage', startsAt: new Date(2026, 4, 15, 16), tone: 'danger' },
];

const MULTI_WEEK_EVENTS: CalendarEvent[] = [
  {
    id: 'm1',
    title: 'Conference',
    startsAt: new Date(2026, 4, 6), // Wed May 6
    endsAt: new Date(2026, 4, 22), // Fri May 22 — 3 bars: week 1 (continuesRight), week 2 (both edges), week 3 (continuesLeft)
    tone: 'success',
    allDay: true,
  },
];

// ── Controlled example ──────────────────────────────────────────────────────

function ControlledCalendarDemo() {
  const [cursor, setCursor] = useState<Date>(may15);
  return <Calendar value={cursor} onChange={setCursor} events={SAMPLE_EVENTS} />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CalendarDemo() {
  return (
    <DemoLayout
      name="Calendar"
      componentName="Calendar"
      description="Month view with continuous event bars. Multi-day events span across days; week boundaries split into separate bars with flattened edges."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Calendar.tsx"
      scssFilename="Calendar.module.scss"
    >
      <Example
        title="Default (empty)"
        description="Bare shell with prev/next/today navigation. No events yet."
        code={`<Calendar defaultValue={new Date(2026, 4, 15)} />`}
      >
        <Calendar defaultValue={may15} />
      </Example>

      <Example
        title="With events"
        description="Sample CRM-style events showing all 5 tones, an all-day vacation band, and timed meetings."
        code={`const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 11, 9), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14), endsAt: new Date(2026, 4, 13, 17), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 22), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27), tone: 'danger' },
];

<Calendar defaultValue={new Date(2026, 4, 15)} events={SAMPLE_EVENTS} />`}
      >
        <Calendar defaultValue={may15} events={SAMPLE_EVENTS} />
      </Example>

      <Example
        title="Overflow (+N more)"
        description="Days with more events than maxLanesPerWeek (default 3) collapse to a +N more chip. Click fires onDayClick."
        code={`<Calendar
  defaultValue={new Date(2026, 4, 15)}
  events={OVERFLOW_EVENTS}
  onDayClick={(d) => alert('Day clicked: ' + d.toDateString())}
/>`}
      >
        <Calendar
          defaultValue={may15}
          events={OVERFLOW_EVENTS}
          onDayClick={(d) => alert('Day clicked: ' + d.toDateString())}
        />
      </Example>

      <Example
        title="Multi-week event"
        description="A 17-day event spanning three week rows (Wed May 6 → Fri May 22). Bars in middle weeks have both continuation edges flattened."
        code={`const MULTI_WEEK_EVENTS = [
  { id: 'm1', title: 'Conference', startsAt: new Date(2026, 4, 6), endsAt: new Date(2026, 4, 22), tone: 'success', allDay: true },
];

<Calendar defaultValue={new Date(2026, 4, 15)} events={MULTI_WEEK_EVENTS} />`}
      >
        <Calendar defaultValue={may15} events={MULTI_WEEK_EVENTS} />
      </Example>

      <Example
        title="ru-RU locale"
        description="Russian locale — Monday-start grid, Cyrillic month/weekday labels. The locale prop overrides the LocaleProvider Context."
        code={`<Calendar defaultValue={new Date(2026, 4, 15)} events={SAMPLE_EVENTS} locale="ru-RU" />`}
      >
        <Calendar defaultValue={may15} events={SAMPLE_EVENTS} locale="ru-RU" />
      </Example>

      <Example
        title="Controlled navigation"
        description="Consumer owns the cursor state. Useful for URL-state sync or persisted last-viewed-month."
        code={`function ControlledCalendarDemo() {
  const [cursor, setCursor] = useState(new Date(2026, 4, 15));
  return <Calendar value={cursor} onChange={setCursor} events={SAMPLE_EVENTS} />;
}`}
      >
        <ControlledCalendarDemo />
      </Example>
    </DemoLayout>
  );
}
