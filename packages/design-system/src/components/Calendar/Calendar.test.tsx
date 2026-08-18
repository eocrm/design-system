import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { Calendar } from './Calendar';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('Calendar', () => {
  it('renders the title with the month label', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/May/);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/2026/);
  });

  it('renders prev/next/today buttons', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('Prev fires onChange with -1 month', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Calendar defaultValue={new Date(2026, 4, 15)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByLabelText('Previous month'));
    expect(onChange).toHaveBeenCalledOnce();
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(3); // April
  });

  it('Next fires onChange with +1 month', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Calendar defaultValue={new Date(2026, 4, 15)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByLabelText('Next month'));
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(5); // June
  });

  it('Today fires onChange with today', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Calendar defaultValue={new Date(2026, 4, 15)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('Controlled mode — title updates when `value` changes', () => {
    const { rerender } = render(<Calendar value={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/May/);
    rerender(<Calendar value={new Date(2026, 5, 15)} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/June/);
  });

  it('locale override wins over context (ru-RU shows Cyrillic title)', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 15)} locale="ru-RU" />, {
      wrapper: wrap('en-US'),
    });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/[Ѐ-ӿ]/);
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Calendar ref={ref} defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className with internal classes', () => {
    render(<Calendar className="external" defaultValue={new Date(2026, 4, 15)} />, {
      wrapper: wrap(),
    });
    const heading = screen.getByRole('heading', { level: 2 });
    const root = heading.closest('div');
    expect(root?.className).toMatch(/external/);
  });

  it('restores focused cell after month navigation (some gridcell remains tab-reachable)', async () => {
    const user = userEvent.setup();
    render(<Calendar defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    // Click "Next month"
    await user.click(screen.getByLabelText('Next month'));
    // After navigation, exactly one gridcell must have tabIndex="0" (roving-tab-index focus target)
    const cells = screen.getAllByRole('gridcell');
    const focusable = cells.filter((c) => c.getAttribute('tabindex') === '0');
    expect(focusable.length).toBe(1);
  });

  it('switches to WeekView when defaultView="week"', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 20)} defaultView="week" />, {
      wrapper: wrap(),
    });
    const hourLabels = document.querySelectorAll('[class*="hourLabel"]');
    expect(hourLabels.length).toBeGreaterThan(0);
  });

  it('switches to DayView when defaultView="day"', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 20)} defaultView="day" />, {
      wrapper: wrap(),
    });
    expect(document.querySelectorAll('[role="columnheader"]').length).toBe(1);
  });

  it('controlled view: clicking Week tab fires onViewChange', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(
      <Calendar defaultValue={new Date(2026, 4, 20)} view="month" onViewChange={onViewChange} />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('tab', { name: 'Week' }));
    expect(onViewChange).toHaveBeenCalledWith('week');
  });

  it('switches to AgendaView when defaultView="agenda"', () => {
    render(
      <Calendar
        defaultValue={new Date(2026, 4, 20)}
        defaultView="agenda"
        events={[
          {
            id: 'a',
            title: 'Standup',
            startsAt: new Date(2026, 4, 20, 9),
            endsAt: new Date(2026, 4, 20, 9, 30),
          },
        ]}
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('button', { name: /Standup/ })).toBeInTheDocument();
    // Agenda exposes a labelled list region (cycle-1 a11y fix).
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('prev/next aria-labels reflect the active view (per-view labels)', async () => {
    const user = userEvent.setup();
    const cases: Array<{
      defaultView: 'month' | 'week' | 'day' | 'agenda';
      prev: string;
      next: string;
    }> = [
      { defaultView: 'month', prev: 'Previous month', next: 'Next month' },
      { defaultView: 'week', prev: 'Previous week', next: 'Next week' },
      { defaultView: 'day', prev: 'Previous day', next: 'Next day' },
      { defaultView: 'agenda', prev: 'Previous week', next: 'Next week' },
    ];
    for (const { defaultView, prev, next } of cases) {
      const { unmount } = render(
        <Calendar defaultValue={new Date(2026, 4, 20)} defaultView={defaultView} />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('button', { name: prev })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: next })).toBeInTheDocument();
      unmount();
    }
    // Prove the user can step through views and see the labels swap.
    render(<Calendar defaultValue={new Date(2026, 4, 20)} defaultView="month" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Day' }));
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeInTheDocument();
  });

  it('prev/next steps by week in agenda view', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(d: Date) => void>();
    render(
      <Calendar defaultValue={new Date(2026, 4, 20)} defaultView="agenda" onChange={onChange} />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: /Next week/ }));
    const next = onChange.mock.calls[0][0];
    // May 20 + 7 days = May 27
    expect(next.getDate()).toBe(27);
  });
});

describe('Calendar — resource columns and underlay routing', () => {
  const CURSOR = new Date(2026, 4, 20);
  const RESOURCES = [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
  ];

  it('splits view="day" into one column per resource', () => {
    render(<Calendar view="day" value={CURSOR} resources={RESOURCES} />, { wrapper: wrap() });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Ana', 'Ben']);
  });

  it('ignores resources in week view — its columns are weekdays', () => {
    render(<Calendar view="week" value={CURSOR} resources={RESOURCES} />, { wrapper: wrap() });
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });

  it('ignores resources in month view', () => {
    render(<Calendar view="month" value={CURSOR} resources={RESOURCES} />, { wrapper: wrap() });
    expect(screen.queryByText('Ana')).toBeNull();
  });

  it('routes backgroundIntervals into week view', () => {
    const { container } = render(
      <Calendar
        view="week"
        value={CURSOR}
        hourRange={[7, 19]}
        hourRowHeight={48}
        backgroundIntervals={[
          { startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 12) },
        ]}
      />,
      { wrapper: wrap() },
    );
    const bands = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.style.height !== '' && el.style.top !== '',
    );
    expect(bands).toHaveLength(1);
    expect(bands[0].style.top).toBe('96px');
  });

  it('leaves the grid read-only until a drag handler is wired', () => {
    const { rerender } = render(<Calendar view="day" value={CURSOR} />, { wrapper: wrap() });
    expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true');
    rerender(<Calendar view="day" value={CURSOR} onEventMove={() => {}} />);
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-readonly');
  });
});
