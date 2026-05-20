# Calendar PR 3 Implementation Plan (Week + Day views)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `<WeekView>` and `<DayView>` to the Calendar surface with an hour-grid primitive, collision layout for overlapping timed events, an all-day band, a "now" indicator, and a view switcher in the Calendar shell.

**Architecture:** New `<HourGrid>` internal primitive (column×hour CSS grid) used by both `<WeekView>` (7 cols) and `<DayView>` (1 col). `<TimedEvent>` blocks position absolutely inside their day column. `<AllDayBand>` reuses the month-bar continuation pattern. `<ViewSwitcher>` wraps `<Tabs>` as a segmented control. `layoutEventsForHourGrid` in `utils.ts` runs greedy lane assignment + sweep-based collision-group laneCount.

**Tech Stack:** React 18 + TypeScript, SCSS modules, Vitest + RTL.

**Spec:** [docs/superpowers/specs/2026-05-20-calendar-week-day-views-design.md](../specs/2026-05-20-calendar-week-day-views-design.md)

**Branch state at start:** `feat/calendar-week-day-views` branched from fresh `main` (with PR #20 merged in). Spec is committed on top.

---

## Task 1: Verify branch + hooks

**Files:** (no edits — git only)

- [ ] **Step 1: Confirm branch + clean tree**

```bash
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -4
```

Expected: branch `feat/calendar-week-day-views`; top commits include the Calendar PR 3 spec. Tree clean.

- [ ] **Step 2: Verify hooks**

```bash
git config --get core.hooksPath
test -x .husky/pre-push && echo OK
```

Expected: `.husky/_` + `OK`.

---

## Task 2: Extend `types.ts`

**Files:**

- Modify: `packages/design-system/src/components/Calendar/types.ts`

- [ ] **Step 1: Extend `CalendarView` and add new types**

Replace `export type CalendarView = 'month';` and add the new shapes. The full updated `types.ts`:

```ts
export type CalendarEventTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * One event to render on the Calendar.
 *
 * - `startsAt` is the local-time start instant. `endsAt` (optional) is the
 *   local-time end instant. For multi-day events, the bar extends from the
 *   start day through the end day inclusive; week boundaries split it into
 *   continuous bars with flattened edges.
 * - `allDay: true` renders a tone-filled band without a time prefix
 *   (birthdays, vacations). Default `false` renders a tone-tinted bar with
 *   a hour-formatted time prefix.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  tone?: CalendarEventTone;
  allDay?: boolean;
}

/** Calendar views. Month + week + day in v3. Agenda lands in PR 4. */
export type CalendarView = 'month' | 'week' | 'day';

/**
 * One placed event bar inside the month grid. Produced by
 * `layoutEventsForMonth` and consumed by `MonthView`.
 */
export interface EventBar {
  event: CalendarEvent;
  weekIndex: number;
  startCol: number;
  endCol: number;
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

/** Result of `layoutEventsForMonth`. */
export interface MonthLayout {
  bars: readonly EventBar[];
  hiddenCounts: ReadonlyMap<string, number>;
}

/**
 * One positioned timed-event block inside an `<HourGrid>` column.
 * Produced by `layoutEventsForHourGrid` and consumed by `WeekView`/`DayView`.
 */
export interface TimedEventBlock {
  event: CalendarEvent;
  /** 0..N-1 — column index within the rendered view (0 for DayView). */
  dayIndex: number;
  /** Minutes from `hourRange[0] * 60`. May be negative if the event started earlier. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`. May exceed `(hourRange[1] - hourRange[0]) * 60`. */
  endMinutes: number;
  /** 0..laneCount-1 — horizontal lane within the day's collision group. */
  lane: number;
  /** Number of lanes in this block's collision group; bar width = `100% / laneCount`. */
  laneCount: number;
}

/**
 * One bar in the AllDayBand. Multi-day events span columns; the bar is a
 * single visual element across `startCol..endCol`.
 */
export interface AllDayBar {
  event: CalendarEvent;
  startCol: number;
  endCol: number;
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

/** Result of `layoutEventsForHourGrid`. */
export interface HourGridLayout {
  timedBlocks: readonly TimedEventBlock[];
  allDayBars: readonly AllDayBar[];
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add packages/design-system/src/components/Calendar/types.ts
git commit -m "calendar/week-day: types — CalendarView 'week'/'day', TimedEventBlock, AllDayBar"
```

Expected typecheck: exit 0.

---

## Task 3: `layoutEventsForHourGrid` algorithm (TDD)

**Files:**

- Modify: `packages/design-system/src/components/Calendar/utils.ts` (add new function)
- Modify: `packages/design-system/src/components/Calendar/utils.test.tsx` (add new describe block)

- [ ] **Step 1: Append tests to `utils.test.tsx`**

Add these tests **inside** the existing test file, after the `describe('layoutEventsForMonth', ...)` block:

```tsx
import { layoutEventsForHourGrid } from './utils';

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
      startMinutes: 120, // (9 - 7) * 60
      endMinutes: 180,
      lane: 0,
      laneCount: 1,
    });
  });

  it('places two non-overlapping events on the same lane', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 10), tev('b', 20, 11, 12)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(2);
    expect(out.timedBlocks[0].lane).toBe(0);
    expect(out.timedBlocks[1].lane).toBe(0);
    // Same lane but different collision groups → laneCount 1 each
    expect(out.timedBlocks[0].laneCount).toBe(1);
    expect(out.timedBlocks[1].laneCount).toBe(1);
  });

  it('places two overlapping events on lanes 0 and 1, both laneCount=2', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 9, 11), tev('b', 20, 10, 12)], day1, [7, 19]);
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
    // A: 9-10:30, B: 10-11, C: 10:45-12 → all in one group
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
      startCol: 1, // Mon May 18 = column 1 in Sun-start week (May 17 = col 0)
      endCol: 5, // Fri May 22 = column 5
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
    expect(out.timedBlocks[0].dayIndex).toBe(3); // May 20 = col 3 in Sun-start week (17, 18, 19, 20)
  });

  it('keeps events starting before hourRange (negative startMinutes) so the renderer can clip', () => {
    const out = layoutEventsForHourGrid([tev('a', 20, 6, 8)], day1, [7, 19]);
    expect(out.timedBlocks).toHaveLength(1);
    expect(out.timedBlocks[0].startMinutes).toBe(-60); // 6am = -60 minutes from 7am
    expect(out.timedBlocks[0].endMinutes).toBe(60); // 8am = +60 minutes
  });
});
```

You'll need to add `import type { CalendarEvent } from './types';` at the top of the test file if it isn't already imported.

- [ ] **Step 2: Run, confirm fail**

```bash
cd packages/design-system && npx vitest run src/components/Calendar/utils.test.tsx
```

Expected: `layoutEventsForHourGrid is not a function` errors.

- [ ] **Step 3: Implement in `utils.ts`**

Append to `packages/design-system/src/components/Calendar/utils.ts`:

```ts
import { isSameMonth } from '../../calendar/dateMath';
// (keep existing imports — `startOfDay`, `toDateKey` are already imported)

interface DayRef {
  date: Date;
  key: string;
}

interface NormalizedTimed {
  event: CalendarEvent;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Lay out events for a Week or Day view's hour grid.
 *
 * - `allDay` events become bars in the AllDayBand (multi-day spans flatten
 *   edges, like the month bars).
 * - Timed events get positioned in their day column with greedy lane
 *   assignment; each block's `laneCount` equals the size of its transitive
 *   collision group (so siblings render at uniform width within the group).
 * - Events outside the day range are dropped; events partially outside the
 *   hour range keep their natural `startMinutes`/`endMinutes` (may be
 *   negative or past the range) so the renderer can clip visually.
 */
export function layoutEventsForHourGrid(
  events: readonly CalendarEvent[],
  days: readonly DayRef[],
  hourRange: readonly [number, number],
): HourGridLayout {
  if (events.length === 0 || days.length === 0) {
    return { timedBlocks: [], allDayBars: [] };
  }

  const viewStart = startOfDay(days[0].date).getTime();
  const viewEnd = startOfDay(days[days.length - 1].date).getTime() + MS_PER_DAY;
  const baseHourMinutes = hourRange[0] * 60;

  const timedNormalized: NormalizedTimed[] = [];
  const allDayInput: CalendarEvent[] = [];

  for (const ev of events) {
    const start = ev.startsAt;
    const end = ev.endsAt ?? ev.startsAt;
    // Drop events entirely outside the view's day range
    if (end.getTime() < viewStart || start.getTime() >= viewEnd) continue;
    if (ev.allDay === true) {
      allDayInput.push(ev);
      continue;
    }
    // Place timed event in its (clamped) start-day column
    const eventStartDay = startOfDay(start).getTime();
    const dayIndex = days.findIndex((d) => startOfDay(d.date).getTime() === eventStartDay);
    if (dayIndex === -1) continue; // multi-day timed events: only place on their start day (out of scope for v1)
    const startMinutes = start.getHours() * 60 + start.getMinutes() - baseHourMinutes;
    const endMinutes = end.getHours() * 60 + end.getMinutes() - baseHourMinutes;
    timedNormalized.push({ event: ev, dayIndex, startMinutes, endMinutes });
  }

  // Per-day lane assignment + collision-group laneCount
  const timedBlocks: TimedEventBlock[] = [];
  for (let d = 0; d < days.length; d++) {
    const dayEvents = timedNormalized
      .filter((n) => n.dayIndex === d)
      .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

    interface LaneState {
      endMinutes: number;
    }
    const lanes: LaneState[] = [];
    const placed: { ne: NormalizedTimed; lane: number }[] = [];

    for (const ne of dayEvents) {
      let assigned = -1;
      for (let l = 0; l < lanes.length; l++) {
        if (lanes[l].endMinutes <= ne.startMinutes) {
          assigned = l;
          lanes[l].endMinutes = ne.endMinutes;
          break;
        }
      }
      if (assigned === -1) {
        assigned = lanes.length;
        lanes.push({ endMinutes: ne.endMinutes });
      }
      placed.push({ ne, lane: assigned });
    }

    // Sweep into transitive collision groups; assign laneCount per group.
    interface Group {
      members: { ne: NormalizedTimed; lane: number }[];
      maxLane: number;
    }
    const groups: Group[] = [];
    let currentGroup: Group | null = null;
    let currentEndMax = -Infinity;
    const sortedByStart = [...placed].sort((a, b) => a.ne.startMinutes - b.ne.startMinutes);
    for (const p of sortedByStart) {
      if (p.ne.startMinutes >= currentEndMax) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { members: [p], maxLane: p.lane };
        currentEndMax = p.ne.endMinutes;
      } else {
        currentGroup!.members.push(p);
        currentGroup!.maxLane = Math.max(currentGroup!.maxLane, p.lane);
        currentEndMax = Math.max(currentEndMax, p.ne.endMinutes);
      }
    }
    if (currentGroup) groups.push(currentGroup);

    for (const g of groups) {
      const laneCount = g.maxLane + 1;
      for (const { ne, lane } of g.members) {
        timedBlocks.push({
          event: ne.event,
          dayIndex: ne.dayIndex,
          startMinutes: ne.startMinutes,
          endMinutes: ne.endMinutes,
          lane,
          laneCount,
        });
      }
    }
  }

  // All-day bars — same continuation-flag logic as the month bars, but over
  // the visible day range (not a 7-cell week).
  const allDayBars = layoutAllDayBars(allDayInput, days);

  return { timedBlocks, allDayBars };
}

function layoutAllDayBars(
  events: readonly CalendarEvent[],
  days: readonly DayRef[],
): readonly AllDayBar[] {
  if (events.length === 0) return [];
  const viewStartMs = startOfDay(days[0].date).getTime();
  const viewEndMs = startOfDay(days[days.length - 1].date).getTime();

  interface NormalizedAllDay {
    event: CalendarEvent;
    startMs: number;
    endMs: number;
    duration: number;
  }
  const normalized: NormalizedAllDay[] = [];
  for (const ev of events) {
    let startMs = startOfDay(ev.startsAt).getTime();
    let endMs = startOfDay(ev.endsAt ?? ev.startsAt).getTime();
    if (endMs < startMs) [startMs, endMs] = [endMs, startMs];
    if (endMs < viewStartMs || startMs > viewEndMs) continue;
    normalized.push({ event: ev, startMs, endMs, duration: (endMs - startMs) / MS_PER_DAY });
  }
  normalized.sort((a, b) => a.startMs - b.startMs || b.duration - a.duration);

  // Greedy lane assignment per bar (one lane per row of the band)
  interface LaneSegment {
    startCol: number;
    endCol: number;
  }
  const lanes: LaneSegment[][] = [];
  const bars: AllDayBar[] = [];

  for (const n of normalized) {
    const segStartMs = Math.max(n.startMs, viewStartMs);
    const segEndMs = Math.min(n.endMs, viewEndMs);
    const startCol = Math.round((segStartMs - viewStartMs) / MS_PER_DAY);
    const endCol = Math.round((segEndMs - viewStartMs) / MS_PER_DAY);

    let assigned = -1;
    for (let l = 0; l < lanes.length; l++) {
      const conflicts = lanes[l].some((s) => !(s.endCol < startCol || s.startCol > endCol));
      if (!conflicts) {
        assigned = l;
        break;
      }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push([]);
    }
    lanes[assigned].push({ startCol, endCol });

    bars.push({
      event: n.event,
      startCol,
      endCol,
      lane: assigned,
      continuesLeft: n.startMs < viewStartMs,
      continuesRight: n.endMs > viewEndMs,
    });
  }
  return bars;
}
```

You'll need to add `import type { AllDayBar, HourGridLayout, TimedEventBlock } from './types';` at the top of `utils.ts` if not already present (the existing imports cover `CalendarEvent`, `EventBar`, `MonthLayout`).

- [ ] **Step 4: Run tests, confirm pass**

```bash
cd packages/design-system && npx vitest run src/components/Calendar/utils.test.tsx
```

Expected: all tests in `utils.test.tsx` pass (existing month tests + new 12 hour-grid tests).

- [ ] **Step 5: Commit**

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/Calendar/utils.ts packages/design-system/src/components/Calendar/utils.test.tsx && git commit -m "calendar/week-day: layoutEventsForHourGrid — lane + collision-group laneCount"
```

---

## Task 4: `<HourGrid>`, `<TimedEvent>`, `<AllDayBand>` (internal components)

These are the foundational rendering pieces. They're tested indirectly through `WeekView.test.tsx` / `DayView.test.tsx`.

**Files:**

- Create: `packages/design-system/src/components/Calendar/HourGrid.tsx`
- Create: `packages/design-system/src/components/Calendar/HourGrid.module.scss`
- Create: `packages/design-system/src/components/Calendar/TimedEvent.tsx`
- Create: `packages/design-system/src/components/Calendar/TimedEvent.module.scss`
- Create: `packages/design-system/src/components/Calendar/AllDayBand.tsx`
- Create: `packages/design-system/src/components/Calendar/AllDayBand.module.scss`

- [ ] **Step 1: `TimedEvent.tsx`**

```tsx
import { useMemo, type MouseEvent } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatTime } from '../../calendar';
import { Tooltip } from '../Tooltip';
import type { CalendarEvent, CalendarEventTone, TimedEventBlock } from './types';
import styles from './TimedEvent.module.scss';

export interface TimedEventProps {
  /** The placed block produced by `layoutEventsForHourGrid`. */
  block: TimedEventBlock;
  /** Pixel height per hour row. */
  hourRowHeight: number;
  onClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: a single timed-event block, absolutely positioned inside an
 * hour-grid day column. Tone-styled, wrapped in a Tooltip so the full
 * "time range + title" is reachable.
 */
export function TimedEvent({ block, hourRowHeight, onClick }: TimedEventProps) {
  const locale = useLocale();
  const tone: CalendarEventTone = block.event.tone ?? 'neutral';

  const top = (block.startMinutes / 60) * hourRowHeight;
  const height = ((block.endMinutes - block.startMinutes) / 60) * hourRowHeight;
  const width = `${100 / block.laneCount}%`;
  const left = `${(100 / block.laneCount) * block.lane}%`;

  const timeLabel = useMemo(
    () =>
      `${formatTime(block.event.startsAt, locale)} – ${formatTime(block.event.endsAt ?? block.event.startsAt, locale)}`,
    [block.event.startsAt, block.event.endsAt, locale],
  );

  const tooltipContent = (
    <span className={styles.tooltipBody}>
      <span className={styles.tooltipTime}>{timeLabel}</span>
      <span className={styles.tooltipTitle}>{block.event.title}</span>
    </span>
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(block.event);
  };

  // For short events (<30 min visible height), only show the title.
  const isShort = height < 30;

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        className={clsx(styles.block, styles[tone])}
        style={{ top, height, width, left }}
        onClick={handleClick}
      >
        {!isShort && <span className={styles.time}>{timeLabel}</span>}
        <span className={styles.title}>{block.event.title}</span>
      </button>
    </Tooltip>
  );
}
```

- [ ] **Step 2: `TimedEvent.module.scss`**

```scss
@use '../../styles/mixins' as *;

.block {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition:
    filter var(--transition-fast),
    background var(--transition-fast);

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  opacity: var(--opacity-muted);
  flex-shrink: 0;
}

.title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tooltipBody {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tooltipTime {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-bg-subtle);
}

.tooltipTitle {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-bg);
}

.neutral {
  background: var(--color-bg-subtle);
  color: var(--color-fg);
}

.accent {
  background: var(--color-accent-bg-subtle);
  color: var(--color-accent);
}

.success {
  background: var(--color-success-bg-subtle);
  color: var(--color-success);
}

.warning {
  background: var(--color-warning-bg-subtle);
  color: var(--color-warning);
}

.danger {
  background: var(--color-danger-bg-subtle);
  color: var(--color-danger);
}
```

- [ ] **Step 3: `AllDayBand.tsx`**

```tsx
import clsx from 'clsx';
import { EventChip } from './EventChip';
import type { AllDayBar, CalendarEvent } from './types';
import styles from './AllDayBand.module.scss';

export interface AllDayBandProps {
  /** Bars produced by `layoutEventsForHourGrid`. */
  bars: readonly AllDayBar[];
  /** Number of day columns the band spans (1 or 7). */
  columnCount: number;
  /** Pixel width of the hour-gutter on the left (so the band aligns with the hour grid below). */
  gutterWidth: number;
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: the all-day event band above the hour grid. Multi-day events
 * render as continuous bars across day columns; the gutter on the left is
 * empty (matches the hour-grid's gutter so columns line up).
 */
export function AllDayBand({ bars, columnCount, gutterWidth, onEventClick }: AllDayBandProps) {
  if (bars.length === 0) return null;
  const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), 0);

  return (
    <div
      className={styles.band}
      style={{
        gridTemplateColumns: `${gutterWidth}px repeat(${columnCount}, 1fr)`,
      }}
    >
      {/* Empty gutter cell */}
      <div className={styles.gutter} />
      {/* Bars are positioned via grid-column inside the body */}
      <div
        className={styles.body}
        style={{
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gridTemplateRows: `repeat(${maxLane + 1}, auto)`,
        }}
      >
        {bars.map((bar) => (
          <div
            key={bar.event.id}
            className={clsx(
              styles.barSlot,
              bar.continuesLeft && styles.continuesLeft,
              bar.continuesRight && styles.continuesRight,
            )}
            style={{
              gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
              gridRow: bar.lane + 1,
            }}
          >
            <EventChip
              event={bar.event}
              continuesLeft={bar.continuesLeft}
              continuesRight={bar.continuesRight}
              onClick={(ev) => onEventClick?.(ev)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `AllDayBand.module.scss`**

```scss
.band {
  display: grid;
  border-bottom: var(--border-width) solid var(--color-border);
  background: var(--color-bg);
}

.gutter {
  border-right: var(--border-width) solid var(--color-border);
}

.body {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-1);
  align-items: start;
}

.barSlot {
  min-width: 0;
}

.continuesLeft,
.continuesRight {
  // Visual cues on the chip itself; nothing to do at the wrapper level
}
```

- [ ] **Step 5: `HourGrid.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatHour } from '../../calendar';
import { isSameDay } from '../../calendar/dateMath';
import { TimedEvent } from './TimedEvent';
import type { CalendarEvent, TimedEventBlock } from './types';
import styles from './HourGrid.module.scss';

/** Default gutter width in pixels. */
export const HOUR_GUTTER_WIDTH = 60;

export interface HourGridProps {
  /** One date per column (1 for DayView, 7 for WeekView). */
  days: readonly { date: Date; key: string; isWeekend?: boolean }[];
  /** Localized column header content (one per day). */
  columnHeaders: readonly ReactNode[];
  /** Inclusive start, exclusive end. */
  hourRange: readonly [number, number];
  /** Pixel height per hour row. */
  hourRowHeight: number;
  /** Timed events positioned within columns. */
  timedBlocks: readonly TimedEventBlock[];
  /** Today's date (injected for testability). Defaults to `new Date()`. */
  now?: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: hour-grid scaffold for Week and Day views. Renders the column
 * headers, hour gutter labels, the column bodies (with timed events
 * positioned absolutely inside), and a horizontal "now" line in today's
 * column when today is in the rendered range.
 */
export function HourGrid({
  days,
  columnHeaders,
  hourRange,
  hourRowHeight,
  timedBlocks,
  now,
  onEventClick,
}: HourGridProps) {
  const locale = useLocale();
  const [tick, setTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-render every minute so the "now" line moves.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const currentTime = now ?? new Date();
  // Suppress unused-variable warning when `tick` is only there to invalidate memos
  void tick;

  const hourLabels = useMemo(() => {
    const labels: string[] = [];
    for (let h = hourRange[0]; h < hourRange[1]; h++) {
      labels.push(formatHour(h, locale));
    }
    return labels;
  }, [hourRange, locale]);

  const columnCount = days.length;
  const blocksByDay = useMemo(() => {
    const m = new Map<number, TimedEventBlock[]>();
    for (const b of timedBlocks) {
      const list = m.get(b.dayIndex) ?? [];
      list.push(b);
      m.set(b.dayIndex, list);
    }
    return m;
  }, [timedBlocks]);

  const totalHours = hourRange[1] - hourRange[0];
  const nowMinutesFromStart =
    (currentTime.getHours() - hourRange[0]) * 60 + currentTime.getMinutes();
  const nowVisible = nowMinutesFromStart >= 0 && nowMinutesFromStart <= totalHours * 60;
  const todayColumnIndex = days.findIndex((d) => isSameDay(d.date, currentTime));

  return (
    <div ref={containerRef} className={styles.scroll}>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `${HOUR_GUTTER_WIDTH}px repeat(${columnCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${totalHours}, ${hourRowHeight}px)`,
        }}
      >
        {/* Top-left corner cell */}
        <div className={styles.cornerCell} aria-hidden="true" />
        {/* Column headers */}
        {columnHeaders.map((header, i) => (
          <div
            key={`header-${days[i].key}`}
            role="columnheader"
            className={clsx(
              styles.columnHeader,
              days[i].isWeekend && styles.weekendHeader,
              todayColumnIndex === i && styles.todayHeader,
            )}
          >
            {header}
          </div>
        ))}
        {/* Hour gutter labels */}
        {hourLabels.map((label, h) => (
          <div
            key={`hour-${h}`}
            className={styles.hourLabel}
            style={{ gridColumn: 1, gridRow: h + 2 }}
          >
            {label}
          </div>
        ))}
        {/* Day columns (one per day) — each is `position: relative` so
            TimedEvent blocks position absolutely inside. */}
        {days.map((day, i) => {
          const blocks = blocksByDay.get(i) ?? [];
          return (
            <div
              key={day.key}
              className={clsx(
                styles.dayColumn,
                day.isWeekend && styles.weekendColumn,
                todayColumnIndex === i && styles.todayColumn,
              )}
              style={{ gridColumn: i + 2, gridRow: `2 / span ${totalHours}` }}
            >
              {/* Hour-row separators */}
              {Array.from({ length: totalHours }).map((_, h) => (
                <div
                  key={`sep-${h}`}
                  className={styles.hourSeparator}
                  style={{ top: h * hourRowHeight }}
                  aria-hidden="true"
                />
              ))}
              {/* Now line */}
              {nowVisible && todayColumnIndex === i && (
                <div
                  className={styles.nowLine}
                  style={{ top: (nowMinutesFromStart / 60) * hourRowHeight }}
                  aria-hidden="true"
                />
              )}
              {/* Timed event blocks */}
              {blocks.map((b) => (
                <TimedEvent
                  key={b.event.id}
                  block={b}
                  hourRowHeight={hourRowHeight}
                  onClick={onEventClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `HourGrid.module.scss`**

```scss
.scroll {
  overflow: auto;
  max-height: 70vh;
}

.grid {
  display: grid;
  background: var(--color-bg);
  position: relative;
}

.cornerCell {
  border-right: var(--border-width) solid var(--color-border);
  border-bottom: var(--border-width) solid var(--color-border);
  background: var(--color-bg-subtle);
}

.columnHeader {
  padding: var(--space-2);
  background: var(--color-bg-subtle);
  border-right: var(--border-width) solid var(--color-border);
  border-bottom: var(--border-width) solid var(--color-border);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
  text-align: center;
}

.weekendHeader {
  background: var(--color-bg-muted);
}

.todayHeader {
  background: var(--color-accent-bg-subtle);
  color: var(--color-accent);
}

.hourLabel {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-fg-muted);
  text-align: right;
  border-right: var(--border-width) solid var(--color-border);
  border-bottom: var(--border-width) solid var(--color-border);
  background: var(--color-bg-subtle);
}

.dayColumn {
  position: relative;
  border-right: var(--border-width) solid var(--color-border);
}

.weekendColumn {
  background: var(--color-bg-muted);
}

.todayColumn {
  background: var(--color-accent-bg-subtle);
}

.hourSeparator {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--border-width);
  background: var(--color-border);
}

.nowLine {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-danger);
  z-index: 1;
}
```

- [ ] **Step 7: Token availability check**

```bash
grep -E "color-fg-muted|color-bg-muted|opacity-muted|color-accent-bg-subtle" packages/design-system/src/styles/tokens.scss
```

If any are missing, add them (they should already exist from PR 2's tone work — verify all four).

- [ ] **Step 8: Lint + typecheck**

```bash
npm run lint:css && npm run typecheck
```

Both exit 0.

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/Calendar/TimedEvent.tsx packages/design-system/src/components/Calendar/TimedEvent.module.scss packages/design-system/src/components/Calendar/AllDayBand.tsx packages/design-system/src/components/Calendar/AllDayBand.module.scss packages/design-system/src/components/Calendar/HourGrid.tsx packages/design-system/src/components/Calendar/HourGrid.module.scss
git commit -m "calendar/week-day: HourGrid + TimedEvent + AllDayBand primitives"
```

---

## Task 5: `<WeekView>` + `<DayView>` + tests

**Files:**

- Create: `packages/design-system/src/components/Calendar/WeekView.tsx`
- Create: `packages/design-system/src/components/Calendar/WeekView.module.scss`
- Create: `packages/design-system/src/components/Calendar/WeekView.test.tsx`
- Create: `packages/design-system/src/components/Calendar/DayView.tsx`
- Create: `packages/design-system/src/components/Calendar/DayView.module.scss`
- Create: `packages/design-system/src/components/Calendar/DayView.test.tsx`

- [ ] **Step 1: `WeekView.tsx`**

```tsx
import { useMemo } from 'react';
import { useWeek } from '../../calendar/useWeek';
import { useLocale } from '../../i18n/useLocale';
import { formatWeekdayShort } from '../../calendar/formatters';
import { AllDayBand } from './AllDayBand';
import { HourGrid, HOUR_GUTTER_WIDTH } from './HourGrid';
import { layoutEventsForHourGrid } from './utils';
import type { CalendarEvent } from './types';
import styles from './WeekView.module.scss';

export interface WeekViewProps {
  cursor: Date;
  events: readonly CalendarEvent[];
  hourRange: readonly [number, number];
  hourRowHeight: number;
  locale?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: 7-day hour grid. Shows the week containing `cursor`, with an
 * AllDayBand above and an HourGrid below.
 */
export function WeekView({
  cursor,
  events,
  hourRange,
  hourRowHeight,
  locale: localeOverride,
  weekStartsOn,
  onEventClick,
}: WeekViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const week = useWeek(cursor, { locale, weekStartsOn });

  const layout = useMemo(
    () =>
      layoutEventsForHourGrid(
        events,
        week.days.map((d) => ({ date: d.date, key: d.key })),
        hourRange,
      ),
    [events, week.days, hourRange],
  );

  const headers = week.days.map((d) => (
    <span>
      {formatWeekdayShort(d.date, locale)} <strong>{d.dayOfMonth}</strong>
    </span>
  ));

  const dayRefs = week.days.map((d) => ({
    date: d.date,
    key: d.key,
    isWeekend: d.isWeekend,
  }));

  return (
    <div className={styles.weekView}>
      <AllDayBand
        bars={layout.allDayBars}
        columnCount={7}
        gutterWidth={HOUR_GUTTER_WIDTH}
        onEventClick={onEventClick}
      />
      <HourGrid
        days={dayRefs}
        columnHeaders={headers}
        hourRange={hourRange}
        hourRowHeight={hourRowHeight}
        timedBlocks={layout.timedBlocks}
        onEventClick={onEventClick}
      />
    </div>
  );
}
```

- [ ] **Step 2: `WeekView.module.scss`**

```scss
.weekView {
  display: flex;
  flex-direction: column;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg);
}
```

- [ ] **Step 3: `DayView.tsx`**

```tsx
import { useMemo } from 'react';
import { useDay } from '../../calendar/useDay';
import { useLocale } from '../../i18n/useLocale';
import { AllDayBand } from './AllDayBand';
import { HourGrid, HOUR_GUTTER_WIDTH } from './HourGrid';
import { layoutEventsForHourGrid } from './utils';
import type { CalendarEvent } from './types';
import styles from './DayView.module.scss';

export interface DayViewProps {
  cursor: Date;
  events: readonly CalendarEvent[];
  hourRange: readonly [number, number];
  hourRowHeight: number;
  locale?: string;
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: single-day hour grid. Shows the day at `cursor` with an
 * AllDayBand above and an HourGrid below.
 */
export function DayView({
  cursor,
  events,
  hourRange,
  hourRowHeight,
  locale: localeOverride,
  onEventClick,
}: DayViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const day = useDay(cursor, { locale });

  const layout = useMemo(
    () => layoutEventsForHourGrid(events, [{ date: day.day.date, key: day.day.key }], hourRange),
    [events, day.day.date, day.day.key, hourRange],
  );

  const dayRefs = [
    {
      date: day.day.date,
      key: day.day.key,
      isWeekend: day.day.isWeekend,
    },
  ];

  return (
    <div className={styles.dayView}>
      <AllDayBand
        bars={layout.allDayBars}
        columnCount={1}
        gutterWidth={HOUR_GUTTER_WIDTH}
        onEventClick={onEventClick}
      />
      <HourGrid
        days={dayRefs}
        columnHeaders={[<span>{day.dayLabel}</span>]}
        hourRange={hourRange}
        hourRowHeight={hourRowHeight}
        timedBlocks={layout.timedBlocks}
        onEventClick={onEventClick}
      />
    </div>
  );
}
```

- [ ] **Step 4: `DayView.module.scss`**

```scss
.dayView {
  display: flex;
  flex-direction: column;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg);
}
```

- [ ] **Step 5: `WeekView.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { WeekView } from './WeekView';
import type { CalendarEvent } from './types';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('WeekView', () => {
  const cursor = new Date(2026, 4, 20); // Wed May 20

  it('renders 7 column headers', () => {
    render(<WeekView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getAllByRole('columnheader').length).toBe(7);
  });

  it('renders 12 hour labels for the default 7–19 range', () => {
    const { container } = render(
      <WeekView cursor={cursor} events={[]} hourRange={[7, 19]} hourRowHeight={48} />,
      { wrapper: wrap() },
    );
    // Hour labels live in the gutter; count entries with the hourLabel class
    expect(container.querySelectorAll('[class*="hourLabel"]').length).toBe(12);
  });

  it('renders a timed event block', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(<WeekView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('button', { name: /Standup/ })).toBeInTheDocument();
  });

  it('fires onEventClick when a timed event is clicked', async () => {
    const onEventClick = vi.fn();
    const user = userEvent.setup();
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10),
      },
    ];
    render(
      <WeekView
        cursor={cursor}
        events={events}
        hourRange={[7, 19]}
        hourRowHeight={48}
        onEventClick={onEventClick}
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: /Standup/ }));
    expect(onEventClick).toHaveBeenCalledWith(events[0]);
  });

  it('renders an allDay event in the AllDayBand', () => {
    const events: CalendarEvent[] = [
      {
        id: 'conf',
        title: 'Conference',
        startsAt: new Date(2026, 4, 18),
        endsAt: new Date(2026, 4, 22),
        allDay: true,
      },
    ];
    render(<WeekView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('button', { name: /Conference/ })).toBeInTheDocument();
  });

  it('respects custom hourRange', () => {
    const { container } = render(
      <WeekView cursor={cursor} events={[]} hourRange={[9, 17]} hourRowHeight={48} />,
      { wrapper: wrap() },
    );
    expect(container.querySelectorAll('[class*="hourLabel"]').length).toBe(8);
  });

  it('places overlapping events side-by-side (each laneCount = 2)', () => {
    const events: CalendarEvent[] = [
      {
        id: 'a',
        title: 'Standup',
        startsAt: new Date(2026, 4, 20, 9),
        endsAt: new Date(2026, 4, 20, 10, 30),
      },
      {
        id: 'b',
        title: '1:1',
        startsAt: new Date(2026, 4, 20, 10),
        endsAt: new Date(2026, 4, 20, 11),
      },
    ];
    render(<WeekView cursor={cursor} events={events} hourRange={[7, 19]} hourRowHeight={48} />, {
      wrapper: wrap(),
    });
    const a = screen.getByRole('button', { name: /Standup/ });
    const b = screen.getByRole('button', { name: /1:1/ });
    expect(a).toHaveStyle({ width: '50%' });
    expect(b).toHaveStyle({ width: '50%' });
  });

  it('uses locale-aware column headers (ru-RU has Cyrillic)', () => {
    render(
      <WeekView
        cursor={cursor}
        events={[]}
        hourRange={[7, 19]}
        hourRowHeight={48}
        locale="ru-RU"
      />,
      { wrapper: wrap('ru-RU') },
    );
    const headers = screen.getAllByRole('columnheader');
    const text = headers.map((h) => h.textContent ?? '').join(' ');
    expect(text).toMatch(/[Ѐ-ӿ]/);
  });
});
```

- [ ] **Step 6: `DayView.test.tsx`**

```tsx
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
```

- [ ] **Step 7: Run tests + gates**

```bash
cd packages/design-system && npx vitest run src/components/Calendar/
cd /home/dpws/projects/design-system && npm run typecheck && npm run lint:css
```

All exit 0.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/Calendar/WeekView.tsx packages/design-system/src/components/Calendar/WeekView.module.scss packages/design-system/src/components/Calendar/WeekView.test.tsx packages/design-system/src/components/Calendar/DayView.tsx packages/design-system/src/components/Calendar/DayView.module.scss packages/design-system/src/components/Calendar/DayView.test.tsx
git commit -m "calendar/week-day: WeekView + DayView composing HourGrid"
```

---

## Task 6: `<ViewSwitcher>` + Calendar shell wiring

**Files:**

- Create: `packages/design-system/src/components/Calendar/ViewSwitcher.tsx`
- Create: `packages/design-system/src/components/Calendar/ViewSwitcher.module.scss`
- Modify: `packages/design-system/src/components/Calendar/Calendar.tsx`
- Modify: `packages/design-system/src/components/Calendar/Calendar.test.tsx`

- [ ] **Step 1: `ViewSwitcher.tsx`**

A small segmented control using the Tabs component. (If Tabs styling doesn't fit visually after the demo, we can swap to a custom Cluster of Buttons.)

```tsx
import { Tabs } from '../Tabs';
import type { CalendarView } from './types';
import styles from './ViewSwitcher.module.scss';

export interface ViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  monthLabel: string;
  weekLabel: string;
  dayLabel: string;
}

/**
 * Internal: segmented control for switching between month/week/day views.
 * Uses the design system's `<Tabs>` for keyboard nav + ARIA.
 */
export function ViewSwitcher({
  view,
  onViewChange,
  monthLabel,
  weekLabel,
  dayLabel,
}: ViewSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <Tabs
        value={view}
        onValueChange={(v) => onViewChange(v as CalendarView)}
        items={[
          { value: 'month', label: monthLabel },
          { value: 'week', label: weekLabel },
          { value: 'day', label: dayLabel },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: `ViewSwitcher.module.scss`**

```scss
.switcher {
  display: flex;
}
```

- [ ] **Step 3: Update `Calendar.tsx`**

The full updated `Calendar.tsx`:

```tsx
import { forwardRef, useCallback, useState, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { addMonths } from '../../calendar/dateMath';
import { useMonth } from '../../calendar/useMonth';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { ViewSwitcher } from './ViewSwitcher';
import type { CalendarEvent, CalendarView } from './types';
import styles from './Calendar.module.scss';

/**
 * UI strings consumed by `<Calendar>`.
 */
export interface CalendarLabels {
  today?: string;
  previousMonth?: string;
  nextMonth?: string;
  moreEvents?: (count: number) => string;
  viewMonth?: string;
  viewWeek?: string;
  viewDay?: string;
}

export interface CalendarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  events?: readonly CalendarEvent[];
  /** Active view (controlled). Pair with `onViewChange`. */
  view?: CalendarView;
  /** Initial view (uncontrolled). Defaults to `'month'`. */
  defaultView?: CalendarView;
  /** Fires when the user clicks the view switcher. */
  onViewChange?: (view: CalendarView) => void;

  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date) => void;

  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;

  locale?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  maxLanesPerWeek?: number;

  /** Hour range for week/day views (inclusive start, exclusive end). Default `[7, 19]`. */
  hourRange?: [number, number];
  /** Pixel height per hour row in week/day views. Default 48. */
  hourRowHeight?: number;

  labels?: CalendarLabels;
}

const DEFAULT_LABELS: Required<CalendarLabels> = {
  today: 'Today',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  moreEvents: (n) => `${n} more events`,
  viewMonth: 'Month',
  viewWeek: 'Week',
  viewDay: 'Day',
};

/**
 * Month / Week / Day calendar.
 *
 * - Controlled via `value` / `onChange`, or uncontrolled via `defaultValue`.
 * - View is controlled via `view` / `onViewChange`, or uncontrolled via
 *   `defaultView`.
 * - Events are `CalendarEvent` objects; multi-day events render as
 *   continuous bars in both month and week/day all-day bands.
 *
 * @example
 * <Calendar events={events} defaultView="week" />
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    events = [],
    view: viewProp,
    defaultView,
    onViewChange,
    value,
    defaultValue,
    onChange,
    onDayClick,
    onEventClick,
    locale,
    weekStartsOn,
    maxLanesPerWeek = 3,
    hourRange = [7, 19],
    hourRowHeight = 48,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState<Date>(() => defaultValue ?? new Date());
  const cursor = value ?? uncontrolled;
  const [uncontrolledView, setUncontrolledView] = useState<CalendarView>(
    () => defaultView ?? 'month',
  );
  const view = viewProp ?? uncontrolledView;
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

  const handleChange = useCallback(
    (next: Date) => {
      if (value === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [value, onChange],
  );

  const handleViewChange = useCallback(
    (next: CalendarView) => {
      if (viewProp === undefined) setUncontrolledView(next);
      onViewChange?.(next);
    },
    [viewProp, onViewChange],
  );

  const grid = useMonth(cursor, { locale, weekStartsOn });

  const goPrev = () => handleChange(addMonths(cursor, -1));
  const goNext = () => handleChange(addMonths(cursor, 1));
  const goToday = () => handleChange(new Date());

  const body: ReactNode = (
    <div ref={ref} className={clsx(styles.calendar, className)} {...rest}>
      <header className={styles.header}>
        <h2 className={styles.title}>{grid.monthLabel}</h2>
        <Cluster gap="sm" align="center">
          <Cluster gap="xs" align="center">
            <Button
              size="xs"
              variant="ghost"
              iconOnly
              aria-label={resolvedLabels.previousMonth}
              onClick={goPrev}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button size="sm" variant="secondary" onClick={goToday}>
              {resolvedLabels.today}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              iconOnly
              aria-label={resolvedLabels.nextMonth}
              onClick={goNext}
            >
              <ChevronRight size={14} />
            </Button>
          </Cluster>
          <ViewSwitcher
            view={view}
            onViewChange={handleViewChange}
            monthLabel={resolvedLabels.viewMonth}
            weekLabel={resolvedLabels.viewWeek}
            dayLabel={resolvedLabels.viewDay}
          />
        </Cluster>
      </header>
      {view === 'month' && (
        <MonthView
          grid={grid}
          events={events}
          maxLanesPerWeek={maxLanesPerWeek}
          cursor={cursor}
          onChange={handleChange}
          onDayClick={onDayClick}
          onEventClick={onEventClick}
          moreEventsLabel={resolvedLabels.moreEvents}
        />
      )}
      {view === 'week' && (
        <WeekView
          cursor={cursor}
          events={events}
          hourRange={hourRange}
          hourRowHeight={hourRowHeight}
          locale={locale}
          weekStartsOn={weekStartsOn}
          onEventClick={onEventClick}
        />
      )}
      {view === 'day' && (
        <DayView
          cursor={cursor}
          events={events}
          hourRange={hourRange}
          hourRowHeight={hourRowHeight}
          locale={locale}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );

  return locale !== undefined ? <LocaleProvider locale={locale}>{body}</LocaleProvider> : body;
});
```

- [ ] **Step 4: Add view-switching tests to `Calendar.test.tsx`**

Append before the closing `});` of the existing `describe('Calendar', ...)` block:

```tsx
it('switches to WeekView when defaultView="week"', () => {
  render(<Calendar defaultValue={new Date(2026, 4, 20)} defaultView="week" />, { wrapper: wrap() });
  // Week view has a HourGrid; look for hour labels
  const hourLabels = document.querySelectorAll('[class*="hourLabel"]');
  expect(hourLabels.length).toBeGreaterThan(0);
});

it('switches to DayView when defaultView="day"', () => {
  render(<Calendar defaultValue={new Date(2026, 4, 20)} defaultView="day" />, { wrapper: wrap() });
  expect(document.querySelectorAll('[role="columnheader"]').length).toBe(1);
});

it('controlled view: clicking Week tab fires onViewChange', async () => {
  const user = userEvent.setup();
  const onViewChange = vi.fn();
  render(
    <Calendar
      defaultValue={new Date(2026, 4, 20)}
      view="month"
      onViewChange={onViewChange}
      labels={{ viewMonth: 'Month', viewWeek: 'Week', viewDay: 'Day' }}
    />,
    { wrapper: wrap() },
  );
  await user.click(screen.getByRole('tab', { name: 'Week' }));
  expect(onViewChange).toHaveBeenCalledWith('week');
});
```

- [ ] **Step 5: Run tests + gates**

```bash
cd packages/design-system && npx vitest run src/components/Calendar/
cd /home/dpws/projects/design-system && npm run typecheck && npm run lint:css
```

All exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/Calendar/ViewSwitcher.tsx packages/design-system/src/components/Calendar/ViewSwitcher.module.scss packages/design-system/src/components/Calendar/Calendar.tsx packages/design-system/src/components/Calendar/Calendar.test.tsx
git commit -m "calendar/week-day: ViewSwitcher + Calendar shell view dispatch"
```

---

## Task 7: AGENTS.md update

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Update the Calendar TL;DR section**

Find the existing `### <Calendar>` block (it's just before `### Calendar primitives`). Replace it with:

````markdown
### `<Calendar>` — month / week / day views

```tsx
const [cursor, setCursor] = useState(new Date());
const [view, setView] = useState<'month' | 'week' | 'day'>('month');
<Calendar
  value={cursor}
  onChange={setCursor}
  view={view}
  onViewChange={setView}
  events={events}
  onEventClick={(e) => openDetail(e)}
/>;
```

- Three views in v3: `'month'` (continuous event bars across the grid),
  `'week'` (7 columns × hour rows + all-day band), `'day'` (single column).
  Agenda view comes in PR 4.
- Events are `{ id, title, startsAt, endsAt?, tone?, allDay? }`.
- Tones: `neutral` (default) / `accent` / `success` / `warning` / `danger`.
- View is controlled via `view`/`onViewChange` or uncontrolled via `defaultView`.
- `hourRange` (default `[7, 19]`) controls week/day visible hour range.
  Hours outside the range stay scroll-reachable.
- `hourRowHeight` (default 48) controls the pixel height of each hour row.
- Overlapping timed events split into equal-width lanes side-by-side.
- All-day & multi-day events render in the band above the hour grid.
- A horizontal "now" line marks the current time in today's column.
- Read-mostly: `onDayClick` and `onEventClick` callbacks; consumers wire
  their own detail UI.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings
  (`today`, `viewMonth`, etc.) are the consumer's responsibility via
  `labels`.
````

- [ ] **Step 2: Verify formatting + commit**

```bash
npx prettier --check packages/design-system/AGENTS.md
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document Calendar week + day views"
```

---

## Task 8: Playground demo update

**Files:**

- Modify: `packages/playground/src/pages/components/CalendarDemo.tsx`

- [ ] **Step 1: Add Week + Day examples**

Find the existing `<Example title="Controlled navigation">` block. Just before it, insert two new Examples:

```tsx
      <Example
        title="Week view"
        description="7 columns × hour rows. Timed events position by hour; overlapping events split into equal-width lanes side-by-side. All-day and multi-day events render in the band above the hour grid."
        code={`<Calendar
  defaultValue={new Date()}
  defaultView="week"
  events={SAMPLE_EVENTS}
/>`}
      >
        <Calendar defaultValue={TODAY} defaultView="week" events={SAMPLE_EVENTS} />
      </Example>

      <Example
        title="Day view"
        description="Single-day hour grid. Useful for focused day planning. Custom hourRange shrinks the visible range to business hours."
        code={`<Calendar
  defaultValue={new Date()}
  defaultView="day"
  events={SAMPLE_EVENTS}
  hourRange={[8, 18]}
/>`}
      >
        <Calendar
          defaultValue={TODAY}
          defaultView="day"
          events={SAMPLE_EVENTS}
          hourRange={[8, 18]}
        />
      </Example>

      <Example
        title="View switching (controlled)"
        description="Consumer owns the view state. Useful for URL-sync of the current view."
        code={`function ViewSwitcherDemo() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  return (
    <Calendar
      defaultValue={new Date()}
      view={view}
      onViewChange={setView}
      events={SAMPLE_EVENTS}
    />
  );
}`}
      >
        <ViewSwitcherDemo />
      </Example>
```

- [ ] **Step 2: Add the `ViewSwitcherDemo` helper component**

Just below `ControlledCalendarDemo` (in the file's helper-components area), add:

```tsx
function ViewSwitcherDemo() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  return (
    <Calendar defaultValue={TODAY} view={view} onViewChange={setView} events={SAMPLE_EVENTS} />
  );
}
```

- [ ] **Step 3: Update the ru-RU example to include view labels**

Find the existing `<Example title="ru-RU locale">` block. Update the `labels` prop in BOTH the `code={`...`}` snippet and the live `<Calendar>` to include the view labels:

```tsx
labels={{
  today: 'Сегодня',
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  moreEvents: (n) => `ещё ${n} событий`,
  viewMonth: 'Месяц',
  viewWeek: 'Неделя',
  viewDay: 'День',
}}
```

For the code-snippet version (with template-literal escaping), use the existing template-literal-escape pattern (`\`ещё ${'${n}'} событий\``).

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add packages/playground/src/pages/components/CalendarDemo.tsx
git commit -m "playground: CalendarDemo — week, day, and view-switcher examples"
```

---

## Task 9: Run all quality gates

**Files:** (verification only)

- [ ] **Step 1: Tests**

```bash
npm test
```

Expected: all suites pass. Test count up significantly from the PR 2 baseline (587).

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Exit 0.

- [ ] **Step 3: Stylelint**

```bash
npm run lint:css
```

Exit 0.

- [ ] **Step 4: Build**

```bash
npm run build
```

Exit 0 (warnings about chunk size are pre-existing).

- [ ] **Step 5: Tarball**

```bash
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "(test|Calendar/|i18n|calendar)" | head -30
```

Verify: new Calendar source files (HourGrid, WeekView, etc.) included; no `*.test.*` in the tarball.

If any gate fails, fix and re-run before Task 10.

---

## Task 10: Hard Rule 8 review-fix cycle

- [ ] **Step 1: Spawn a fresh-context reviewer** (general-purpose, opus). Brief on the 10 review categories; explicitly mention:
  - The `layoutEventsForHourGrid` algorithm (lane assignment + collision-group laneCount)
  - `position: absolute` use on TimedEvent (allowed via relative-anchor exception in Rule 4)
  - View dispatch in Calendar shell
  - Locale propagation via the existing `<LocaleProvider>` wrap

- [ ] **Step 2: Fix every Critical and Important finding.** Focused commits per finding; document explicit skips.

- [ ] **Step 3: Re-run gates.**

- [ ] **Step 4: Re-spawn reviewer until verdict is `clean enough to stop`.**

---

## Task 11: Push, open PR, watch CI

- [ ] **Step 1: Push**

```bash
git push -u origin feat/calendar-week-day-views
```

Pre-push hook runs prettier/stylelint/typecheck.

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "Calendar PR 3: Week + Day views with hour grid" --body "$(cat <<'EOF'
## Summary

- New `<WeekView>` (7 columns × hour rows) and `<DayView>` (1 column × hour rows).
- Shared `<HourGrid>` primitive — CSS grid scaffold with hour labels, day columns, and a "now" line on today's column.
- `<TimedEvent>` blocks position absolutely inside their day column with collision-group lane width.
- `<AllDayBand>` renders multi-day and `allDay` events above the hour grid with continuation flags.
- `<ViewSwitcher>` segmented control wired to the Calendar shell.
- `layoutEventsForHourGrid` in `utils.ts` — greedy lane assignment + sweep-based collision-group `laneCount`.
- `CalendarView` extended to `'month' | 'week' | 'day'`.
- New props on `<Calendar>`: `view`, `defaultView`, `onViewChange`, `hourRange` (default `[7, 19]`), `hourRowHeight` (default 48). `CalendarLabels` gains `viewMonth/viewWeek/viewDay`.

## Test plan

- [ ] CI \`Quality / check\` green
- [ ] \`npm test\` — all suites pass
- [ ] \`npm run typecheck\` — clean
- [ ] \`npm run lint:css\` — clean
- [ ] \`npm run build\` — clean
- [ ] \`npm pack --dry-run -w @eocrm/design-system\` — Calendar source included; no test files
- [ ] Hard Rule 8 review-fix cycle reached \`clean enough to stop\`
- [ ] Visual check at \`/components/calendar\` — week + day + switcher examples render correctly; overlapping events split into lanes; now line appears in today's column; ru-RU labels show Cyrillic.

## Non-goals (deferred)

- Agenda view — PR 4.
- DatePicker — separate PR.
- Drag-create / drag-reschedule.
- Time zones.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Watch CI**

```bash
gh pr checks --watch
```

- [ ] **Step 4: Report PR URL.**

---

## Self-review

**Spec coverage:**

- `CalendarView` union → Task 2
- `TimedEventBlock` / `AllDayBar` / `HourGridLayout` types → Task 2
- `layoutEventsForHourGrid` algorithm → Task 3
- `<HourGrid>` / `<TimedEvent>` / `<AllDayBand>` primitives → Task 4
- `<WeekView>` / `<DayView>` → Task 5
- `<ViewSwitcher>` + Calendar shell + new props → Task 6
- `CalendarLabels` extension → Task 6
- Now-line indicator → inside Task 4 (`HourGrid`)
- Locale propagation → existing pattern from PR 2, reused in Task 6
- AGENTS.md → Task 7
- Demo → Task 8
- Verification → Tasks 9 + 10
- Push → Task 11

**Type consistency:** `TimedEventBlock`/`AllDayBar`/`HourGridLayout` defined Task 2, consumed in Tasks 3-6 with matching shapes. `CalendarLabels` extended in Task 6; defaults match the spec.

**Placeholder scan:** No TBD/TODO. All code blocks complete.
