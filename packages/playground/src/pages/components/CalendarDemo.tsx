import { useState } from 'react';
import { Calendar, type CalendarEvent } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Calendar/Calendar.tsx?raw';
import scssSource from '@lib-source/components/Calendar/Calendar.module.scss?raw';

// ── Demo data ───────────────────────────────────────────────────────────────
//
// Events are anchored to the CURRENT month rather than a fixed calendar date,
// so the demo always renders "this month" no matter when you open it. The
// `Calendar`'s defaultValue is `today`, and helpers below produce dates
// relative to it.

const TODAY = new Date();
const Y = TODAY.getFullYear();
const M = TODAY.getMonth();
const D = TODAY.getDate();

/** A date `offset` days from today, at the given time of day. */
function fromToday(offset: number, hour = 0, minute = 0): Date {
  return new Date(Y, M, D + offset, hour, minute);
}

/** Every Monday in the current calendar month, as Dates at 00:00. */
function mondaysOfThisMonth(): Date[] {
  const result: Date[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(Y, M, d);
    if (date.getMonth() !== M) break;
    if (date.getDay() === 1) result.push(date);
  }
  return result;
}

const SAMPLE_EVENTS: CalendarEvent[] = [
  // Recurring standups — every Monday of this month
  ...mondaysOfThisMonth().map<CalendarEvent>((d, i) => ({
    id: `standup-${i}`,
    title: 'Team standup',
    startsAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 30),
    tone: 'accent',
  })),
  // 1:1s scattered relative to today
  { id: '1on1-a', title: '1:1 Sam', startsAt: fromToday(-5, 11, 0), tone: 'neutral' },
  { id: '1on1-b', title: '1:1 Priya', startsAt: fromToday(-3, 14, 30), tone: 'neutral' },
  { id: '1on1-c', title: '1:1 Yusuf', startsAt: fromToday(2, 11, 0), tone: 'neutral' },
  { id: '1on1-d', title: '1:1 Mei', startsAt: fromToday(9, 11, 0), tone: 'neutral' },
  // Customer meetings
  {
    id: 'q1',
    title: 'Quarterly review',
    startsAt: fromToday(-2, 14, 0),
    endsAt: fromToday(-2, 17, 0),
    tone: 'success',
  },
  { id: 'ac', title: 'Customer call: Acme', startsAt: fromToday(0, 11, 0), tone: 'accent' },
  { id: 'cust2', title: 'Onboarding: Globex', startsAt: fromToday(5, 15, 30), tone: 'accent' },
  {
    id: 'cust3',
    title: 'QBR: Initech',
    startsAt: fromToday(11, 10, 0),
    endsAt: fromToday(11, 11, 30),
    tone: 'success',
  },
  // Long conference — spans across today's week boundary
  {
    id: 'conf',
    title: 'Web Summit',
    startsAt: fromToday(-8),
    endsAt: fromToday(7),
    tone: 'success',
    allDay: true,
  },
  // Renewals & risk
  { id: 'rn1', title: 'Renewal: Beta Co.', startsAt: fromToday(12, 9, 0), tone: 'danger' },
  { id: 'rn2', title: 'Renewal: Hooli', startsAt: fromToday(14, 13, 0), tone: 'danger' },
  // Misc
  { id: 'demo', title: 'Pipeline demo', startsAt: fromToday(-1, 13, 0), tone: 'success' },
  {
    id: 'lunch',
    title: 'Team lunch',
    startsAt: fromToday(6, 12, 30),
    endsAt: fromToday(6, 14, 0),
    tone: 'neutral',
  },
];

const OVERFLOW_EVENTS: CalendarEvent[] = [
  { id: 'a', title: 'Standup', startsAt: fromToday(0, 9), tone: 'accent' },
  { id: 'b', title: '1:1 with Sam', startsAt: fromToday(0, 10), tone: 'neutral' },
  { id: 'c', title: 'Demo prep', startsAt: fromToday(0, 11), tone: 'success' },
  { id: 'd', title: 'Lunch', startsAt: fromToday(0, 12), tone: 'neutral' },
  { id: 'e', title: 'Customer call', startsAt: fromToday(0, 14), tone: 'warning' },
  { id: 'f', title: 'Triage', startsAt: fromToday(0, 16), tone: 'danger' },
];

const MULTI_WEEK_EVENTS: CalendarEvent[] = [
  {
    id: 'm1',
    title: 'Conference',
    // ~17 days centered on today — guaranteed to cross at least 2 week
    // boundaries regardless of where in the month "today" falls.
    startsAt: fromToday(-9),
    endsAt: fromToday(7),
    tone: 'success',
    allDay: true,
  },
];

// ── Controlled example ──────────────────────────────────────────────────────

function ControlledCalendarDemo() {
  const [cursor, setCursor] = useState<Date>(TODAY);
  return <Calendar value={cursor} onChange={setCursor} events={SAMPLE_EVENTS} />;
}

function ViewSwitcherDemo() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  return (
    <Calendar defaultValue={TODAY} view={view} onViewChange={setView} events={SAMPLE_EVENTS} />
  );
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
        <Calendar defaultValue={TODAY} />
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
        <Calendar defaultValue={TODAY} events={SAMPLE_EVENTS} />
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
          defaultValue={TODAY}
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
        <Calendar defaultValue={TODAY} events={MULTI_WEEK_EVENTS} />
      </Example>

      <Example
        title="ru-RU locale"
        description="Russian locale — Monday-start grid, Cyrillic month/weekday labels. UI strings like the Today button and view-switcher labels are the consumer's responsibility; pass them via the labels prop."
        code={`<Calendar
  defaultValue={new Date(2026, 4, 15)}
  events={SAMPLE_EVENTS}
  locale="ru-RU"
  labels={{
    today: 'Сегодня',
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    moreEvents: (n) => \`ещё ${'${n}'} событий\`,
    viewMonth: 'Месяц',
    viewWeek: 'Неделя',
    viewDay: 'День',
  }}
/>`}
      >
        <Calendar
          defaultValue={TODAY}
          events={SAMPLE_EVENTS}
          locale="ru-RU"
          labels={{
            today: 'Сегодня',
            previousMonth: 'Предыдущий месяц',
            nextMonth: 'Следующий месяц',
            moreEvents: (n) => `ещё ${n} событий`,
            viewMonth: 'Месяц',
            viewWeek: 'Неделя',
            viewDay: 'День',
          }}
        />
      </Example>

      <Example
        title="Week view"
        description="7 columns × hour rows. Timed events position by hour; overlapping events split into equal-width lanes side-by-side. All-day and multi-day events render in the band above the hour grid. A horizontal line marks the current time in today's column."
        code={`<Calendar
  defaultValue={new Date()}
  defaultView="week"
  events={SAMPLE_EVENTS}
/>`}
      >
        <Calendar defaultValue={TODAY} defaultView="week" events={SAMPLE_EVENTS} />
      </Example>

      <Example
        title="Day view"
        description="Single-day hour grid for focused planning. Custom hourRange tightens the visible range to business hours."
        code={`<Calendar
  defaultValue={new Date()}
  defaultView="day"
  events={SAMPLE_EVENTS}
  hourRange={[8, 18]}
/>`}
      >
        <Calendar
          defaultValue={TODAY}
          defaultView="day"
          events={SAMPLE_EVENTS}
          hourRange={[8, 18]}
        />
      </Example>

      <Example
        title="View switching (controlled)"
        description="Consumer owns the active view via `view` / `onViewChange`. Useful for URL-syncing the current view."
        code={`function ViewSwitcherDemo() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  return (
    <Calendar
      defaultValue={new Date()}
      view={view}
      onViewChange={setView}
      events={SAMPLE_EVENTS}
    />
  );
}`}
      >
        <ViewSwitcherDemo />
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
