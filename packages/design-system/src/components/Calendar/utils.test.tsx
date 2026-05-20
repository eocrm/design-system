import { renderHook } from '@testing-library/react';
import { useMonth } from '../../calendar/useMonth';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import type { CalendarEvent } from './types';
import { layoutEventsForMonth, layoutEventsForHourGrid } from './utils';
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

  it('places a single timed event in column 0 with lane=0, laneCount=1', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 10)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0]).toMatchObject({
      dayIndex: 0,
      startMinutes: 120,
      endMinutes: 180,
      lane: 0,
      laneCount: 1,
    });
  });

  it('places two non-overlapping events on the same lane', () => {
    const out = layoutEventsForHourGrid(
      [tev('a', 20, 9, 10), tev('b', 20, 11, 12)],
      day1,
      [7, 19],
    );
    expect(out.timedBlocks).toHaveLength(2);
    expect(out.timedBlocks[0].lane).toBe(0);
    expect(out.timedBlocks[1].lane).toBe(0);
    expect(out.timedBlocks[0].laneCount).toBe(1);
    expect(out.timedBlocks[1].laneCount).toBe(1);
  });

  it('places two overlapping events on lanes 0 and 1, both laneCount=2', () => {
    const out = layoutEventsForHourGrid(
      [tev('a', 20, 9, 11), tev('b', 20, 10, 12)],
      day1,
      [7, 19],
    );
    expect(out.timedBlocks).toHaveLength(2);
    const byId = new Map(out.timedBlocks.map((b) => [b.event.id, b]));
    expect(byId.get('a')!.lane).toBe(0);
    expect(byId.get('b')!.lane).toBe(1);
    expect(byId.get('a')!.laneCount).toBe(2);
    expect(byId.get('b')!.laneCount).toBe(2);
  });

  it('places three mutually overlapping events with laneCount=3', () => {
    const out = layoutEventsForHourGrid(
      [tev('a', 20, 9, 11), tev('b', 20, 9, 11), tev('c', 20, 9, 11)],
      day1,
      [7, 19],
    );
    expect(out.timedBlocks).toHaveLength(3);
    out.timedBlocks.forEach((b) => expect(b.laneCount).toBe(3));
    const lanes = out.timedBlocks.map((b) => b.lane).sort();
    expect(lanes).toEqual([0, 1, 2]);
  });

  it('groups by transitive overlap (chain A-B, B-C → all laneCount=3 even if A and C disjoint)', () => {
    const out = layoutEventsForHourGrid(
      [
        { id: 'a', title: 'a', startsAt: new Date(2026, 4, 20, 9, 0), endsAt: new Date(2026, 4, 20, 10, 30) },
        { id: 'b', title: 'b', startsAt: new Date(2026, 4, 20, 10, 0), endsAt: new Date(2026, 4, 20, 11, 0) },
        { id: 'c', title: 'c', startsAt: new Date(2026, 4, 20, 10, 45), endsAt: new Date(2026, 4, 20, 12, 0) },
      ],
      day1,
      [7, 19],
    );
    out.timedBlocks.forEach((b) => expect(b.laneCount).toBe(3));
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
