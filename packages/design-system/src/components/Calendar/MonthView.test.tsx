import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: /Meeting/ })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /Meeting/ }));
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

describe('dayAction (DS-88)', () => {
  const cursor = new Date(2026, 4, 15);
  const setup = (extra: { onDayClick?: () => void } = {}) => {
    const onActivate = vi.fn();
    const dayAction = {
      label: (d: Date) => `Add on ${d.toDateString()}`,
      onActivate,
    };
    render(
      <MonthView
        grid={may2026Grid()}
        events={[]}
        maxLanesPerWeek={3}
        cursor={cursor}
        dayAction={dayAction}
        {...extra}
      />,
      { wrapper: wrap() },
    );
    return { onActivate };
  };

  it('hovering anywhere in a day column (not just the number row) reveals its action', () => {
    setup();
    const cell = screen.getAllByRole('gridcell')[10];
    const week = cell.parentElement!.parentElement as HTMLElement; // .dayRow → .week
    week.getBoundingClientRect = () => ({ left: 0, width: 700, top: 0, height: 100 }) as DOMRect;
    const col = [...cell.parentElement!.children].indexOf(cell);
    fireEvent.pointerMove(week, { pointerType: 'mouse', clientX: col * 100 + 50, clientY: 90 });
    expect(cell.className).toMatch(/hovered/);
    fireEvent.pointerLeave(week);
    expect(cell.className).not.toMatch(/hovered/);
  });

  it('renders one action per day labelled by label(date)', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /^Add on / }).length).toBe(
      screen.getAllByRole('gridcell').length,
    );
  });

  it('clicking the action calls onActivate(date, { view: "month" }) and not onDayClick', async () => {
    const onDayClick = vi.fn();
    const { onActivate } = setup({ onDayClick });
    await userEvent.click(screen.getByRole('button', { name: 'Add on ' + cursor.toDateString() }));
    expect(onActivate).toHaveBeenCalledWith(cursor, { view: 'month' });
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('Enter on a focused action calls onActivate once and not onDayClick', async () => {
    const onDayClick = vi.fn();
    const { onActivate } = setup({ onDayClick });
    screen.getByRole('button', { name: 'Add on ' + cursor.toDateString() }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('Space on a focused action calls onActivate once and not onDayClick', async () => {
    const onDayClick = vi.fn();
    const { onActivate } = setup({ onDayClick });
    screen.getByRole('button', { name: 'Add on ' + cursor.toDateString() }).focus();
    await userEvent.keyboard(' ');
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it("only the roving cell's action is tabbable", async () => {
    setup();
    const tabbable = () =>
      screen.getAllByRole('button', { name: /^Add on / }).filter((b) => b.tabIndex === 0);
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0].closest('[role="gridcell"]')).toHaveAttribute('tabindex', '0');
    const cell = tabbable()[0].closest('[role="gridcell"]') as HTMLElement;
    cell.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(tabbable()).toHaveLength(1));
    expect(tabbable()[0].closest('[role="gridcell"]')).not.toBe(cell);
    expect(tabbable()[0].getAttribute('aria-label')).toBe(
      'Add on ' + new Date(2026, 4, 16).toDateString(),
    );
  });

  it('without dayAction no day buttons render', () => {
    render(<MonthView grid={may2026Grid()} events={[]} maxLanesPerWeek={3} cursor={cursor} />, {
      wrapper: wrap(),
    });
    for (const cell of screen.getAllByRole('gridcell')) {
      expect(cell.querySelector('button')).toBeNull();
    }
  });
});
