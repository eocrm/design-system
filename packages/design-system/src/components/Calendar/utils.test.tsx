import { renderHook } from '@testing-library/react';
import { useMonth } from '../../calendar/useMonth';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import type { CalendarEvent } from './types';
import {
  formatEventDuration,
  layoutBackgroundIntervals,
  layoutEventsForHourGrid,
  layoutEventsForMonth,
  needsUnassignedColumn,
} from './utils';
import type { ReactNode } from 'react';

function wrapEnUS({ children }: { children: ReactNode }) {
  return <LocaleProvider locale="en-US">{children}</LocaleProvider>;
}

function may2026() {
  const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
    wrapper: wrapEnUS,
  });
  return result.current.weeks;
}

function event(
  id: string,
  startsAt: Date,
  endsAt?: Date,
  extras?: Partial<CalendarEvent>,
): CalendarEvent {
  return { id, title: id, startsAt, endsAt, ...extras };
}

describe('layoutEventsForMonth', () => {
  it('returns empty layout for no events', () => {
    const out = layoutEventsForMonth([], may2026(), 3);
    expect(out.bars).toEqual([]);
    expect(out.hiddenCounts.size).toBe(0);
  });

  it('returns empty layout for empty weeks', () => {
    const out = layoutEventsForMonth([event('a', new Date(2026, 4, 15))], [], 3);
    expect(out.bars).toEqual([]);
  });

  it('places a single-day event with startCol === endCol on the correct week', () => {
    const out = layoutEventsForMonth([event('a', new Date(2026, 4, 15))], may2026(), 3);
    expect(out.bars).toHaveLength(1);
    expect(out.bars[0]).toMatchObject({
      weekIndex: 2,
      startCol: 6,
      endCol: 6,
      lane: 0,
      continuesLeft: false,
      continuesRight: false,
    });
  });

  it('places a multi-day event within one week', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 11), new Date(2026, 4, 13))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(1);
    expect(out.bars[0]).toMatchObject({
      weekIndex: 2,
      startCol: 2,
      endCol: 4,
      continuesLeft: false,
      continuesRight: false,
    });
  });

  it('splits an event across a week boundary into two bars with continuation flags', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 15), new Date(2026, 4, 18))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(2);
    const [first, second] = out.bars;
    expect(first).toMatchObject({
      weekIndex: 2,
      startCol: 6,
      endCol: 7,
      continuesLeft: false,
      continuesRight: true,
    });
    expect(second).toMatchObject({
      weekIndex: 3,
      startCol: 1,
      endCol: 2,
      continuesLeft: true,
      continuesRight: false,
    });
  });

  it('produces a 3-bar layout for an event spanning 3 weeks (middle bar has both flags)', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 6), new Date(2026, 4, 20))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(3);
    const [w1, w2, w3] = out.bars;
    expect(w1).toMatchObject({
      weekIndex: 1,
      startCol: 4,
      endCol: 7,
      continuesLeft: false,
      continuesRight: true,
    });
    expect(w2).toMatchObject({
      weekIndex: 2,
      startCol: 1,
      endCol: 7,
      continuesLeft: true,
      continuesRight: true,
    });
    expect(w3).toMatchObject({
      weekIndex: 3,
      startCol: 1,
      endCol: 4,
      continuesLeft: true,
      continuesRight: false,
    });
  });

  it('stacks two overlapping single-day events on different lanes', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 15)), event('b', new Date(2026, 4, 15))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(2);
    const lanes = out.bars.map((b) => b.lane).sort();
    expect(lanes).toEqual([0, 1]);
  });

  it('places non-overlapping events on the same lane (greedy reuse)', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 11)), event('b', new Date(2026, 4, 13))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(2);
    expect(out.bars[0].lane).toBe(0);
    expect(out.bars[1].lane).toBe(0);
  });

  it('records hiddenCounts when events exceed maxLanes (5 events same day, maxLanes=3)', () => {
    const out = layoutEventsForMonth(
      [
        event('a', new Date(2026, 4, 15)),
        event('b', new Date(2026, 4, 15)),
        event('c', new Date(2026, 4, 15)),
        event('d', new Date(2026, 4, 15)),
        event('e', new Date(2026, 4, 15)),
      ],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(3);
    expect(out.hiddenCounts.get('2026-05-15')).toBe(2);
  });

  it('drops events entirely outside the grid', () => {
    const out = layoutEventsForMonth([event('a', new Date(2026, 3, 20))], may2026(), 3);
    expect(out.bars).toEqual([]);
    expect(out.hiddenCounts.size).toBe(0);
  });

  it('clips an event partially before the grid to the grid start', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 3, 24), new Date(2026, 3, 28))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(1);
    expect(out.bars[0]).toMatchObject({
      weekIndex: 0,
      startCol: 1,
      endCol: 3,
      continuesLeft: true,
      continuesRight: false,
    });
  });

  it('swaps endsAt and startsAt when endsAt is before startsAt', () => {
    // May 14 (startsAt) > May 12 (endsAt) — both in week 2, so normalisation
    // produces a single bar with startCol <= endCol after the swap.
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 14), new Date(2026, 4, 12))],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(1);
    expect(out.bars[0].startCol).toBeLessThanOrEqual(out.bars[0].endCol);
  });

  it('treats missing endsAt as a single-day event', () => {
    const out = layoutEventsForMonth([event('a', new Date(2026, 4, 15))], may2026(), 3);
    expect(out.bars).toHaveLength(1);
    expect(out.bars[0].startCol).toBe(out.bars[0].endCol);
  });

  it('sorts events with same start by duration descending (longer events go to lower lanes)', () => {
    const out = layoutEventsForMonth(
      [event('a', new Date(2026, 4, 11)), event('b', new Date(2026, 4, 11), new Date(2026, 4, 13))],
      may2026(),
      3,
    );
    const byId = new Map(out.bars.map((b) => [b.event.id, b]));
    expect(byId.get('b')!.lane).toBe(0);
    expect(byId.get('a')!.lane).toBe(1);
  });

  it('emits hiddenCounts for every day of a hidden multi-day event', () => {
    const out = layoutEventsForMonth(
      [
        event('a', new Date(2026, 4, 12), new Date(2026, 4, 14)),
        event('b', new Date(2026, 4, 12), new Date(2026, 4, 14)),
        event('c', new Date(2026, 4, 12), new Date(2026, 4, 14)),
        event('d', new Date(2026, 4, 12), new Date(2026, 4, 14)),
      ],
      may2026(),
      3,
    );
    expect(out.bars).toHaveLength(3);
    expect(out.hiddenCounts.get('2026-05-12')).toBe(1);
    expect(out.hiddenCounts.get('2026-05-13')).toBe(1);
    expect(out.hiddenCounts.get('2026-05-14')).toBe(1);
  });
});

describe('layoutEventsForHourGrid', () => {
  // Helper: a list of 1 day = May 20 2026 (Wed)
  const day1 = [{ date: new Date(2026, 4, 20), key: '2026-05-20' }];

  // Helper: a list of 7 days = May 17..23 (Sun-Sat)
  const week7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 4, 17 + i);
    return { date: d, key: `2026-05-${String(17 + i).padStart(2, '0')}` };
  });

  function tev(id: string, day: number, startHour: number, endHour: number): CalendarEvent {
    return {
      id,
      title: id,
      startsAt: new Date(2026, 4, day, startHour, 0),
      endsAt: new Date(2026, 4, day, endHour, 0),
    };
  }

  it('returns empty layout for no events', () => {
    const out = layoutEventsForHourGrid([], day1, [7, 19]);
    expect(out.timedBlocks).toEqual([]);
    expect(out.allDayBars).toEqual([]);
  });

  it('places a single timed event in column 0 with lane=0', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 10)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0]).toMatchObject({
      dayIndex: 0,
      startMinutes: 120,
      endMinutes: 180,
      lane: 0,
    });
  });

  it('places two non-overlapping events on the same lane', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 10), tev('b', 20, 11, 12)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(2);
    expect(out.timedBlocks[0].lane).toBe(0);
    expect(out.timedBlocks[1].lane).toBe(0);
  });

  it('places two overlapping events on lanes 0 and 1', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 11), tev('b', 20, 10, 12)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(2);
    const byId = new Map(out.timedBlocks.map((b) => [b.event.id, b]));
    expect(byId.get('a')!.lane).toBe(0);
    expect(byId.get('b')!.lane).toBe(1);
  });

  it('places three mutually overlapping events on lanes 0, 1, 2', () => {
    const out = layoutEventsForHourGrid(
      [tev('a', 20, 9, 11), tev('b', 20, 9, 11), tev('c', 20, 9, 11)],
      day1,
      [7, 19],
    );
    expect(out.timedBlocks).toHaveLength(3);
    const lanes = out.timedBlocks.map((b) => b.lane).sort();
    expect(lanes).toEqual([0, 1, 2]);
  });

  it('chain A-B-C: recycles A’s lane for C (lanes 0, 1, 0 in transitive group)', () => {
    // A (9:00-10:30) and B (10:00-11:00) overlap → A=lane0, B=lane1.
    // C (10:45-12:00) starts after A ends → reuses lane 0.
    const out = layoutEventsForHourGrid(
      [
        {
          id: 'a',
          title: 'a',
          startsAt: new Date(2026, 4, 20, 9, 0),
          endsAt: new Date(2026, 4, 20, 10, 30),
        },
        {
          id: 'b',
          title: 'b',
          startsAt: new Date(2026, 4, 20, 10, 0),
          endsAt: new Date(2026, 4, 20, 11, 0),
        },
        {
          id: 'c',
          title: 'c',
          startsAt: new Date(2026, 4, 20, 10, 45),
          endsAt: new Date(2026, 4, 20, 12, 0),
        },
      ],
      day1,
      [7, 19],
    );
    const byId = new Map(out.timedBlocks.map((b) => [b.event.id, b]));
    expect(byId.get('a')!.lane).toBe(0);
    expect(byId.get('b')!.lane).toBe(1);
    expect(byId.get('c')!.lane).toBe(0);
  });

  it('puts a multi-day event into allDayBars when allDay is true', () => {
    const out = layoutEventsForHourGrid(
      [
        {
          id: 'conf',
          title: 'Conference',
          startsAt: new Date(2026, 4, 18),
          endsAt: new Date(2026, 4, 22),
          allDay: true,
        },
      ],
      week7,
      [7, 19],
    );
    expect(out.timedBlocks).toEqual([]);
    expect(out.allDayBars).toHaveLength(1);
    expect(out.allDayBars[0]).toMatchObject({
      startCol: 1,
      endCol: 5,
      lane: 0,
      continuesLeft: false,
      continuesRight: false,
    });
  });

  it('clips an allDay event extending before the view to startCol=0 with continuesLeft', () => {
    const out = layoutEventsForHourGrid(
      [
        {
          id: 'conf',
          title: 'Conference',
          startsAt: new Date(2026, 4, 15),
          endsAt: new Date(2026, 4, 20),
          allDay: true,
        },
      ],
      week7,
      [7, 19],
    );
    expect(out.allDayBars).toHaveLength(1);
    expect(out.allDayBars[0]).toMatchObject({
      startCol: 0,
      endCol: 3,
      continuesLeft: true,
      continuesRight: false,
    });
  });

  it('clips an allDay event extending past the view with continuesRight', () => {
    const out = layoutEventsForHourGrid(
      [
        {
          id: 'conf',
          title: 'Conference',
          startsAt: new Date(2026, 4, 22),
          endsAt: new Date(2026, 4, 28),
          allDay: true,
        },
      ],
      week7,
      [7, 19],
    );
    expect(out.allDayBars[0]).toMatchObject({
      startCol: 5,
      endCol: 6,
      continuesLeft: false,
      continuesRight: true,
    });
  });

  it('drops events entirely outside the view', () => {
    const out = layoutEventsForHourGrid([tev('a', 25, 9, 10)], day1, [7, 19]);
    expect(out.timedBlocks).toEqual([]);
  });

  it('places events at the correct dayIndex within a week', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 10)], week7, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0].dayIndex).toBe(3);
  });

  it('keeps events starting before hourRange (negative startMinutes) so the renderer can clip', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 6, 8)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0].startMinutes).toBe(-60);
    expect(out.timedBlocks[0].endMinutes).toBe(60);
  });

  it('clamps endMinutes to end-of-day when a timed event spans multiple days', () => {
    // Event: May 19 14:00 → May 21 09:00 (spans 3 days)
    // In a [7, 19] view rendered for the week of May 17..23, this event
    // should appear on May 19 (dayIndex=2 in Sun-start week)
    // with endMinutes clamped to 24*60 - 7*60 = 1020 (= end of day past
    // the visible range; TimedEvent will render as a block extending past
    // the bottom of the column).
    const ev: CalendarEvent = {
      id: 'multi',
      title: 'Conference call',
      startsAt: new Date(2026, 4, 19, 14, 0),
      endsAt: new Date(2026, 4, 21, 9, 0),
    };
    const out = layoutEventsForHourGrid([ev], week7, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0].dayIndex).toBe(2); // May 19 in Sun-start week 17..23
    expect(out.timedBlocks[0].startMinutes).toBe(7 * 60); // 14:00 - 7:00 = 7h = 420min
    // 24:00 (end-of-day) − 7:00 (hour-range base) = 17h = 1020min
    expect(out.timedBlocks[0].endMinutes).toBe(1020);
    expect(out.timedBlocks[0].endMinutes).toBeGreaterThan(out.timedBlocks[0].startMinutes);
  });
});

describe('layoutEventsForHourGrid — resource columns (issue #471)', () => {
  const date = new Date(2026, 4, 20);
  const resourceCols = [
    { date, key: 'd-ana', resourceId: 'ana' },
    { date, key: 'd-ben', resourceId: 'ben' },
  ];
  const withUnassigned = [...resourceCols, { date, key: 'd-none', resourceId: null }];

  function rev(id: string, startHour: number, endHour: number, resourceId?: string): CalendarEvent {
    return {
      id,
      title: id,
      startsAt: new Date(2026, 4, 20, startHour),
      endsAt: new Date(2026, 4, 20, endHour),
      resourceId,
    };
  }

  it('routes each event to its own resource column', () => {
    const out = layoutEventsForHourGrid(
      [rev('a', 9, 10, 'ana'), rev('b', 9, 10, 'ben')],
      resourceCols,
      [7, 19],
    );
    const byId = new Map(out.timedBlocks.map((b) => [b.event.id, b]));
    expect(byId.get('a')!.dayIndex).toBe(0);
    expect(byId.get('b')!.dayIndex).toBe(1);
  });

  it('gives same-time events in DIFFERENT resource columns lane 0 each (no cascade)', () => {
    // The regression that makes resource columns worth having: two bookings
    // at 9am with different practitioners are not a collision.
    const out = layoutEventsForHourGrid(
      [rev('a', 9, 10, 'ana'), rev('b', 9, 10, 'ben')],
      resourceCols,
      [7, 19],
    );
    expect(out.timedBlocks.map((b) => b.lane)).toEqual([0, 0]);
  });

  it('still cascades two overlapping events within ONE resource column', () => {
    const out = layoutEventsForHourGrid(
      [rev('a', 9, 11, 'ana'), rev('b', 10, 12, 'ana')],
      resourceCols,
      [7, 19],
    );
    expect(out.timedBlocks.map((b) => b.lane).sort()).toEqual([0, 1]);
  });

  it('routes an unmatched resourceId to the unassigned column', () => {
    const out = layoutEventsForHourGrid([rev('a', 9, 10, 'ghost')], withUnassigned, [7, 19]);
    expect(out.timedBlocks[0].dayIndex).toBe(2);
  });

  it('routes an event with NO resourceId to the unassigned column', () => {
    const out = layoutEventsForHourGrid([rev('a', 9, 10)], withUnassigned, [7, 19]);
    expect(out.timedBlocks[0].dayIndex).toBe(2);
  });

  it('drops an unmatched event when no unassigned column is rendered', () => {
    const out = layoutEventsForHourGrid([rev('a', 9, 10, 'ghost')], resourceCols, [7, 19]);
    expect(out.timedBlocks).toHaveLength(0);
  });

  it('ignores resourceId entirely on a date grid', () => {
    const dateCols = [{ date, key: '2026-05-20' }];
    const out = layoutEventsForHourGrid([rev('a', 9, 10, 'ghost')], dateCols, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0].dayIndex).toBe(0);
  });

  it('spans an all-day event with no resourceId across every column', () => {
    const allDay: CalendarEvent = {
      id: 'holiday',
      title: 'Holiday',
      startsAt: date,
      endsAt: date,
      allDay: true,
    };
    const out = layoutEventsForHourGrid([allDay], resourceCols, [7, 19]);
    expect(out.allDayBars).toHaveLength(1);
    expect(out.allDayBars[0].startCol).toBe(0);
    expect(out.allDayBars[0].endCol).toBe(1);
  });

  it('pins an all-day event WITH a resourceId to that one column', () => {
    const allDay: CalendarEvent = {
      id: 'leave',
      title: 'Ana on leave',
      startsAt: date,
      endsAt: date,
      allDay: true,
      resourceId: 'ana',
    };
    const out = layoutEventsForHourGrid([allDay], resourceCols, [7, 19]);
    expect(out.allDayBars[0].startCol).toBe(0);
    expect(out.allDayBars[0].endCol).toBe(0);
  });

  it('stacks a per-resource all-day bar below a day-wide one', () => {
    const dayWide: CalendarEvent = {
      id: 'holiday',
      title: 'Holiday',
      startsAt: date,
      endsAt: date,
      allDay: true,
    };
    const perResource: CalendarEvent = {
      id: 'leave',
      title: 'Leave',
      startsAt: date,
      endsAt: date,
      allDay: true,
      resourceId: 'ana',
    };
    const out = layoutEventsForHourGrid([perResource, dayWide], resourceCols, [7, 19]);
    const byId = new Map(out.allDayBars.map((b) => [b.event.id, b]));
    expect(byId.get('holiday')!.lane).toBe(0);
    expect(byId.get('leave')!.lane).toBe(1);
  });
});

describe('needsUnassignedColumn (issue #471)', () => {
  const date = new Date(2026, 4, 20);
  const ids = new Set(['ana', 'ben']);

  function ev(extra: Partial<CalendarEvent>): CalendarEvent {
    return {
      id: 'x',
      title: 'x',
      startsAt: new Date(2026, 4, 20, 9),
      endsAt: new Date(2026, 4, 20, 10),
      ...extra,
    };
  }

  it('is false when every event maps to a resource', () => {
    expect(needsUnassignedColumn([ev({ resourceId: 'ana' })], date, ids)).toBe(false);
  });

  it('is true for a timed event with no resourceId', () => {
    expect(needsUnassignedColumn([ev({})], date, ids)).toBe(true);
  });

  it('is true for a resourceId matching no resource', () => {
    expect(needsUnassignedColumn([ev({ resourceId: 'ghost' })], date, ids)).toBe(true);
  });

  it('is false for an all-day event with no resourceId (it spans every column)', () => {
    expect(needsUnassignedColumn([ev({ allDay: true })], date, ids)).toBe(false);
  });

  it('ignores events on other days', () => {
    const other = ev({ startsAt: new Date(2026, 4, 21, 9), endsAt: new Date(2026, 4, 21, 10) });
    expect(needsUnassignedColumn([other], date, ids)).toBe(false);
  });
});

describe('layoutBackgroundIntervals (issue #473)', () => {
  const date = new Date(2026, 4, 20);
  const oneDay = [{ date, key: '2026-05-20' }];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 4, 17 + i);
    return { date: d, key: `2026-05-${String(17 + i).padStart(2, '0')}` };
  });
  const resourceCols = [
    { date, key: 'd-ana', resourceId: 'ana' },
    { date, key: 'd-ben', resourceId: 'ben' },
  ];

  it('returns nothing for an empty interval list', () => {
    expect(layoutBackgroundIntervals([], oneDay, [7, 19])).toEqual([]);
  });

  it('positions an interval in minutes from the hour range start', () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 12, 30) }],
      oneDay,
      [7, 19],
    );
    expect(out).toHaveLength(1);
    expect(out[0].startMinutes).toBe(120);
    expect(out[0].endMinutes).toBe(330);
  });

  it("defaults the tone to 'unavailable'", () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 10) }],
      oneDay,
      [7, 19],
    );
    expect(out[0].tone).toBe('unavailable');
  });

  it("keeps an explicit 'available' tone", () => {
    const out = layoutBackgroundIntervals(
      [
        {
          startsAt: new Date(2026, 4, 20, 9),
          endsAt: new Date(2026, 4, 20, 10),
          tone: 'available',
        },
      ],
      oneDay,
      [7, 19],
    );
    expect(out[0].tone).toBe('available');
  });

  it('clips an interval that starts before the visible hour range', () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 20, 5), endsAt: new Date(2026, 4, 20, 8) }],
      oneDay,
      [7, 19],
    );
    expect(out[0].startMinutes).toBe(0);
    expect(out[0].endMinutes).toBe(60);
  });

  it('clips an interval that runs past the visible hour range', () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 20, 18), endsAt: new Date(2026, 4, 21, 2) }],
      oneDay,
      [7, 19],
    );
    expect(out[0].startMinutes).toBe(660);
    expect(out[0].endMinutes).toBe(720);
  });

  it('drops an interval entirely outside the visible hour range', () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 20, 1), endsAt: new Date(2026, 4, 20, 5) }],
      oneDay,
      [7, 19],
    );
    expect(out).toEqual([]);
  });

  it('drops a zero-length or inverted interval', () => {
    const zero = { startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 9) };
    const inverted = { startsAt: new Date(2026, 4, 20, 12), endsAt: new Date(2026, 4, 20, 9) };
    expect(layoutBackgroundIntervals([zero, inverted], oneDay, [7, 19])).toEqual([]);
  });

  it('splits a multi-day interval across the week columns it covers', () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 18, 22), endsAt: new Date(2026, 4, 20, 9) }],
      week,
      [7, 19],
    );
    // Mon 18 (22:00 → clipped out, past 19:00), Tue 19 (whole day), Wed 20 (until 9).
    const byCol = new Map(out.map((b) => [b.dayIndex, b]));
    expect(byCol.has(1)).toBe(false);
    expect(byCol.get(2)!.startMinutes).toBe(0);
    expect(byCol.get(2)!.endMinutes).toBe(720);
    expect(byCol.get(3)!.startMinutes).toBe(0);
    expect(byCol.get(3)!.endMinutes).toBe(120);
  });

  it('paints every column when the interval carries no resourceId', () => {
    const out = layoutBackgroundIntervals(
      [{ startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 10) }],
      resourceCols,
      [7, 19],
    );
    expect(out.map((b) => b.dayIndex)).toEqual([0, 1]);
  });

  it('paints only the matching column when the interval names a resource', () => {
    const out = layoutBackgroundIntervals(
      [
        {
          startsAt: new Date(2026, 4, 20, 9),
          endsAt: new Date(2026, 4, 20, 10),
          resourceId: 'ben',
        },
      ],
      resourceCols,
      [7, 19],
    );
    expect(out).toHaveLength(1);
    expect(out[0].dayIndex).toBe(1);
  });

  it('ignores resourceId on a date grid (week view has no resource columns)', () => {
    const out = layoutBackgroundIntervals(
      [
        {
          startsAt: new Date(2026, 4, 20, 9),
          endsAt: new Date(2026, 4, 20, 10),
          resourceId: 'ben',
        },
      ],
      oneDay,
      [7, 19],
    );
    expect(out).toHaveLength(1);
  });

  it('emits distinct keys per interval/column pair', () => {
    const out = layoutBackgroundIntervals(
      [
        { startsAt: new Date(2026, 4, 20, 9), endsAt: new Date(2026, 4, 20, 10) },
        { startsAt: new Date(2026, 4, 20, 14), endsAt: new Date(2026, 4, 20, 15) },
      ],
      resourceCols,
      [7, 19],
    );
    expect(new Set(out.map((b) => b.key)).size).toBe(out.length);
  });
});

describe('formatEventDuration', () => {
  it('returns "0m" for zero-duration events (no endsAt)', () => {
    expect(formatEventDuration(new Date(2026, 4, 20, 9, 0), undefined)).toBe('0m');
  });

  it('returns "30m" for sub-hour events', () => {
    expect(formatEventDuration(new Date(2026, 4, 20, 9, 0), new Date(2026, 4, 20, 9, 30))).toBe(
      '30m',
    );
  });

  it('returns "1h" for exact-hour events', () => {
    expect(formatEventDuration(new Date(2026, 4, 20, 9, 0), new Date(2026, 4, 20, 10, 0))).toBe(
      '1h',
    );
  });

  it('returns "1h 30m" for one-and-a-half hours', () => {
    expect(formatEventDuration(new Date(2026, 4, 20, 9, 0), new Date(2026, 4, 20, 10, 30))).toBe(
      '1h 30m',
    );
  });

  it('returns "2d" for exact two-day events', () => {
    expect(formatEventDuration(new Date(2026, 4, 20), new Date(2026, 4, 22))).toBe('2d');
  });

  it('returns "2d 5h" for two-day five-hour events', () => {
    expect(formatEventDuration(new Date(2026, 4, 20, 9, 0), new Date(2026, 4, 22, 14, 0))).toBe(
      '2d 5h',
    );
  });

  it('counts allDay events inclusively (May 20 → May 22 reads as "3d")', () => {
    expect(formatEventDuration(new Date(2026, 4, 20), new Date(2026, 4, 22), true)).toBe('3d');
  });

  it('counts single-day allDay events as "1d"', () => {
    expect(formatEventDuration(new Date(2026, 4, 20), new Date(2026, 4, 20), true)).toBe('1d');
  });

  it('counts allDay event with no endsAt as "1d"', () => {
    expect(formatEventDuration(new Date(2026, 4, 20), undefined, true)).toBe('1d');
  });
});
