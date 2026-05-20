import { useState } from 'react';
import { Calendar, type CalendarEvent } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Calendar/Calendar.tsx?raw';
import scssSource from '@lib-source/components/Calendar/Calendar.module.scss?raw';

// ── Demo data ───────────────────────────────────────────────────────────────

const may15 = new Date(2026, 4, 15);

const SAMPLE_EVENTS: CalendarEvent[] = [
  // Recurring standups
  { id: 's1', title: 'Team standup', startsAt: new Date(2026, 4, 4, 9, 30), tone: 'accent' },
  { id: 's2', title: 'Team standup', startsAt: new Date(2026, 4, 11, 9, 30), tone: 'accent' },
  { id: 's3', title: 'Team standup', startsAt: new Date(2026, 4, 18, 9, 30), tone: 'accent' },
  { id: 's4', title: 'Team standup', startsAt: new Date(2026, 4, 25, 9, 30), tone: 'accent' },
  // 1:1s
  { id: '1on1-a', title: '1:1 Sam', startsAt: new Date(2026, 4, 5, 11, 0), tone: 'neutral' },
  { id: '1on1-b', title: '1:1 Priya', startsAt: new Date(2026, 4, 7, 14, 30), tone: 'neutral' },
  { id: '1on1-c', title: '1:1 Yusuf', startsAt: new Date(2026, 4, 12, 11, 0), tone: 'neutral' },
  { id: '1on1-d', title: '1:1 Mei', startsAt: new Date(2026, 4, 19, 11, 0), tone: 'neutral' },
  // Customer meetings
  { id: 'q1', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: 'ac', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: 'cust2', title: 'Onboarding: Globex', startsAt: new Date(2026, 4, 20, 15, 30), tone: 'accent' },
  { id: 'cust3', title: 'QBR: Initech', startsAt: new Date(2026, 4, 26, 10, 0), endsAt: new Date(2026, 4, 26, 11, 30), tone: 'success' },
  // Long conference — spans 3 weeks, exercises the multi-week continuation bars
  {
    id: 'conf',
    title: 'Web Summit 2026',
    startsAt: new Date(2026, 4, 6),
    endsAt: new Date(2026, 4, 20),
    tone: 'success',
    allDay: true,
  },
  // Renewals & risk
  { id: 'rn1', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
  { id: 'rn2', title: 'Renewal: Hooli', startsAt: new Date(2026, 4, 29, 13, 0), tone: 'danger' },
  // Misc
  { id: 'demo', title: 'Pipeline demo', startsAt: new Date(2026, 4, 14, 13, 0), tone: 'success' },
  { id: 'lunch', title: 'Team lunch', startsAt: new Date(2026, 4, 21, 12, 30), endsAt: new Date(2026, 4, 21, 14, 0), tone: 'neutral' },
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
        description="Russian locale — Monday-start grid, Cyrillic month/weekday labels. UI strings like the Today button are the consumer's responsibility; pass them via the labels prop."
        code={`<Calendar
  defaultValue={new Date(2026, 4, 15)}
  events={SAMPLE_EVENTS}
  locale="ru-RU"
  labels={{
    today: 'Сегодня',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    moreEvents: (n) => \`ещё ${'${n}'} событий\`,
  }}
/>`}
      >
        <Calendar
          defaultValue={may15}
          events={SAMPLE_EVENTS}
          locale="ru-RU"
          labels={{
            today: 'Сегодня',
            previousMonth: 'Предыдущий месяц',
            nextMonth: 'Следующий месяц',
            moreEvents: (n) => `ещё ${n} событий`,
          }}
        />
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
