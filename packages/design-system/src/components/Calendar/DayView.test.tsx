import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import hourGridStyles from './HourGrid.module.scss';
import { DayView } from './DayView';
import type { CalendarEvent } from './types';

/** Raw SCSS, so a CSS-only contract (pointer-events) can still be asserted. */
const hourGridScss = readFileSync(resolve(__dirname, './HourGrid.module.scss'), 'utf8');

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('DayView', () => {
  const cursor = new Date(2026, 4, 20);

  it('renders 1 column header', () => {
    render(<DayView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getAllByRole('columnheader').length).toBe(1);
  });

  it('places a timed event in the single column', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(<DayView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('button', { name: /Standup/ })).toBeInTheDocument();
  });

  it('fires onEventClick', async () => {
    const onEventClick = vi.fn();
    const user = userEvent.setup();
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Call',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(
      <DayView
        cursor={cursor}
        events={events}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onEventClick={onEventClick}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: /Call/ }));
    expect(onEventClick).toHaveBeenCalled();
  });
});

describe('DayView — resource columns (issue #471)', () => {
  const cursor = new Date(2026, 4, 20);
  const RESOURCES = [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
  ];

  function booking(id: string, hour: number, resourceId?: string): CalendarEvent {
    return {
      id,
      title: id,
      startsAt: new Date(2026, 4, 20, hour),
      endsAt: new Date(2026, 4, 20, hour + 1),
      resourceId,
    };
  }

  it('renders one column header per resource', () => {
    render(
      <DayView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        resources={RESOURCES}
      />,
      { wrapper: wrap() },
    );
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Ana', 'Ben']);
  });

  it('falls back to the single day column when resources is empty', () => {
    render(
      <DayView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} resources={[]} />,
      { wrapper: wrap() },
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(1);
  });

  it('does NOT render an unassigned column when every event maps to a resource', () => {
    render(
      <DayView
        cursor={cursor}
        events={[booking('a', 9, 'ana')]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        resources={RESOURCES}
      />,
      { wrapper: wrap() },
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  it('appends an unassigned column when an event has no matching resource', () => {
    render(
      <DayView
        cursor={cursor}
        events={[booking('a', 9, 'ana'), booking('b', 9)]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        resources={RESOURCES}
      />,
      { wrapper: wrap() },
    );
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[2]).toHaveTextContent('Unassigned');
  });

  it('renders each booking in its own resource column', () => {
    render(
      <DayView
        cursor={cursor}
        events={[booking('ana-9', 9, 'ana'), booking('ben-9', 9, 'ben')]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        resources={RESOURCES}
      />,
      { wrapper: wrap() },
    );
    const anaBlock = screen.getByRole('button', { name: /ana-9/ });
    const benBlock = screen.getByRole('button', { name: /ben-9/ });
    expect(anaBlock.parentElement).not.toBe(benBlock.parentElement);
  });

  it('renders same-time bookings in different columns at full width (no cascade offset)', () => {
    render(
      <DayView
        cursor={cursor}
        events={[booking('ana-9', 9, 'ana'), booking('ben-9', 9, 'ben')]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        resources={RESOURCES}
      />,
      { wrapper: wrap() },
    );
    for (const name of [/ana-9/, /ben-9/]) {
      const el = screen.getByRole('button', { name });
      expect(el.style.getPropertyValue('--cal-block-left')).toBe('0%');
    }
  });
});

describe('DayView — availability underlay (issue #473)', () => {
  const cursor = new Date(2026, 4, 20);

  /** The underlay bands are the only absolutely-positioned divs with a height. */
  function bandsIn(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll('div')).filter(
      (el) => el.style.height !== '' && el.style.top !== '',
    );
  }

  it('renders no bands without backgroundIntervals', () => {
    const { container } = render(
      <DayView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} />,
      { wrapper: wrap() },
    );
    expect(bandsIn(container)).toHaveLength(0);
  });

  it('paints a band positioned from the hour-range start', () => {
    const { container } = render(
      <DayView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        backgroundIntervals={[
          { startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 12) },
        ]}
      />,
      { wrapper: wrap() },
    );
    const bands = bandsIn(container);
    expect(bands).toHaveLength(1);
    expect(bands[0].style.top).toBe('96px'); // 09:00, 2h past 07:00
    expect(bands[0].style.height).toBe('144px'); // 3h
  });

  it('leaves the band out of the accessibility tree', () => {
    const { container } = render(
      <DayView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        backgroundIntervals={[
          { startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 12) },
        ]}
      />,
      { wrapper: wrap() },
    );
    expect(bandsIn(container)[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('paints only the named resource column', () => {
    const { container } = render(
      <DayView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        resources={[
          { id: 'ana', label: 'Ana' },
          { id: 'ben', label: 'Ben' },
        ]}
        backgroundIntervals={[
          {
            startsAt: new Date(2026, 4, 20, 9),
            endsAt: new Date(2026, 4, 20, 12),
            resourceId: 'ben',
          },
        ]}
      />,
      { wrapper: wrap() },
    );
    const bands = bandsIn(container);
    expect(bands).toHaveLength(1);
    // Length alone would pass if the band landed in Ana's column instead —
    // assert it is inside the SECOND column body.
    const columns = Array.from(container.querySelectorAll(`.${hourGridStyles.dayColumn}`));
    expect(columns).toHaveLength(2);
    expect(columns[1]).toContainElement(bands[0]);
    expect(columns[0]).not.toContainElement(bands[0]);
  });

  it('declares the band non-interactive so clicks reach the column beneath', () => {
    // jsdom does not implement `pointer-events`, so a click test here would
    // pass whether or not the rule exists. Assert the contract that makes the
    // click-through work instead: the band carries the class that sets
    // `pointer-events: none`, and it is not the column's click target.
    const { container } = render(
      <DayView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onDayClick={() => {}}
        backgroundIntervals={[
          { startsAt: new Date(2026, 4, 20, 7), endsAt: new Date(2026, 4, 20, 19) },
        ]}
      />,
      { wrapper: wrap() },
    );
    const band = bandsIn(container)[0];
    expect(band.className).toContain(hourGridStyles.backgroundBand);
    expect(hourGridScss).toMatch(/\.backgroundBand[^}]*pointer-events:\s*none/s);
  });

  it('fires onDayClick when the column itself is clicked', async () => {
    const onDayClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <DayView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onDayClick={onDayClick}
        backgroundIntervals={[
          { startsAt: new Date(2026, 4, 20, 7), endsAt: new Date(2026, 4, 20, 19) },
        ]}
      />,
      { wrapper: wrap() },
    );
    await user.click(container.querySelector(`.${hourGridStyles.dayColumn}`) as HTMLElement);
    expect(onDayClick).toHaveBeenCalledWith(cursor);
  });
});
