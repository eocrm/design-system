import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { useMonth } from '../../calendar/useMonth';
import { MonthView } from './MonthView';
import type { CalendarEvent } from './types';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

function may2026Grid() {
  const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
    wrapper: wrap(),
  });
  return result.current;
}

describe('MonthView', () => {
  it('renders 4–6 week rows and a 7-column weekday header', () => {
    const grid = may2026Grid();
    render(
      <MonthView grid={grid} events={[]} maxLanesPerWeek={3} cursor={new Date(2026, 4, 15)} />,
      { wrapper: wrap() },
    );
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole('columnheader').length).toBe(7);
  });

  it('renders day cells with day numbers', () => {
    const grid = may2026Grid();
    render(
      <MonthView grid={grid} events={[]} maxLanesPerWeek={3} cursor={new Date(2026, 4, 15)} />,
      { wrapper: wrap() },
    );
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders an event chip when an event is in the grid', () => {
    const grid = may2026Grid();
    const events: CalendarEvent[] = [
      { id: 'a', title: 'Meeting', startsAt: new Date(2026, 4, 15, 9) },
    ];
    render(
      <MonthView grid={grid} events={events} maxLanesPerWeek={3} cursor={new Date(2026, 4, 15)} />,
      { wrapper: wrap() },
    );
    expect(screen.getByTitle('Meeting')).toBeInTheDocument();
  });

  it('fires onEventClick when an event chip is clicked', async () => {
    const grid = may2026Grid();
    const events: CalendarEvent[] = [
      { id: 'a', title: 'Meeting', startsAt: new Date(2026, 4, 15, 9) },
    ];
    const onEventClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MonthView
        grid={grid}
        events={events}
        maxLanesPerWeek={3}
        cursor={new Date(2026, 4, 15)}
        onEventClick={onEventClick}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByTitle('Meeting'));
    expect(onEventClick).toHaveBeenCalledOnce();
    expect(onEventClick).toHaveBeenCalledWith(events[0]);
  });

  it('fires onDayClick when a day cell is clicked', async () => {
    const grid = may2026Grid();
    const onDayClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MonthView
        grid={grid}
        events={[]}
        maxLanesPerWeek={3}
        cursor={new Date(2026, 4, 15)}
        onDayClick={onDayClick}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByText('15'));
    expect(onDayClick).toHaveBeenCalled();
  });

  it('shows "+N more" when events exceed maxLanesPerWeek', () => {
    const grid = may2026Grid();
    const events: CalendarEvent[] = [
      { id: 'a', title: 'A', startsAt: new Date(2026, 4, 15) },
      { id: 'b', title: 'B', startsAt: new Date(2026, 4, 15) },
      { id: 'c', title: 'C', startsAt: new Date(2026, 4, 15) },
      { id: 'd', title: 'D', startsAt: new Date(2026, 4, 15) },
      { id: 'e', title: 'E', startsAt: new Date(2026, 4, 15) },
    ];
    render(
      <MonthView grid={grid} events={events} maxLanesPerWeek={3} cursor={new Date(2026, 4, 15)} />,
      { wrapper: wrap() },
    );
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('PageDown navigates to the next month and fires onChange', () => {
    const grid = may2026Grid();
    const onChange = vi.fn();
    render(
      <MonthView
        grid={grid}
        events={[]}
        maxLanesPerWeek={3}
        cursor={new Date(2026, 4, 15)}
        onChange={onChange}
      />,
      { wrapper: wrap() },
    );
    const cells = screen.getAllByRole('gridcell');
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: 'PageDown' });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('Enter on a focused cell fires onDayClick', () => {
    const grid = may2026Grid();
    const onDayClick = vi.fn();
    render(
      <MonthView
        grid={grid}
        events={[]}
        maxLanesPerWeek={3}
        cursor={new Date(2026, 4, 15)}
        onDayClick={onDayClick}
      />,
      { wrapper: wrap() },
    );
    const cells = screen.getAllByRole('gridcell');
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: 'Enter' });
    expect(onDayClick).toHaveBeenCalledOnce();
  });

  it('uses locale-aware weekday labels (ru-RU has Cyrillic)', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
      wrapper: wrap('ru-RU'),
    });
    render(
      <MonthView
        grid={result.current}
        events={[]}
        maxLanesPerWeek={3}
        cursor={new Date(2026, 4, 15)}
      />,
      { wrapper: wrap('ru-RU') },
    );
    const headers = screen.getAllByRole('columnheader');
    const allText = headers.map((h) => h.textContent ?? '').join(' ');
    expect(allText).toMatch(/[Ѐ-ӿ]/);
  });
});
