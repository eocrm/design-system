import { renderHook } from '@testing-library/react';
import { useMonth } from '../../calendar/useMonth';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import type { CalendarEvent } from './types';
import { layoutEventsForMonth } from './utils';
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
