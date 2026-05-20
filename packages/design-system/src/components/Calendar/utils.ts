import { startOfDay, toDateKey } from '../../calendar/dateMath';
import type { Week } from '../../calendar/types';
import type { CalendarEvent, EventBar, MonthLayout } from './types';

const MS_PER_DAY = 86_400_000;

interface NormalizedEvent {
  event: CalendarEvent;
  /** Local midnight of the first day. */
  start: Date;
  /** Local midnight of the last day (inclusive). */
  end: Date;
  /** Day-count duration (end - start). 0 for single-day. */
  duration: number;
}

function normalize(event: CalendarEvent): NormalizedEvent {
  let start = startOfDay(event.startsAt);
  let end = startOfDay(event.endsAt ?? event.startsAt);
  if (end.getTime() < start.getTime()) {
    [start, end] = [end, start];
  }
  const duration = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return { event, start, end, duration };
}

/**
 * Convert a flat events list into placed bars on a month grid.
 *
 * - Multi-day events are sliced at week boundaries — they appear as multiple
 *   bars with `continuesLeft` / `continuesRight` flags on the affected edges.
 * - Events entirely outside the grid are dropped; partial overlaps are clipped.
 * - Lane assignment is greedy: events sorted by `(startsAt asc, durationDesc)`;
 *   each segment lands in the lowest lane index where it doesn't overlap an
 *   already-placed segment in the same week.
 * - Bars in lanes >= `maxLanes` are dropped from `bars` and contribute to
 *   `hiddenCounts` for every day they cover.
 */
export function layoutEventsForMonth(
  events: readonly CalendarEvent[],
  weeks: readonly Week[],
  maxLanes: number,
): MonthLayout {
  if (events.length === 0 || weeks.length === 0) {
    return { bars: [], hiddenCounts: new Map() };
  }

  const gridStart = weeks[0][0].date;
  const gridEnd = weeks[weeks.length - 1][6].date;

  const normalized = events
    .map(normalize)
    .filter((n) => n.end.getTime() >= gridStart.getTime() && n.start.getTime() <= gridEnd.getTime())
    .sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff !== 0) return startDiff;
      return b.duration - a.duration;
    });

  const bars: EventBar[] = [];
  const hiddenCounts = new Map<string, number>();

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex];
    const weekStart = week[0].date;
    const weekEnd = week[6].date;

    interface Segment {
      ne: NormalizedEvent;
      startCol: number;
      endCol: number;
    }
    const segments: Segment[] = [];

    for (const ne of normalized) {
      if (ne.end.getTime() < weekStart.getTime() || ne.start.getTime() > weekEnd.getTime())
        continue;
      const segStartMs = Math.max(ne.start.getTime(), weekStart.getTime());
      const segEndMs = Math.min(ne.end.getTime(), weekEnd.getTime());
      const startCol = Math.round((segStartMs - weekStart.getTime()) / MS_PER_DAY) + 1;
      const endCol = Math.round((segEndMs - weekStart.getTime()) / MS_PER_DAY) + 1;
      segments.push({ ne, startCol, endCol });
    }

    interface LaneSegment {
      startCol: number;
      endCol: number;
    }
    const lanes: LaneSegment[][] = [];

    for (const seg of segments) {
      let assigned = -1;
      for (let l = 0; l < lanes.length; l++) {
        const conflicts = lanes[l].some(
          (s) => !(s.endCol < seg.startCol || s.startCol > seg.endCol),
        );
        if (!conflicts) {
          assigned = l;
          break;
        }
      }
      if (assigned === -1) {
        assigned = lanes.length;
        lanes.push([]);
      }
      lanes[assigned].push({ startCol: seg.startCol, endCol: seg.endCol });

      const bar: EventBar = {
        event: seg.ne.event,
        weekIndex,
        startCol: seg.startCol,
        endCol: seg.endCol,
        lane: assigned,
        continuesLeft: seg.ne.start.getTime() < weekStart.getTime(),
        continuesRight: seg.ne.end.getTime() > weekEnd.getTime(),
      };

      if (assigned < maxLanes) {
        bars.push(bar);
      } else {
        for (let col = seg.startCol; col <= seg.endCol; col++) {
          const date = week[col - 1].date;
          const key = toDateKey(date);
          hiddenCounts.set(key, (hiddenCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return { bars, hiddenCounts };
}
