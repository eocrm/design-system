import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import type { MonthGrid } from '../../calendar/types';
import { addDays, addMonths, isSameDay, startOfWeek } from '../../calendar/dateMath';
import type { CalendarEvent, EventBar } from './types';
import { layoutEventsForMonth } from './utils';
import { DayCell } from './DayCell';
import { EventChip } from './EventChip';
import styles from './MonthView.module.scss';

export interface MonthViewProps {
  /** The month grid produced by `useMonth`. */
  grid: MonthGrid;
  /** Events to lay out across the grid. */
  events: readonly CalendarEvent[];
  /** Maximum number of lane rows shown per week before "+N more" overflow. */
  maxLanesPerWeek: number;
  /** Currently navigated cursor — used to find the initial focused cell. */
  cursor: Date;
  /** Fires when the user navigates to a different month (via PageUp/PageDown). */
  onChange?: (date: Date) => void;
  /** Fires when a day cell (or its "+N more" chip) is clicked, or Enter/Space is pressed on it. */
  onDayClick?: (date: Date) => void;
  /** Fires when an event chip is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: the month grid renderer. Consumes a `MonthGrid` from `useMonth`,
 * computes event bar placement via `layoutEventsForMonth`, and renders the
 * weekday header + week rows. Implements WAI-ARIA grid keyboard navigation
 * (arrow keys, Home/End, PageUp/PageDown, Enter/Space).
 *
 * @remarks
 * **When NOT to use:** Do not render `MonthView` directly in application code —
 * use the `Calendar` shell component which owns the `useMonth` state and the
 * month navigation header. `MonthView` is a pure renderer with no month
 * navigation state of its own.
 *
 * @example
 * ```tsx
 * // Inside a parent that owns the anchor date:
 * const grid = useMonth(anchor);
 * <MonthView
 *   grid={grid}
 *   events={events}
 *   maxLanesPerWeek={3}
 *   cursor={anchor}
 *   onChange={setAnchor}
 *   onDayClick={handleDayClick}
 *   onEventClick={handleEventClick}
 * />
 * ```
 */
export function MonthView({
  grid,
  events,
  maxLanesPerWeek,
  cursor,
  onChange,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const layout = useMemo(
    () => layoutEventsForMonth(events, grid.weeks, maxLanesPerWeek),
    [events, grid.weeks, maxLanesPerWeek],
  );

  const [focusedKey, setFocusedKey] = useState<string>(() => {
    const allDays = grid.weeks.flat();
    // Prefer the cell that matches the cursor date; fall back to today, then
    // first current-month day, then the first cell in the grid.
    const cursorMatch = allDays.find((d) => isSameDay(d.date, cursor));
    const today = allDays.find((d) => d.isToday && d.isCurrentMonth);
    const first = allDays.find((d) => d.isCurrentMonth);
    return (cursorMatch ?? today ?? first ?? allDays[0]).key;
  });

  const barsByWeekLane = useMemo(() => {
    const map = new Map<number, Map<number, EventBar[]>>();
    for (const bar of layout.bars) {
      let weekMap = map.get(bar.weekIndex);
      if (!weekMap) {
        weekMap = new Map();
        map.set(bar.weekIndex, weekMap);
      }
      let laneArr = weekMap.get(bar.lane);
      if (!laneArr) {
        laneArr = [];
        weekMap.set(bar.lane, laneArr);
      }
      laneArr.push(bar);
    }
    return map;
  }, [layout.bars]);

  const weekStartsOn = grid.weeks[0][0].date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, date: Date) => {
      let nextDate: Date | null = null;
      let monthChange = false;

      switch (e.key) {
        case 'ArrowLeft':
          nextDate = addDays(date, -1);
          break;
        case 'ArrowRight':
          nextDate = addDays(date, 1);
          break;
        case 'ArrowUp':
          nextDate = addDays(date, -7);
          break;
        case 'ArrowDown':
          nextDate = addDays(date, 7);
          break;
        case 'Home':
          nextDate = startOfWeek(date, weekStartsOn);
          break;
        case 'End': {
          const ws = startOfWeek(date, weekStartsOn);
          nextDate = addDays(ws, 6);
          break;
        }
        case 'PageUp':
          nextDate = addMonths(date, -1);
          monthChange = true;
          break;
        case 'PageDown':
          nextDate = addMonths(date, 1);
          monthChange = true;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onDayClick?.(date);
          return;
        default:
          return;
      }

      if (nextDate) {
        e.preventDefault();
        if (monthChange) {
          onChange?.(nextDate);
          // Don't try to focus a cell — the cursor will change and the grid will re-render.
          return;
        }
        const allDays = grid.weeks.flat();
        const exactMatch = allDays.find((d) => isSameDay(d.date, nextDate!));
        if (exactMatch) {
          setFocusedKey(exactMatch.key);
          requestAnimationFrame(() => {
            const el = document.querySelector(`[data-date-key="${exactMatch.key}"]`);
            if (el instanceof HTMLElement) el.focus();
          });
        }
      }
    },
    [grid.weeks, onChange, onDayClick, weekStartsOn],
  );

  return (
    <div role="grid" aria-label={grid.monthLabel} aria-readonly="true" className={styles.grid}>
      <div role="row" className={styles.weekdayHeader}>
        {grid.weekdayLabels.map((label, i) => (
          <div key={i} role="columnheader" className={styles.weekdayLabel}>
            {label}
          </div>
        ))}
      </div>

      {grid.weeks.map((week, weekIndex) => {
        const weekBars = barsByWeekLane.get(weekIndex);
        const laneCount = weekBars
          ? Math.min(maxLanesPerWeek, Math.max(...weekBars.keys()) + 1)
          : 0;
        return (
          <div key={weekIndex} role="row" className={styles.week}>
            <div className={styles.dayRow}>
              {week.map((day) => (
                <DayCell
                  key={day.key}
                  day={day}
                  isFocused={day.key === focusedKey}
                  hiddenCount={layout.hiddenCounts.get(day.key) ?? 0}
                  onDayClick={onDayClick}
                  onKeyDown={handleKeyDown}
                />
              ))}
            </div>
            {Array.from({ length: laneCount }).map((_, lane) => {
              const laneBars = weekBars?.get(lane) ?? [];
              return (
                <div key={lane} className={styles.laneRow}>
                  {laneBars.map((bar) => (
                    <div
                      key={bar.event.id}
                      className={styles.barSlot}
                      style={{ gridColumn: `${bar.startCol} / ${bar.endCol + 1}` }}
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
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
