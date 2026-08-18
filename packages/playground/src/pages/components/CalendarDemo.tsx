import { useState } from 'react';
import {
  Calendar,
  I18nProvider,
  Stack,
  type CalendarBackgroundInterval,
  type CalendarEvent,
  type CalendarEventMove,
  type CalendarResource,
  type CalendarView,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

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
  // Overlapping events on the same day — demonstrate the cascade layout in
  // week / day views (each lane offset right by a small step; later lanes
  // overlay earlier ones; hover lifts a block to full width on top).
  {
    id: 'overlap-a',
    title: 'Design review',
    startsAt: fromToday(1, 10, 0),
    endsAt: fromToday(1, 11, 30),
    tone: 'accent',
  },
  {
    id: 'overlap-b',
    title: 'Sync: Engineering',
    startsAt: fromToday(1, 10, 30),
    endsAt: fromToday(1, 12, 0),
    tone: 'success',
  },
  {
    id: 'overlap-c',
    title: 'Sales handoff',
    startsAt: fromToday(1, 11, 0),
    endsAt: fromToday(1, 12, 30),
    tone: 'warning',
  },
  // Two simultaneously-starting events same day → cascade with the second
  // event offset right and layered on top of the first.
  {
    id: 'concurrent-a',
    title: 'Interview: Sarah',
    startsAt: fromToday(3, 15, 0),
    endsAt: fromToday(3, 16, 0),
    tone: 'accent',
  },
  {
    id: 'concurrent-b',
    title: 'Vendor demo',
    startsAt: fromToday(3, 15, 0),
    endsAt: fromToday(3, 16, 0),
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

// ── Booking-screen data (resource columns + availability + drag) ────────────

const RESOURCES: CalendarResource[] = [
  { id: 'ana', label: 'Ana' },
  { id: 'ben', label: 'Ben' },
  { id: 'chair-3', label: 'Chair 3' },
];

/** Opening hours per column, as [startHour, endHour). */
const SHIFTS: Record<string, [number, number]> = {
  ana: [9, 17],
  ben: [8, 14],
  'chair-3': [10, 18],
};
/** Ana takes lunch — the case a single flat `hourRange` cannot express. */
const LUNCH: [number, number] = [12, 13];

const INITIAL_BOOKINGS: CalendarEvent[] = [
  {
    id: 'b1',
    title: 'Cut & finish',
    startsAt: fromToday(0, 9, 0),
    endsAt: fromToday(0, 10, 0),
    resourceId: 'ana',
    tone: 'accent',
  },
  {
    id: 'b2',
    title: 'Colour',
    startsAt: fromToday(0, 10, 30),
    endsAt: fromToday(0, 12, 0),
    resourceId: 'ana',
    tone: 'accent',
  },
  {
    id: 'b3',
    title: 'Consultation',
    startsAt: fromToday(0, 9, 30),
    endsAt: fromToday(0, 10, 0),
    resourceId: 'ben',
    tone: 'success',
  },
  {
    id: 'b4',
    title: 'Deep clean',
    startsAt: fromToday(0, 11, 0),
    endsAt: fromToday(0, 12, 30),
    resourceId: 'chair-3',
    tone: 'neutral',
  },
  {
    // No resourceId — lands in the trailing "Unassigned" column.
    id: 'b5',
    title: 'Walk-in, unassigned',
    startsAt: fromToday(0, 13, 0),
    endsAt: fromToday(0, 14, 0),
    tone: 'warning',
  },
];

/**
 * Day offsets covering the Sun–Sat week the week view actually renders.
 * Anchoring on today ± 3 would be off by up to three days, leaving real
 * columns unshaded — the very bug the per-day interval note warns about.
 */
function weekOffsets(): number[] {
  const sundayOffset = -TODAY.getDay();
  return [0, 1, 2, 3, 4, 5, 6].map((i) => sundayOffset + i);
}

/**
 * Opening hours for the WEEK view. Intervals are clipped to each column's own
 * date, so one band per day — a single 08:00-09:00 interval would shade
 * exactly one column, not the week.
 */
const WEEK_AVAILABILITY: CalendarBackgroundInterval[] = weekOffsets().flatMap((offset) => [
  { startsAt: fromToday(offset, 8), endsAt: fromToday(offset, 9), tone: 'unavailable' as const },
  { startsAt: fromToday(offset, 9), endsAt: fromToday(offset, 17), tone: 'available' as const },
  {
    startsAt: fromToday(offset, 17),
    endsAt: fromToday(offset, 18),
    tone: 'unavailable' as const,
  },
]);

/** Shade closed time, tint bookable time — per column, including the lunch gap. */
const AVAILABILITY: CalendarBackgroundInterval[] = RESOURCES.flatMap(({ id }) => {
  const [open, close] = SHIFTS[id];
  const bands: CalendarBackgroundInterval[] = [
    { startsAt: fromToday(0, 8), endsAt: fromToday(0, open), resourceId: id, tone: 'unavailable' },
    {
      startsAt: fromToday(0, close),
      endsAt: fromToday(0, 18),
      resourceId: id,
      tone: 'unavailable',
    },
    {
      startsAt: fromToday(0, open),
      endsAt: fromToday(0, close),
      resourceId: id,
      tone: 'available',
    },
  ];
  if (id === 'ana') {
    bands.push({
      startsAt: fromToday(0, LUNCH[0]),
      endsAt: fromToday(0, LUNCH[1]),
      resourceId: id,
      tone: 'unavailable',
    });
  }
  return bands;
});

/** The synchronous half of the drop rules — refuses the drop mid-drag. */
function withinShift(next: CalendarEventMove): boolean {
  const shift: [number, number] = next.resourceId ? (SHIFTS[next.resourceId] ?? [8, 18]) : [8, 18];
  const startH = next.startsAt.getHours() + next.startsAt.getMinutes() / 60;
  const endH = next.endsAt.getHours() + next.endsAt.getMinutes() / 60;
  if (startH < shift[0] || endH > shift[1]) return false;
  if (next.resourceId === 'ana' && startH < LUNCH[1] && endH > LUNCH[0]) return false;
  return true;
}

function BookingCalendarDemo() {
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [note, setNote] = useState(
    'Drag a booking, or focus one and press Alt with the arrow keys.',
  );

  const apply = (id: string, startsAt: Date, endsAt: Date, resourceId?: string) =>
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, startsAt, endsAt, resourceId } : b)),
    );

  return (
    <Stack gap="sm">
      <Calendar
        defaultValue={TODAY}
        defaultView="day"
        events={bookings}
        resources={RESOURCES}
        backgroundIntervals={AVAILABILITY}
        hourRange={[8, 18]}
        dragSnapMinutes={15}
        canDropEvent={(_event, next) => withinShift(next)}
        onEventMove={(event, next) => {
          apply(event.id, next.startsAt, next.endsAt, next.resourceId);
          setNote(`Moved "${event.title}" to ${next.startsAt.toLocaleTimeString()}.`);
        }}
        onEventResize={(event, next) => {
          apply(event.id, next.startsAt, next.endsAt, event.resourceId);
          setNote(`"${event.title}" now ends at ${next.endsAt.toLocaleTimeString()}.`);
        }}
      />
      {/* Plain text: the library already exposes a live region for the drag,
          and a second one here would duplicate every announcement. */}
      <small>{note}</small>
    </Stack>
  );
}

function ControlledCalendarDemo() {
  const [cursor, setCursor] = useState<Date>(TODAY);
  return <Calendar value={cursor} onChange={setCursor} events={SAMPLE_EVENTS} />;
}

function ViewSwitcherDemo() {
  const [view, setView] = useState<CalendarView>('week');
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
      files={getComponentFiles('Calendar')}
    >
      <Example
        title="Default (empty)"
        description="Bare shell with prev/next/today navigation. No events yet."
        code={`import { Calendar } from '@eocrm/design-system';

export function Demo() {
  return <Calendar defaultValue={new Date(2026, 4, 15)} />;
}`}
      >
        <Calendar defaultValue={TODAY} />
      </Example>

      <Example
        title="With events"
        description="Sample CRM-style events showing all 5 tones, an all-day vacation band, and timed meetings."
        code={`import { Calendar } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function Demo() {
  return <Calendar defaultValue={new Date(2026, 4, 15)} events={SAMPLE_EVENTS} />;
}`}
      >
        <Calendar defaultValue={TODAY} events={SAMPLE_EVENTS} />
      </Example>

      <Example
        title="Overflow (+N more)"
        description="Days with more events than maxLanesPerWeek (default 3) collapse to a +N more chip. Click fires onDayClick."
        code={`import { Calendar } from '@eocrm/design-system';

const OVERFLOW_EVENTS = [
  { id: 'a', title: 'Standup', startsAt: new Date(2026, 4, 15, 9, 0), tone: 'accent' },
  { id: 'b', title: '1:1 with Sam', startsAt: new Date(2026, 4, 15, 10, 0), tone: 'neutral' },
  { id: 'c', title: 'Demo prep', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'success' },
  { id: 'd', title: 'Lunch', startsAt: new Date(2026, 4, 15, 12, 0), tone: 'neutral' },
  { id: 'e', title: 'Customer call', startsAt: new Date(2026, 4, 15, 14, 0), tone: 'warning' },
];

export function Demo() {
  return (
    <Calendar
      defaultValue={new Date(2026, 4, 15)}
      events={OVERFLOW_EVENTS}
      onDayClick={(d) => alert('Day clicked: ' + d.toDateString())}
    />
  );
}`}
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
        code={`import { Calendar } from '@eocrm/design-system';

const MULTI_WEEK_EVENTS = [
  { id: 'm1', title: 'Conference', startsAt: new Date(2026, 4, 6), endsAt: new Date(2026, 4, 22), tone: 'success', allDay: true },
];

export function Demo() {
  return <Calendar defaultValue={new Date(2026, 4, 15)} events={MULTI_WEEK_EVENTS} />;
}`}
      >
        <Calendar defaultValue={TODAY} events={MULTI_WEEK_EVENTS} />
      </Example>

      <Example
        title="ru-RU locale"
        description="Russian locale — Monday-start grid, Cyrillic month/weekday labels. UI strings (Today button, prev/next aria-labels, view-switcher) come from the i18n provider — wrap the Calendar in <I18nProvider locale='ru'> to use the built-in Russian translations."
        code={`import { Calendar, I18nProvider } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function Demo() {
  return (
    <I18nProvider locale="ru">
      <Calendar
        defaultValue={new Date(2026, 4, 15)}
        events={SAMPLE_EVENTS}
        locale="ru-RU"
      />
    </I18nProvider>
  );
}`}
      >
        <I18nProvider locale="ru">
          <Calendar defaultValue={TODAY} events={SAMPLE_EVENTS} locale="ru-RU" />
        </I18nProvider>
      </Example>

      <Example
        title="Week view"
        description="7 columns × hour rows. Timed events position by hour; overlapping events cascade — each lane offset right by a small step, later lanes overlay earlier ones, and hover lifts a block to full width on top. All-day and multi-day events render in the band above the hour grid. A horizontal line marks the current time in today's column."
        code={`import { Calendar } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function Demo() {
  return (
    <Calendar
      defaultValue={new Date(2026, 4, 15)}
      defaultView="week"
      events={SAMPLE_EVENTS}
    />
  );
}`}
      >
        <Calendar defaultValue={TODAY} defaultView="week" events={SAMPLE_EVENTS} />
      </Example>

      <Example
        title="Day view"
        description="Single-day hour grid for focused planning. Custom hourRange tightens the visible range to business hours."
        code={`import { Calendar } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function Demo() {
  return (
    <Calendar
      defaultValue={new Date(2026, 4, 15)}
      defaultView="day"
      events={SAMPLE_EVENTS}
      hourRange={[8, 18]}
    />
  );
}`}
      >
        <Calendar
          defaultValue={TODAY}
          defaultView="day"
          events={SAMPLE_EVENTS}
          hourRange={[8, 18]}
        />
      </Example>

      <Example
        title="Booking screen — resource columns, availability, drag"
        description="The three pieces a scheduling screen needs, together. resources splits the day into one column per bookable subject (all sharing one time axis and one scroll). backgroundIntervals shades closed time and tints bookable time — note Ana's lunch gap, which a flat hourRange cannot express. onEventMove / onEventResize make blocks draggable; canDropEvent refuses a drop mid-drag when it would fall outside that column's shift. Keyboard: focus a block and press Alt with the arrow keys (add Shift to change the end time). The walk-in with no resourceId lands in the trailing Unassigned column."
        code={`import { useState } from 'react';
import { Calendar, Stack } from '@eocrm/design-system';

const RESOURCES = [
  { id: 'ana', label: 'Ana' },
  { id: 'ben', label: 'Ben' },
  { id: 'chair-3', label: 'Chair 3' },
];

export function BookingCalendarDemo() {
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);

  return (
    <Stack gap="sm">
      <Calendar
        defaultView="day"
        events={bookings}
        resources={RESOURCES}
        backgroundIntervals={AVAILABILITY}
        hourRange={[8, 18]}
        dragSnapMinutes={15}
        // Refused mid-drag — the block renders as an invalid drop and the
        // proposal never reaches onEventMove.
        canDropEvent={(_event, next) => withinShift(next)}
        // A drop is PROPOSED, never applied: commit it to your own state,
        // or return false (or a rejecting promise) to snap the block back.
        onEventMove={(event, next) =>
          setBookings((prev) =>
            prev.map((b) =>
              b.id === event.id
                ? { ...b, startsAt: next.startsAt, endsAt: next.endsAt, resourceId: next.resourceId }
                : b,
            ),
          )
        }
        onEventResize={(event, next) =>
          setBookings((prev) =>
            prev.map((b) => (b.id === event.id ? { ...b, endsAt: next.endsAt } : b)),
          )
        }
      />
    </Stack>
  );
}`}
      >
        <BookingCalendarDemo />
      </Example>

      <Example
        title="Availability underlay in week view"
        description="backgroundIntervals works in week view too — resourceId is simply ignored there. Intervals are still clipped to each column's own date, though, so shading opening hours across a week means one interval per day (see WEEK_AVAILABILITY below), not one that spans the columns. Bands sit beneath the events, take no part in the collision cascade, and let clicks through to onDayClick."
        code={`import { Calendar } from '@eocrm/design-system';

// One interval per day: intervals are clipped to each column's date, so a
// single 08:00-09:00 band would shade exactly one column, not the week.
// Offsets are taken from the rendered week's Sunday, not from today, or the
// bands land up to three days off the columns they are meant to shade.
const WEEK_AVAILABILITY = weekOffsets().flatMap((offset) => [
  { startsAt: at(offset, 8), endsAt: at(offset, 9), tone: 'unavailable' },
  { startsAt: at(offset, 9), endsAt: at(offset, 17), tone: 'available' },
  { startsAt: at(offset, 17), endsAt: at(offset, 18), tone: 'unavailable' },
]);

export function Demo() {
  return (
    <Calendar
      defaultView="week"
      events={SAMPLE_EVENTS}
      hourRange={[8, 18]}
      backgroundIntervals={WEEK_AVAILABILITY}
    />
  );
}`}
      >
        <Calendar
          defaultValue={TODAY}
          defaultView="week"
          events={SAMPLE_EVENTS}
          hourRange={[8, 18]}
          backgroundIntervals={WEEK_AVAILABILITY}
        />
      </Example>

      <Example
        title="Agenda view"
        description="Chronological list of the cursor's current week, grouped by day. Days without events are hidden so the list stays scannable. Multi-day events appear under every day they span. Prev/next steps a week at a time."
        code={`import { Calendar } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function Demo() {
  return (
    <Calendar
      defaultValue={new Date(2026, 4, 15)}
      defaultView="agenda"
      events={SAMPLE_EVENTS}
    />
  );
}`}
      >
        <Calendar defaultValue={TODAY} defaultView="agenda" events={SAMPLE_EVENTS} />
      </Example>

      <Example
        title="View switching (controlled)"
        description="Consumer owns the active view via `view` / `onViewChange`. Useful for URL-syncing the current view."
        code={`import { useState } from 'react';
import { Calendar, type CalendarView } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function ViewSwitcherDemo() {
  const [view, setView] = useState<CalendarView>('week');
  return (
    <Calendar
      defaultValue={new Date(2026, 4, 15)}
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
        code={`import { useState } from 'react';
import { Calendar } from '@eocrm/design-system';

const SAMPLE_EVENTS = [
  { id: '1', title: 'Team standup', startsAt: new Date(2026, 4, 12, 9, 30), tone: 'accent' },
  { id: '2', title: 'Quarterly review', startsAt: new Date(2026, 4, 13, 14, 0), endsAt: new Date(2026, 4, 13, 17, 0), tone: 'success' },
  { id: '3', title: 'Customer call: Acme', startsAt: new Date(2026, 4, 15, 11, 0), tone: 'accent' },
  { id: '4', title: 'Vacation', startsAt: new Date(2026, 4, 18), endsAt: new Date(2026, 4, 25), tone: 'warning', allDay: true },
  { id: '5', title: 'Renewal: Beta Co.', startsAt: new Date(2026, 4, 27, 9, 0), tone: 'danger' },
];

export function ControlledCalendarDemo() {
  const [cursor, setCursor] = useState(new Date(2026, 4, 15));
  return <Calendar value={cursor} onChange={setCursor} events={SAMPLE_EVENTS} />;
}`}
      >
        <ControlledCalendarDemo />
      </Example>
    </DemoLayout>
  );
}
