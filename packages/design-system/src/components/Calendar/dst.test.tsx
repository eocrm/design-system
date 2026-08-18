/**
 * Daylight-saving behaviour of the drag controller, pinned to a timezone that
 * actually has a transition.
 *
 * `process.env.TZ` is set before any `Date` is constructed — Node re-reads it,
 * so the whole file runs in New York regardless of the machine's own zone.
 * Without that pin these assertions would silently pass everywhere by testing
 * nothing.
 */
process.env.TZ = 'America/New_York';

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { Calendar } from './Calendar';
import type { CalendarEvent } from './types';
import timedEventStyles from './TimedEvent.module.scss';

function wrap({ children }: { children: ReactNode }) {
  return <LocaleProvider locale="en-US">{children}</LocaleProvider>;
}

/** Spring forward: 02:00 does not exist on 8 March 2026 in New York. */
const DST_DAY = new Date(2026, 2, 8);
const HOUR_ROW_HEIGHT = 48;

describe('Calendar drag — daylight saving', () => {
  /**
   * The semantics, chosen deliberately: a proposal preserves the event's
   * ELAPSED duration. A booking IS its elapsed time — a 30-minute appointment
   * takes 30 real minutes on any day of the year — whereas the grid draws
   * wall-clock rows, and on a transition day the two genuinely differ. The
   * block's rendered height therefore follows the rows; the payload follows
   * the clock on the wall of the real world.
   */
  function dragBy(name: RegExp, rows: number) {
    const el = screen.getByRole('button', { name });
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 100,
      clientY: 100 + rows * HOUR_ROW_HEIGHT,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 100,
      clientY: 100 + rows * HOUR_ROW_HEIGHT,
    });
  }

  function renderDay(events: CalendarEvent[], onEventMove: () => void) {
    render(
      <Calendar
        view="day"
        value={DST_DAY}
        events={events}
        hourRange={[0, 23]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventMove={onEventMove}
      />,
      { wrapper: wrap },
    );
  }

  it('preserves elapsed duration across a spring-forward move', () => {
    // 01:00 → 05:00 is four rows on the grid but only three hours elapsed,
    // because the 02:00 hour does not exist.
    const onEventMove = vi.fn();
    renderDay(
      [
        {
          id: 'dst',
          title: 'Long shift',
          startsAt: new Date(2026, 2, 8, 1, 0),
          endsAt: new Date(2026, 2, 8, 5, 0),
        },
      ],
      onEventMove,
    );
    dragBy(/Long shift/, 5);
    const [, next] = onEventMove.mock.calls[0];
    expect(next.endsAt.getTime() - next.startsAt.getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it('never proposes a zero-length booking when the drop lands on the skipped hour', () => {
    // 02:00 and 03:00 are the same instant. Recomputing the end from midnight
    // in wall-clock minutes collapses them, and the consumer is handed
    // `endsAt === startsAt`.
    const onEventMove = vi.fn();
    renderDay(
      [
        {
          id: 'skip',
          title: 'Early',
          startsAt: new Date(2026, 2, 8, 0, 0),
          endsAt: new Date(2026, 2, 8, 1, 0),
        },
      ],
      onEventMove,
    );
    dragBy(/Early/, 2);
    const [, next] = onEventMove.mock.calls[0];
    expect(next.endsAt.getTime()).toBeGreaterThan(next.startsAt.getTime());
    expect(next.endsAt.getTime() - next.startsAt.getTime()).toBe(60 * 60 * 1000);
  });

  it("does not fire a resize whose projection lands back on the event's own end", () => {
    // 00:00 → 03:00. Dragging the handle up one row asks for an end at grid
    // minute 120 — which on this day IS 03:00, because the 02:00 hour does not
    // exist. The grid coordinates differ (120 vs 180) so a coordinate-only
    // no-op check waves it through, and the consumer's API write fires
    // proposing the value the event already has.
    const onEventResize = vi.fn();
    const { container } = render(
      <Calendar
        view="day"
        value={DST_DAY}
        events={[
          {
            id: 'collapse',
            title: 'Ap',
            startsAt: new Date(2026, 2, 8, 0, 0),
            endsAt: new Date(2026, 2, 8, 3, 0),
          },
        ]}
        hourRange={[0, 23]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventResize={onEventResize}
      />,
      { wrapper: wrap },
    );
    const handle = container.querySelector(`.${timedEventStyles.resizeHandle}`)!;
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 100, clientY: 100 - HOUR_ROW_HEIGHT });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 100, clientY: 100 - HOUR_ROW_HEIGHT });
    expect(onEventResize).not.toHaveBeenCalled();
  });

  it('does not inflate a booking dragged onto the transition', () => {
    // Straddling the skipped hour: a wall-clock projection turns 60 minutes
    // into 120. Elapsed arithmetic keeps it at 60.
    const onEventMove = vi.fn();
    renderDay(
      [
        {
          id: 'straddle',
          title: 'Short',
          startsAt: new Date(2026, 2, 8, 0, 0),
          endsAt: new Date(2026, 2, 8, 1, 0),
        },
      ],
      onEventMove,
    );
    dragBy(/Short/, 1.75);
    const [, next] = onEventMove.mock.calls[0];
    expect(next.endsAt.getTime() - next.startsAt.getTime()).toBe(60 * 60 * 1000);
  });
});
