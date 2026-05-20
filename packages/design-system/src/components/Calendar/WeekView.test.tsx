import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { WeekView } from './WeekView';
import type { CalendarEvent } from './types';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('WeekView', () => {
  const cursor = new Date(2026, 4, 20); // Wed May 20

  it('renders 7 column headers', () => {
    render(<WeekView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getAllByRole('columnheader').length).toBe(7);
  });

  it('renders 12 hour labels for the default 7-19 range', () => {
    const { container } = render(
      <WeekView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} />,
      { wrapper: wrap() },
    );
    expect(container.querySelectorAll('[class*="hourLabel"]').length).toBe(12);
  });

  it('renders a timed event block', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(<WeekView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('button', { name: /Standup/ })).toBeInTheDocument();
  });

  it('fires onEventClick when a timed event is clicked', async () => {
    const onEventClick = vi.fn();
    const user = userEvent.setup();
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(
      <WeekView
        cursor={cursor}
        events={events}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onEventClick={onEventClick}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: /Standup/ }));
    expect(onEventClick).toHaveBeenCalledWith(events[0]);
  });

  it('renders an allDay event in the AllDayBand', () => {
    const events: CalendarEvent[] = [
      {
        id: 'conf',
        title: 'Conference',
        startsAt: new Date(2026, 4, 18),
        endsAt: new Date(2026, 4, 22),
        allDay: true,
      },
    ];
    render(<WeekView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('button', { name: /Conference/ })).toBeInTheDocument();
  });

  it('respects custom hourRange', () => {
    const { container } = render(
      <WeekView cursor={cursor} events={[]} hourRange={[9, 17]} hourRowHeight={48} />,
      { wrapper: wrap() },
    );
    expect(container.querySelectorAll('[class*="hourLabel"]').length).toBe(8);
  });

  it('renders overlapping events as a Google-style cascade (full width, small lane offset)', () => {
    // Cascade: each lane shifts right by LANE_OFFSET_PERCENT (10%); every
    // block still extends to the column's right edge. Later lanes overlay
    // earlier ones via z-index, so the second event covers the first's
    // right portion while leaving the predecessor's left edge visible.
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10, 30),
      },
      {
        id: 'b',
        title: '1:1',
        startsAt: new Date(2026, 4, 20, 10),
        endsAt: new Date(2026, 4, 20, 11),
      },
    ];
    render(<WeekView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    const a = screen.getByRole('button', { name: /Standup/ });
    const b = screen.getByRole('button', { name: /1:1/ });
    expect(a.style.getPropertyValue('--cal-block-left')).toBe('0%');
    expect(a.style.getPropertyValue('--cal-block-width')).toBe('100%');
    expect(a.style.getPropertyValue('--cal-block-z')).toBe('1');
    expect(b.style.getPropertyValue('--cal-block-left')).toBe('10%');
    expect(b.style.getPropertyValue('--cal-block-width')).toBe('90%');
    expect(b.style.getPropertyValue('--cal-block-z')).toBe('2');
  });

  it('fires onDayClick when empty hour-grid space is clicked', async () => {
    const onDayClick = vi.fn<(d: Date) => void>();
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    const { container } = render(
      <WeekView
        cursor={cursor}
        events={events}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onDayClick={onDayClick}
      />,
      { wrapper: wrap() },
    );
    // Click the empty hour-grid column for Wed May 20 (column index 3 when
    // week starts on Sunday in en-US).
    const columns = container.querySelectorAll<HTMLDivElement>('[class*="dayColumn"]');
    await userEvent.click(columns[3]);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick.mock.calls[0][0].getDate()).toBe(20);
  });

  it('clicking a timed event does NOT also fire onDayClick (stopPropagation)', async () => {
    const onDayClick = vi.fn();
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(
      <WeekView
        cursor={cursor}
        events={events}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onDayClick={onDayClick}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('button', { name: /Standup/ }));
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('renderEvent receives view-aware context for timed and all-day events', () => {
    const calls: Array<{ id: string; view: string; asAllDay: boolean; duration: string }> = [];
    const events: CalendarEvent[] = [
      {
        id: 'timed',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 9, 30),
      },
      {
        id: 'all',
        title: 'Conference',
        startsAt: new Date(2026, 4, 20),
        endsAt: new Date(2026, 4, 21),
        allDay: true,
      },
    ];
    render(
      <WeekView
        cursor={cursor}
        events={events}
        hourRange={[7, 19]}
        hourRowHeight={48}
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
    expect(timed).toMatchObject({ view: 'week', asAllDay: false, duration: '30m' });
    expect(all).toMatchObject({ view: 'week', asAllDay: true });
  });

  it('renders the now-line only when the current time falls inside hourRange and inside today’s column', () => {
    // Set "now" to noon on cursor day (Wed May 20) — inside the 7-19 range.
    const insideNow = new Date(2026, 4, 20, 12, 0);
    const { container, rerender } = render(
      <WeekView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        now={insideNow}
      />,
      { wrapper: wrap() },
    );
    const nowLines = container.querySelectorAll('[class*="nowLine"]');
    expect(nowLines).toHaveLength(1);
    // Sits in today's column — the one with the todayColumn class on its parent.
    const todayColumn = nowLines[0].parentElement!;
    expect(todayColumn.className).toMatch(/dayColumn/);

    // Re-render with `now` BEFORE the hourRange start — no line.
    rerender(
      <WeekView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        now={new Date(2026, 4, 20, 5, 0)}
      />,
    );
    expect(container.querySelectorAll('[class*="nowLine"]')).toHaveLength(0);

    // Re-render with `now` AT the hourRange end (exclusive upper bound) — no line.
    rerender(
      <WeekView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        now={new Date(2026, 4, 20, 19, 0)}
      />,
    );
    expect(container.querySelectorAll('[class*="nowLine"]')).toHaveLength(0);
  });

  it('uses locale-aware column headers (ru-RU has Cyrillic)', () => {
    render(
      <WeekView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        locale="ru-RU"
      />,
      { wrapper: wrap('ru-RU') },
    );
    const headers = screen.getAllByRole('columnheader');
    const text = headers.map((h) => h.textContent ?? '').join(' ');
    expect(text).toMatch(/[Ѐ-ӿ]/);
  });
});
