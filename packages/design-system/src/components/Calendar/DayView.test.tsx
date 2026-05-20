import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DayView } from './DayView';
import type { CalendarEvent } from './types';

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
