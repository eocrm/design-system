import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { AgendaView } from './AgendaView';
import type { CalendarEvent } from './types';
import type { Day } from '../../calendar/types';
import { toDateKey } from '../../calendar/dateMath';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

function makeDay(year: number, monthIndex: number, dayOfMonth: number): Day {
  const date = new Date(year, monthIndex, dayOfMonth);
  return {
    date,
    dayOfMonth: date.getDate(),
    isCurrentMonth: true,
    isToday: false,
    isWeekend: false,
    weekday: 0,
    key: toDateKey(date),
  };
}

// Mon May 18 → Sun May 24, 2026
const WEEK_DAYS: readonly Day[] = [
  makeDay(2026, 4, 18),
  makeDay(2026, 4, 19),
  makeDay(2026, 4, 20),
  makeDay(2026, 4, 21),
  makeDay(2026, 4, 22),
  makeDay(2026, 4, 23),
  makeDay(2026, 4, 24),
];

describe('AgendaView', () => {
  it('renders the empty-state when no events fall in the visible window', () => {
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={[]}
        emptyLabel="No events"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByText('No events')).toBeInTheDocument();
  });

  it('groups events under the day they occur on and hides days with no events', () => {
    const events: CalendarEvent[] = [
      {
        id: 'standup',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9, 0),
        endsAt: new Date(2026, 4, 20, 9, 30),
      },
      {
        id: 'planning',
        title: 'Planning',
        startsAt: new Date(2026, 4, 22, 14, 0),
        endsAt: new Date(2026, 4, 22, 15, 30),
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
      />,
      { wrapper: wrap() },
    );
    // Only two day headers — Wednesday May 20 and Friday May 22.
    const headers = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(headers.some((t) => /Standup/.test(t))).toBe(true);
    expect(headers.some((t) => /Planning/.test(t))).toBe(true);
    expect(screen.getByText(/Wednesday, May 20/)).toBeInTheDocument();
    expect(screen.getByText(/Friday, May 22/)).toBeInTheDocument();
    expect(screen.queryByText(/Monday, May 18/)).not.toBeInTheDocument();
  });

  it('shows the start time in the gutter for single-day timed events', () => {
    const events: CalendarEvent[] = [
      {
        id: 's',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9, 0),
        endsAt: new Date(2026, 4, 20, 9, 30),
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
      />,
      { wrapper: wrap() },
    );
    const button = screen.getByRole('button', { name: /Standup/ });
    expect(button.textContent).toMatch(/9:00\s*(AM|am)/);
    // Range form: "9:00 AM – 9:30 AM"
    expect(button.textContent).toMatch(/9:30/);
  });

  it('shows "All day" for allDay events', () => {
    const events: CalendarEvent[] = [
      {
        id: 'bd',
        title: 'Birthday',
        startsAt: new Date(2026, 4, 20),
        endsAt: new Date(2026, 4, 20),
        allDay: true,
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('multi-day events appear under every day they span', () => {
    const events: CalendarEvent[] = [
      {
        id: 'conf',
        title: 'Conference',
        startsAt: new Date(2026, 4, 19),
        endsAt: new Date(2026, 4, 21),
        allDay: true,
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
      />,
      { wrapper: wrap() },
    );
    const conferenceButtons = screen.getAllByRole('button', { name: /Conference/ });
    expect(conferenceButtons).toHaveLength(3); // Tue, Wed, Thu
  });

  it('sorts all-day events before timed events within a day', () => {
    const events: CalendarEvent[] = [
      {
        id: 'timed',
        title: 'Timed event',
        startsAt: new Date(2026, 4, 20, 9, 0),
        endsAt: new Date(2026, 4, 20, 10, 0),
      },
      {
        id: 'allday',
        title: 'All-day event',
        startsAt: new Date(2026, 4, 20),
        endsAt: new Date(2026, 4, 20),
        allDay: true,
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
      />,
      { wrapper: wrap() },
    );
    const buttons = screen.getAllByRole('button');
    const allDayIdx = buttons.findIndex((b) => /All-day event/.test(b.textContent ?? ''));
    const timedIdx = buttons.findIndex((b) => /Timed event/.test(b.textContent ?? ''));
    expect(allDayIdx).toBeLessThan(timedIdx);
  });

  it('fires onEventClick when a row is clicked', async () => {
    const onEventClick = vi.fn<(event: CalendarEvent) => void>();
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9, 0),
        endsAt: new Date(2026, 4, 20, 9, 30),
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
        onEventClick={onEventClick}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('button', { name: /Standup/ }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].id).toBe('a');
  });

  it('renderEvent receives view-aware context for agenda rows', () => {
    const calls: Array<{ id: string; view: string; asAllDay: boolean; duration: string }> = [];
    const events: CalendarEvent[] = [
      {
        id: 'timed',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9, 0),
        endsAt: new Date(2026, 4, 20, 9, 30),
      },
      {
        id: 'all',
        title: 'Birthday',
        startsAt: new Date(2026, 4, 20),
        endsAt: new Date(2026, 4, 20),
        allDay: true,
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
        renderEvent={(event, ctx) => {
          calls.push({
            id: event.id,
            view: ctx.view,
            asAllDay: ctx.asAllDay,
            duration: ctx.duration,
          });
          return <span>{event.title}</span>;
        }}
      />,
      { wrapper: wrap() },
    );
    const timed = calls.find((c) => c.id === 'timed');
    const all = calls.find((c) => c.id === 'all');
    expect(timed).toMatchObject({ view: 'agenda', asAllDay: false, duration: '30m' });
    expect(all).toMatchObject({ view: 'agenda', asAllDay: true });
  });

  it('uses locale-aware day headers (ru-RU has Cyrillic)', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Стендап',
        startsAt: new Date(2026, 4, 20, 9, 0),
        endsAt: new Date(2026, 4, 20, 9, 30),
      },
    ];
    render(
      <AgendaView
        days={WEEK_DAYS}
        rangeLabel="May 18 – 24, 2026"
        events={events}
        emptyLabel="No events"
        locale="ru-RU"
      />,
      { wrapper: wrap('ru-RU') },
    );
    const headers = document.body.textContent ?? '';
    expect(headers).toMatch(/[Ѐ-ӿ]/);
  });
});
