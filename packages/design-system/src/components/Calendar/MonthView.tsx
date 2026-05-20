import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { MonthGrid } from '../../calendar/types';
import { addDays, addMonths, isSameDay, startOfWeek } from '../../calendar/dateMath';
import { useLocale } from '../../i18n/useLocale';
import { formatDayLong } from '../../calendar/formatters';
import { Popover } from '../Popover';
import { Stack } from '../Stack';
import type { CalendarEvent, EventBar } from './types';
import { layoutEventsForMonth } from './utils';
import { DayCell } from './DayCell';
import { EventChip } from './EventChip';
import styles from './MonthView.module.scss';

/** Picks the initial (or re-derived) focused cell key for a given grid + cursor. */
function pickInitialFocusKey(grid: MonthGrid, cursor: Date): string {
  const allDays = grid.weeks.flat();
  // Prefer the cursor's own day if it's in the grid and in the current month.
  const cursorDay = allDays.find(
    (d) =>
      d.date.getFullYear() === cursor.getFullYear() &&
      d.date.getMonth() === cursor.getMonth() &&
      d.date.getDate() === cursor.getDate(),
  );
  if (cursorDay) return cursorDay.key;
  const today = allDays.find((d) => d.isToday && d.isCurrentMonth);
  const first = allDays.find((d) => d.isCurrentMonth);
  return (today ?? first ?? allDays[0]).key;
}

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
  /** Localizable formatter for the "+N more" `aria-label`. */
  moreEventsLabel?: (count: number) => string;
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
  moreEventsLabel = (n) => `${n} more events`,
}: MonthViewProps) {
  const locale = useLocale();
  const layout = useMemo(
    () => layoutEventsForMonth(events, grid.weeks, maxLanesPerWeek),
    [events, grid.weeks, maxLanesPerWeek],
  );

  const [focusedKey, setFocusedKey] = useState<string>(() => pickInitialFocusKey(grid, cursor));

  // Re-sync focusedKey when the grid changes (e.g. after Prev/Next/Today nav).
  // Preserve the existing key if it still exists in the new grid; re-derive only
  // when the old key is no longer present (month changed).
  useEffect(() => {
    setFocusedKey((prev) => {
      const allKeys = new Set(grid.weeks.flat().map((d) => d.key));
      if (allKeys.has(prev)) return prev;
      return pickInitialFocusKey(grid, cursor);
    });
  }, [grid, cursor]);

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
        } else {
          // Arrow nav went off the visible grid — ask the consumer to scroll the cursor.
          onChange?.(nextDate);
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
        const hasHidden = week.some((d) => (layout.hiddenCounts.get(d.key) ?? 0) > 0);
        return (
          <div key={weekIndex} className={styles.week}>
            {/* Background day-column layers — span all rows in the week's grid.
                `span 99` covers implicit lane rows; `-1` would only reach the
                end of the explicit grid (row 1), leaving events visually outside
                the column. */}
            {week.map((day, i) => (
              <div
                key={`bg-${day.key}`}
                aria-hidden="true"
                className={clsx(
                  styles.dayColumn,
                  day.isToday && styles.dayColumnToday,
                  day.isWeekend && styles.dayColumnWeekend,
                )}
                style={{ gridColumn: i + 1, gridRow: '1 / span 99' }}
              />
            ))}
            {/* ARIA row of day cells — `display: contents` flattens this wrapper
                so each DayCell becomes a direct grid item of `.week`. */}
            <div role="row" className={styles.dayRow}>
              {week.map((day, i) => (
                <DayCell
                  key={day.key}
                  day={day}
                  isFocused={day.key === focusedKey}
                  onDayClick={onDayClick}
                  onKeyDown={handleKeyDown}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                />
              ))}
            </div>
            {/* Event bars in lane rows (rows 2..laneCount+1) */}
            {Array.from({ length: laneCount }).flatMap((_, lane) => {
              const laneBars = weekBars?.get(lane) ?? [];
              return laneBars.map((bar) => (
                <div
                  key={bar.event.id}
                  aria-hidden="true"
                  className={styles.barSlot}
                  style={{
                    gridRow: lane + 2,
                    gridColumn: `${bar.startCol} / ${bar.endCol + 1}`,
                  }}
                >
                  <EventChip
                    event={bar.event}
                    continuesLeft={bar.continuesLeft}
                    continuesRight={bar.continuesRight}
                    onClick={(ev) => onEventClick?.(ev)}
                  />
                </div>
              ));
            })}
            {/* "+N more" overflow chips — placed at the row right after the
                last visible lane, in each affected day's column. Each chip
                triggers a Popover listing every event on that day. */}
            {hasHidden &&
              week.map((day, i) => {
                const hiddenCount = layout.hiddenCounts.get(day.key) ?? 0;
                if (hiddenCount === 0) return null;
                const dayEvents = layout.eventsByDay.get(day.key) ?? [];
                return (
                  <div
                    key={`more-${day.key}`}
                    className={styles.moreChipWrapper}
                    style={{ gridColumn: i + 1, gridRow: laneCount + 2 }}
                  >
                    <Popover>
                      <Popover.Trigger>
                        <button
                          type="button"
                          className={styles.moreChip}
                          aria-label={moreEventsLabel(hiddenCount)}
                        >
                          +{hiddenCount} more
                        </button>
                      </Popover.Trigger>
                      <Popover.Content>
                        <Popover.Heading>{formatDayLong(day.date, locale)}</Popover.Heading>
                        <Stack gap="xs">
                          {dayEvents.map((ev) => (
                            <EventChip
                              key={ev.id}
                              event={ev}
                              onClick={(clicked) => onEventClick?.(clicked)}
                            />
                          ))}
                        </Stack>
                      </Popover.Content>
                    </Popover>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
