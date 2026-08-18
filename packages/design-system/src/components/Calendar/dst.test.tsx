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

function wrap({ children }: { children: ReactNode }) {
  return <LocaleProvider locale="en-US">{children}</LocaleProvider>;
}

/** Spring forward: 02:00 does not exist on 8 March 2026 in New York. */
const DST_DAY = new Date(2026, 2, 8);
const HOUR_ROW_HEIGHT = 48;

describe('Calendar drag — daylight saving', () => {
  it('preserves WALL-CLOCK duration across a spring-forward move', () => {
    // 01:00 → 05:00 is four hours on the clock but only three elapsed, because
    // the 02:00 hour is skipped. The projection is wall-clock, so a duration
    // measured in elapsed milliseconds disagrees with it by exactly that hour
    // and the event silently loses one.
    const onEventMove = vi.fn();
    render(
      <Calendar
        view="day"
        value={DST_DAY}
        events={[
          {
            id: 'dst',
            title: 'Long shift',
            startsAt: new Date(2026, 2, 8, 1, 0),
            endsAt: new Date(2026, 2, 8, 5, 0),
          },
        ]}
        hourRange={[0, 23]}
        hourRowHeight={HOUR_ROW_HEIGHT}
        onEventMove={onEventMove}
      />,
      { wrapper: wrap },
    );
    const el = screen.getByRole('button', { name: /Long shift/ });
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 100,
      clientY: 100 + 5 * HOUR_ROW_HEIGHT,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 100,
      clientY: 100 + 5 * HOUR_ROW_HEIGHT,
    });

    const [, next] = onEventMove.mock.calls[0];
    const wallClockHours =
      next.endsAt.getHours() -
      next.startsAt.getHours() +
      (next.endsAt.getDate() - next.startsAt.getDate()) * 24;
    expect(wallClockHours).toBe(4);
  });
});
